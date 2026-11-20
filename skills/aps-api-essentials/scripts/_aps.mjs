// Shared helpers for the operator scripts. Node.js 18+, no dependencies.
// Credentials come from the environment: APS_CLIENT_ID and APS_CLIENT_SECRET, or APS_TOKEN
// to reuse a token you already have.

// APS_BASE_URL exists so the scripts can be tested against a local mock server.
export const BASE = process.env.APS_BASE_URL ?? 'https://developer.api.autodesk.com';

/** Splits argv into positional arguments and --flag [value] options. */
export function parseArgs(argv, flagsWithValues = []) {
    const positional = [];
    const options = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            const name = arg.slice(2);
            options[name] = flagsWithValues.includes(name) ? argv[++i] : true;
        } else {
            positional.push(arg);
        }
    }
    return { positional, options };
}

/** Prints usage and exits when --help is passed or required positionals are missing. */
export function usage(text, { positional, options }, required = 0) {
    if (options.help || positional.length < required) {
        console.error(text);
        process.exit(options.help ? 0 : 2);
    }
}

/** Gets a 2-legged token for the given scopes, or returns APS_TOKEN when it is set. */
export async function getToken(scope = 'data:read') {
    if (process.env.APS_TOKEN) {
        return process.env.APS_TOKEN;
    }
    const { APS_CLIENT_ID: id, APS_CLIENT_SECRET: secret } = process.env;
    if (!id || !secret) {
        fail('Set APS_CLIENT_ID and APS_CLIENT_SECRET (or APS_TOKEN) in the environment.');
    }
    const res = await fetch(`${BASE}/authentication/v2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`
        },
        body: new URLSearchParams({ grant_type: 'client_credentials', scope })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        fail(`Token request failed (${res.status}): ${JSON.stringify(body)}`);
    }
    return body.access_token;
}

/** fetch with a bearer token that waits and retries on 429, honoring Retry-After. */
export async function apsFetch(url, token, { headers = {}, ...options } = {}, attempt = 0) {
    const res = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...headers } });
    if (res.status === 429 && attempt < 5) {
        const wait = (Number(res.headers.get('retry-after')) || 2 ** attempt) * 1000 + Math.random() * 500;
        console.error(`429 received, waiting ${Math.round(wait / 1000)}s before retrying`);
        await new Promise(resolve => setTimeout(resolve, wait));
        return apsFetch(url, token, { headers, ...options }, attempt + 1);
    }
    return res;
}

/** Reads a JSON response and exits with the status and body when it is not 2xx. */
export async function json(res, what) {
    const text = await res.text();
    if (!res.ok) {
        fail(`${what} failed (${res.status}): ${text}`);
    }
    return text ? JSON.parse(text) : {};
}

/** Encodes an object ID as a URL-safe Base64 URN without padding. Values already encoded pass through. */
export function toUrn(value) {
    return value.startsWith('urn:') ? Buffer.from(value).toString('base64url') : value;
}

export function fail(message) {
    console.error(message);
    process.exit(1);
}
