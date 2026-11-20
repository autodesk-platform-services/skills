#!/usr/bin/env node
// Downloads a derivative using the signed URL and cookies endpoint.
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { BASE, apsFetch, fail, getToken, json, parseArgs, toUrn, usage } from './_aps.mjs';

const args = parseArgs(process.argv.slice(2), ['region', 'out']);
usage(`Usage: node download-derivative.mjs <urn-or-object-id> <derivativeUrn> --out <file> [--region US|EMEA|...]

Gets a signed download URL and cookies for one derivative, then downloads it to --out.
Get the derivativeUrn from the manifest (translation-status.mjs <urn> --json), the "urn" field of a
derivative file entry. 3D SVF2 derivatives can't be downloaded.
Needs APS_CLIENT_ID and APS_CLIENT_SECRET, or APS_TOKEN with the data:read scope.`, args, 2);

const [designId, derivativeUrn] = args.positional;
if (!args.options.out) {
    fail('Pass --out <file>.');
}

const token = await getToken('data:read');
const headers = args.options.region ? { region: args.options.region } : {};
const signedUrl = `${BASE}/modelderivative/v2/designdata/${toUrn(designId)}/manifest/${encodeURIComponent(derivativeUrn)}/signedcookies`;
const res = await apsFetch(signedUrl, token, { headers });
const info = await json(res, 'Getting the signed download URL');

// The service returns three Set-Cookie headers that must accompany the download request.
const cookie = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
const file = await fetch(info.url, { headers: { Cookie: cookie } });
if (!file.ok || !file.body) {
    fail(`Download failed (${file.status}): ${await file.text()}`);
}
await pipeline(Readable.fromWeb(file.body), createWriteStream(args.options.out));
console.log(`Saved ${info.size ?? 'unknown'} bytes to ${args.options.out}`);
