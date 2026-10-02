#!/usr/bin/env node
// Checks that every skill folder is consistently registered across the repository:
// SKILL.md frontmatter, skill README, main README table, and the plugin marketplace.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const skillsDir = join(root, 'skills');
const marketplace = JSON.parse(readFileSync(join(root, '.claude-plugin', 'marketplace.json'), 'utf8'));
const readme = readFileSync(join(root, 'README.md'), 'utf8');

const errors = [];
const skills = readdirSync(skillsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

for (const skill of skills) {
    const skillPath = join(skillsDir, skill);
    const skillMd = join(skillPath, 'SKILL.md');
    if (!existsSync(skillMd)) {
        errors.push(`${skill}: missing SKILL.md`);
    } else {
        const frontmatter = readFileSync(skillMd, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
        const name = frontmatter?.[1].match(/^name:\s*["']?([^"'\r\n]+?)["']?\s*$/m)?.[1];
        if (name !== skill) {
            errors.push(`${skill}: SKILL.md frontmatter name is "${name ?? '(missing)'}", expected "${skill}"`);
        }
    }
    if (!existsSync(join(skillPath, 'README.md'))) {
        errors.push(`${skill}: missing README.md`);
    }
    if (!readme.includes(`(skills/${skill}/)`)) {
        errors.push(`${skill}: no row in the "Available Skills" table of README.md`);
    }
    const entry = marketplace.plugins.find(plugin => plugin.name === skill);
    if (!entry) {
        errors.push(`${skill}: no entry in .claude-plugin/marketplace.json`);
    } else if (entry.source !== `./skills/${skill}`) {
        errors.push(`${skill}: marketplace entry source is "${entry.source}", expected "./skills/${skill}"`);
    }
}

for (const plugin of marketplace.plugins) {
    if (!skills.includes(plugin.name)) {
        errors.push(`marketplace.json: entry "${plugin.name}" has no matching folder in skills/`);
    }
}

if (errors.length > 0) {
    console.error(errors.map(error => `✘ ${error}`).join('\n'));
    process.exit(1);
}
console.log(`✔ ${skills.length} skills are consistently registered`);
