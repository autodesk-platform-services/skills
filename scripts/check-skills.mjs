#!/usr/bin/env node
// Checks that every skill folder is consistently registered across the repository:
// SKILL.md frontmatter (including gallery filter tags), skill README, main README table,
// and the single bundled plugin (plugin.json and the plugin marketplace). Placeholder folders for
// planned skills (containing only `.gitkeep`) are skipped.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const skillsDir = join(root, 'skills');
const plugin = JSON.parse(readFileSync(join(root, 'plugin.json'), 'utf8'));
const marketplace = JSON.parse(readFileSync(join(root, '.claude-plugin', 'marketplace.json'), 'utf8'));
const readme = readFileSync(join(root, 'README.md'), 'utf8');

const tagFields = ['products', 'industries', 'technologies'];

// Minimal YAML frontmatter parser covering what SKILL.md files use: scalar values (plain or
// quoted), folded/literal block scalars (`>` / `|`), and one level of nested maps (`metadata:`).
function parseFrontmatter(text) {
    const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
    if (!block) {
        return null;
    }
    const lines = block.split(/\r?\n/);
    const result = {};
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^([\w-]+):\s*(.*)$/);
        if (!match) {
            continue;
        }
        const [, key, rest] = match;
        const children = [];
        while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || lines[i + 1].trim() === '')) {
            children.push(lines[++i]);
        }
        if (rest === '>' || rest === '|' || rest === '>-' || rest === '|-') {
            const body = children.map(line => line.trim());
            result[key] = (rest.startsWith('>') ? body.join(' ').replace(/\s+/g, ' ') : body.join('\n')).trim();
        } else if (rest === '' && children.length > 0) {
            result[key] = {};
            for (const child of children) {
                const nested = child.match(/^\s+([\w-]+):\s*(.*)$/);
                if (nested) {
                    result[key][nested[1]] = unquote(nested[2]);
                }
            }
        } else {
            result[key] = unquote(rest);
        }
    }
    return result;
}

function unquote(value) {
    const trimmed = value.trim();
    if (/^".*"$/.test(trimmed)) {
        return JSON.parse(trimmed);
    }
    if (/^'.*'$/.test(trimmed)) {
        return trimmed.slice(1, -1).replace(/''/g, "'");
    }
    return trimmed;
}

function splitTags(value) {
    return (value ?? '').split(',').map(tag => tag.trim()).filter(Boolean);
}

const errors = [];
const folders = readdirSync(skillsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

// Planned skills are placeholder folders that hold nothing but a `.gitkeep` file (empty subfolders,
// which git doesn't track, are ignored too). They aren't bundled or registered yet, so they're
// skipped until they get a SKILL.md.
const ignoredFiles = new Set(['.gitkeep', '.DS_Store', 'Thumbs.db']);
const hasContent = path => readdirSync(path, { withFileTypes: true })
    .some(entry => entry.isDirectory() ? hasContent(join(path, entry.name)) : !ignoredFiles.has(entry.name));
const isPlaceholder = folder => !hasContent(join(skillsDir, folder));
const placeholders = folders.filter(isPlaceholder);
const skills = folders.filter(folder => !isPlaceholder(folder));

for (const skill of skills) {
    const skillPath = join(skillsDir, skill);
    const skillMd = join(skillPath, 'SKILL.md');
    if (!existsSync(skillMd)) {
        errors.push(`${skill}: missing SKILL.md`);
    } else {
        const frontmatter = parseFrontmatter(readFileSync(skillMd, 'utf8'));
        const name = frontmatter?.name;
        if (name !== skill) {
            errors.push(`${skill}: SKILL.md frontmatter name is "${name ?? '(missing)'}", expected "${skill}"`);
        }
        for (const field of tagFields) {
            if (splitTags(frontmatter?.metadata?.[field]).length === 0) {
                errors.push(`${skill}: SKILL.md frontmatter is missing gallery tags in metadata.${field}`);
            }
        }
    }
    if (!existsSync(join(skillPath, 'README.md'))) {
        errors.push(`${skill}: missing README.md`);
    }
    if (!readme.includes(`(skills/${skill}/)`)) {
        errors.push(`${skill}: no row in the "Available skills" tables of README.md`);
    }
}

if (plugin.$schema !== 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json') {
    errors.push('plugin.json: $schema must be https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
}
if (!/^[a-z0-9]([a-z0-9.-]{0,62}[a-z0-9])?$/.test(plugin.name ?? '') || /--|\.\./.test(plugin.name)) {
    errors.push(`plugin.json: invalid plugin name "${plugin.name}"`);
}
if (marketplace.plugins.length !== 1) {
    errors.push('marketplace.json: expected exactly one plugin entry that bundles all skills');
} else {
    const entry = marketplace.plugins[0];
    if (entry.name !== plugin.name) {
        errors.push(`marketplace.json: entry name "${entry.name}" must match plugin.json name "${plugin.name}"`);
    }
    if (entry.source !== './') {
        errors.push(`marketplace.json: entry source is "${entry.source}", expected "./"`);
    }
}

if (errors.length > 0) {
    console.error(errors.map(error => `✘ ${error}`).join('\n'));
    process.exit(1);
}
console.log(`✔ ${skills.length} skills are consistently registered (${placeholders.length} planned skill placeholders skipped)`);
