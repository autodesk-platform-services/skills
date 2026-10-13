// Loads the skill list at runtime from the main branch of the GitHub repository.

import { parse as parseYaml } from 'yaml';

export const REPO = 'autodesk-platform-services/skills';
export const BRANCH = 'main';
const RAW_URL = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const REPO_URL = `https://github.com/${REPO}`;

export const tagFields = ['products', 'industries', 'technologies'];

function parseFrontmatter(text, path) {
    const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
    try {
        return (block && parseYaml(block)) || {};
    } catch (error) {
        console.warn(`Invalid frontmatter in ${path}/SKILL.md`, error);
        return {};
    }
}

function splitTags(value) {
    return String(value ?? '').split(',').map(tag => tag.trim()).filter(Boolean);
}

async function fetchText(path, optional = false) {
    const response = await fetch(`${RAW_URL}/${path}`);
    if (!response.ok) {
        if (optional && response.status === 404) {
            return '';
        }
        throw new Error(`Failed to fetch ${path}: ${response.status}`);
    }
    return response.text();
}

// Builds the skill list from the plugin marketplace on the main branch, enriched with each
// skill's SKILL.md frontmatter and README.md title.
export async function loadSkills() {
    const marketplace = JSON.parse(await fetchText('.claude-plugin/marketplace.json'));
    const loaded = await Promise.all(marketplace.plugins.map(async plugin => {
        const path = plugin.source.replace(/^\.\//, '').replace(/\/$/, '');
        const [skillMd, readme] = await Promise.all([
            fetchText(`${path}/SKILL.md`),
            fetchText(`${path}/README.md`, true),
        ]);
        const frontmatter = parseFrontmatter(skillMd, path);
        const metadata = frontmatter.metadata ?? {};
        const heading = readme.match(/^#\s+(.+)$/m)?.[1];
        return {
            name: plugin.name,
            title: heading ? heading.replace(/\s+Skill\b/i, '').trim() : plugin.name,
            summary: plugin.description ?? frontmatter.description ?? '',
            description: frontmatter.description ?? '',
            category: plugin.category ?? '',
            compatibility: frontmatter.compatibility ?? '',
            ...Object.fromEntries(tagFields.map(field => [field, splitTags(metadata[field])])),
            url: `${REPO_URL}/tree/${BRANCH}/${path}`,
        };
    }));
    return loaded.sort((a, b) => a.name.localeCompare(b.name));
}
