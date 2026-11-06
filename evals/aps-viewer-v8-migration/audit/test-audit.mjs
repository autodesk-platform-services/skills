#!/usr/bin/env node
// Runs the aps-viewer-v8-migration audit script on the v7 fixture app and compares the report
// with expected.md. To accept an intended change in the report, rerun with --update.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const audit = here('../../../skills/aps-viewer-v8-migration/scripts/audit.mjs');
const actual = execFileSync(process.execPath, [audit, here('fixture')], { encoding: 'utf8' });
const expectedPath = here('expected.md');

if (process.argv.includes('--update')) {
    writeFileSync(expectedPath, actual);
    console.log('Updated expected.md.');
    process.exit(0);
}

const errors = [];
if (actual.includes('v8-clean.js')) {
    errors.push('The audit reported findings in fixture/src/v8-clean.js, which contains only v8 code.');
}
const expected = readFileSync(expectedPath, 'utf8');
if (actual !== expected) {
    const a = actual.split('\n');
    const e = expected.split('\n');
    for (let i = 0; i < Math.max(a.length, e.length); i++) {
        if (a[i] !== e[i]) {
            errors.push(`First difference at line ${i + 1}:\n  expected: ${e[i] ?? '(end)'}\n  actual:   ${a[i] ?? '(end)'}`);
            break;
        }
    }
}

if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
}
console.log('Audit report matches expected.md.');
