#!/usr/bin/env node
// Gets a 2-legged APS access token and prints it.
import { getToken, parseArgs, usage } from './_aps.mjs';

const args = parseArgs(process.argv.slice(2), ['scope']);
usage(`Usage: node get-token.mjs [--scope "data:read bucket:read"]

Prints a 2-legged access token for the app in APS_CLIENT_ID and APS_CLIENT_SECRET.
Default scope: data:read. Pass scopes as one space-separated string.
Tip: export APS_TOKEN="$(node get-token.mjs --scope 'data:read')" to reuse the token in other scripts.`, args);

process.env.APS_TOKEN = '';
console.log(await getToken(args.options.scope ?? 'data:read'));
