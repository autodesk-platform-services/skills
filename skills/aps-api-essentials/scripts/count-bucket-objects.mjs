#!/usr/bin/env node
// Counts the objects in an OSS bucket by paging through the object list.
import { BASE, apsFetch, getToken, json, parseArgs, usage } from './_aps.mjs';

const args = parseArgs(process.argv.slice(2), ['begins-with']);
usage(`Usage: node count-bucket-objects.mjs <bucketKey> [--begins-with <prefix>] [--size]

Counts the objects in a bucket (Object Storage has no count endpoint, so this pages through the list).
  --begins-with  only count objects whose key starts with this prefix
  --size         also print the total size in bytes
Needs APS_CLIENT_ID and APS_CLIENT_SECRET, or APS_TOKEN with the bucket:read scope.`, args, 1);

const [bucketKey] = args.positional;
const token = await getToken('bucket:read data:read');

let url = `${BASE}/oss/v2/buckets/${encodeURIComponent(bucketKey)}/objects?limit=100`;
if (args.options['begins-with']) {
    url += `&beginsWith=${encodeURIComponent(args.options['begins-with'])}`;
}

const seen = new Set();   // de-duplicate by object ID in case the listing changes while paging
let bytes = 0;
let pages = 0;
while (url) {
    const page = await json(await apsFetch(url, token), 'Listing objects');
    for (const item of page.items ?? []) {
        if (!seen.has(item.objectId)) {
            seen.add(item.objectId);
            bytes += item.size ?? 0;
        }
    }
    pages++;
    url = page.next ?? null;   // `next` is present only when there are more items
}

console.log(`${seen.size} objects in "${bucketKey}" (${pages} pages)`);
if (args.options.size) {
    console.log(`${bytes} bytes`);
}
