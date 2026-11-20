#!/usr/bin/env node
// Lists the webhooks registered for the app in one region, with their status.
import { BASE, apsFetch, getToken, json, parseArgs, usage } from './_aps.mjs';

const args = parseArgs(process.argv.slice(2), ['region', 'status']);
usage(`Usage: node list-webhooks.mjs [--region US|EMEA|AUS|CAN|DEU|IND|JPN|GBR] [--status active|inactive] [--json]

Lists webhooks that the token can see in ONE region (default US). Webhooks are regional: run it once per region
the app uses. Inactive webhooks failed to deliver the most recent event and were deactivated.
Needs APS_CLIENT_ID and APS_CLIENT_SECRET, or APS_TOKEN with the data:read scope.`, args);

const region = args.options.region ?? 'US';
const token = await getToken('data:read');
const hooks = [];
let pageState;
do {
    const params = new URLSearchParams();
    if (args.options.status) params.set('status', args.options.status);
    if (pageState) params.set('pageState', pageState);
    const query = params.size ? `?${params}` : '';
    const page = await json(await apsFetch(`${BASE}/webhooks/v1/hooks${query}`, token, { headers: { region } }), 'Listing webhooks');
    hooks.push(...(page.data ?? []));
    pageState = page.links?.next ?? null;   // Base64 token for the next page, absent on the last one
} while (pageState);

if (args.options.json) {
    console.log(JSON.stringify(hooks, null, 2));
} else {
    console.log(`${hooks.length} webhooks in ${region}`);
    for (const h of hooks) {
        console.log(`${h.status.padEnd(11)} ${h.system}/${h.event}  ${h.hookId}  ${h.callbackUrl}`);
    }
}
