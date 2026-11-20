#!/usr/bin/env node
// Prints the Model Derivative manifest status and progress for a design URN.
import { BASE, apsFetch, getToken, parseArgs, toUrn, usage } from './_aps.mjs';

const args = parseArgs(process.argv.slice(2), ['region']);
usage(`Usage: node translation-status.mjs <urn-or-object-id> [--region US|EMEA|AUS|CAN|DEU|IND|JPN|GBR] [--json]

Accepts a URL-safe Base64 URN, or an object or version ID that starts with "urn:" (it is encoded for you).
Use the same --region as the translation job. Default is US.
Needs APS_CLIENT_ID and APS_CLIENT_SECRET, or APS_TOKEN with the data:read scope.`, args, 1);

const urn = toUrn(args.positional[0]);
const token = await getToken('data:read viewables:read');
const headers = args.options.region ? { region: args.options.region } : {};
const res = await apsFetch(`${BASE}/modelderivative/v2/designdata/${urn}/manifest`, token, { headers });

if (res.status === 404) {
    console.log('No manifest found. The file was never translated, or the region or URN is wrong.');
    process.exit(1);
}
const text = await res.text();
if (!res.ok) {
    console.error(`Fetching the manifest failed (${res.status}): ${text}`);
    process.exit(1);
}
const manifest = JSON.parse(text);
if (args.options.json) {
    console.log(JSON.stringify(manifest, null, 2));
    process.exit(0);
}

console.log(`Overall: ${manifest.status} (${manifest.progress})`);
const walk = (nodes, depth = 0) => {
    for (const node of nodes ?? []) {
        if (node.outputType || (node.status && node.status !== 'success')) {
            const label = node.outputType ?? node.role ?? node.type;
            const messages = (node.messages ?? []).map(m => `${m.type ?? ''} ${m.code ?? ''} ${m.message ?? ''}`.trim());
            console.log(`${'  '.repeat(depth)}- ${label}: ${node.status} ${node.progress ?? ''}${messages.length ? `\n${'  '.repeat(depth + 1)}${messages.join(`\n${'  '.repeat(depth + 1)}`)}` : ''}`);
        }
        walk(node.derivatives ?? node.children, depth + 1);
    }
};
walk(manifest.derivatives);
// An overall "success" can still contain failed derivatives: look at the lines above.
