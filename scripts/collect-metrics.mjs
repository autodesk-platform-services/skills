#!/usr/bin/env node
// Collects usage metrics for this repository and archives them as CSV tables in a data directory:
// GitHub traffic (clones, views, popular paths, referrers), repository stats, and per-skill
// install counts from skills.sh (the `npx skills` CLI). GitHub only keeps traffic data for 14 days.
//
// Usage: TRAFFIC_TOKEN=<token> node scripts/collect-metrics.mjs <data-dir>
//
// The token needs read access to repository administration (fine-grained PAT) or push access (classic PAT).
// Output tables in <data-dir>, each keyed by date (rows for a date are replaced when it is collected again):
//   traffic.csv    - daily clones and views
//   installs.csv   - cumulative skills.sh installs per skill (empty if the skill is not listed)
//   repo.csv       - repository stars, forks, watchers, and open issues
//   paths.csv      - top 10 popular paths over the 14 days preceding the date
//   referrers.csv  - top 10 referrers over the 14 days preceding the date

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dataDir = process.argv[2];
const repo = process.env.GITHUB_REPOSITORY || 'autodesk-platform-services/skills';
const token = process.env.TRAFFIC_TOKEN;

if (!dataDir) {
    console.error('Usage: node scripts/collect-metrics.mjs <data-dir>');
    process.exit(1);
}
if (!token) {
    console.error('Missing TRAFFIC_TOKEN environment variable.');
    process.exit(1);
}

async function getJson(url, headers = {}) {
    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`GET ${url} failed: ${response.status} ${await response.text()}`);
    }
    return response.json();
}

function github(path) {
    return getJson(`https://api.github.com/repos/${repo}${path}`, {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
    });
}

// skills.sh search is fuzzy, so look up each skill by name and match its exact ID; null means not listed.
async function skillsShInstalls(skill) {
    const { skills } = await getJson(`https://skills.sh/api/search?q=${encodeURIComponent(skill)}&limit=50`);
    return skills.find(entry => entry.id === `${repo}/${skill}`)?.installs ?? null;
}

function csvValue(value) {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// Writes rows (arrays starting with a YYYY-MM-DD date) to a CSV table, replacing any existing rows for the same dates.
// Dates are never quoted, so existing rows can be matched by the text before their first comma.
function upsertCsv(file, header, rows) {
    const path = join(dataDir, file);
    const dates = new Set(rows.map(row => row[0]));
    const existing = existsSync(path)
        ? readFileSync(path, 'utf8').split('\n').slice(1).filter(line => line && !dates.has(line.slice(0, line.indexOf(','))))
        : [];
    const lines = [...existing, ...rows.map(row => row.map(csvValue).join(','))]
        .sort((a, b) => a.slice(0, 10).localeCompare(b.slice(0, 10)));
    writeFileSync(path, [header.join(','), ...lines].join('\n') + '\n');
}

const skills = readdirSync(join(root, 'skills'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

const [repoInfo, clones, views, paths, referrers, installs] = await Promise.all([
    github(''),
    github('/traffic/clones?per=day'),
    github('/traffic/views?per=day'),
    github('/traffic/popular/paths'),
    github('/traffic/popular/referrers'),
    Promise.all(skills.map(async skill => [skill, await skillsShInstalls(skill)]))
]);

// GitHub returns the last 14 days; re-collecting them overwrites the most recent days, which may have been incomplete.
const traffic = {};
for (const { timestamp, count, uniques } of clones.clones) {
    traffic[timestamp.slice(0, 10)] = { clones: count, uniqueClones: uniques };
}
for (const { timestamp, count, uniques } of views.views) {
    traffic[timestamp.slice(0, 10)] = { ...traffic[timestamp.slice(0, 10)], views: count, uniqueViews: uniques };
}

const today = new Date().toISOString().slice(0, 10);
mkdirSync(dataDir, { recursive: true });
upsertCsv('traffic.csv', ['date', 'clones', 'unique_clones', 'views', 'unique_views'],
    Object.entries(traffic).map(([date, day]) => [date, day.clones ?? 0, day.uniqueClones ?? 0, day.views ?? 0, day.uniqueViews ?? 0]));
upsertCsv('installs.csv', ['date', 'skill', 'installs'],
    installs.map(([skill, count]) => [today, skill, count]));
upsertCsv('repo.csv', ['date', 'stars', 'forks', 'watchers', 'open_issues'],
    [[today, repoInfo.stargazers_count, repoInfo.forks_count, repoInfo.subscribers_count, repoInfo.open_issues_count]]);
upsertCsv('paths.csv', ['date', 'path', 'title', 'views', 'unique_views'],
    paths.map(({ path, title, count, uniques }) => [today, path, title, count, uniques]));
upsertCsv('referrers.csv', ['date', 'referrer', 'views', 'unique_views'],
    referrers.map(({ referrer, count, uniques }) => [today, referrer, count, uniques]));

console.log(`Collected metrics for ${repo}: ${clones.count} clones and ${views.count} views in the last 14 days, ` +
    `${installs.reduce((sum, [, count]) => sum + (count ?? 0), 0)} skills.sh installs in total.`);
