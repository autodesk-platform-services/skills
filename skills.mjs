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

// Lists the skill folders (those with a SKILL.md) under skills/ on the main branch.
async function listSkillPaths() {
    const response = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`);
    if (!response.ok) {
        throw new Error(`Failed to list skills: ${response.status}`);
    }
    const { tree } = await response.json();
    return tree
        .map(entry => entry.path.match(/^skills\/[^/]+(?=\/SKILL\.md$)/)?.[0])
        .filter(Boolean);
}

// The repository is a single plugin that bundles every folder under skills/, so the category
// comes from the skill name prefix (e.g. acad-dotnet -> acad).
function categoryOf(name) {
    return { acad: 'autocad', aps: 'aps', flow: 'flow' }[name.split('-')[0]] ?? '';
}

// Builds the skill list from the skills/ folders on the main branch, using each skill's
// SKILL.md frontmatter and README.md title.
export async function loadSkills() {
    const loaded = await Promise.all((await listSkillPaths()).map(async path => {
        const name = path.split('/').pop();
        const [skillMd, readme] = await Promise.all([
            fetchText(`${path}/SKILL.md`),
            fetchText(`${path}/README.md`, true),
        ]);
        const frontmatter = parseFrontmatter(skillMd, path);
        const metadata = frontmatter.metadata ?? {};
        const heading = readme.match(/^#\s+(.+)$/m)?.[1];
        return {
            name,
            title: heading ? heading.replace(/\s+Skill\b/i, '').trim() : name,
            summary: frontmatter.description ?? '',
            description: frontmatter.description ?? '',
            category: categoryOf(name),
            compatibility: frontmatter.compatibility ?? '',
            ...Object.fromEntries(tagFields.map(field => [field, splitTags(metadata[field])])),
            url: `${REPO_URL}/tree/${BRANCH}/${path}`,
        };
    }));
    return loaded.sort((a, b) => a.name.localeCompare(b.name));
}
