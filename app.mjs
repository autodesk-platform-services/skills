import MiniSearch from 'minisearch';
import { loadSkills, REPO } from './skills.mjs';

const MARKETPLACE = 'aps-skills';
const COLLAPSED_FACET_SIZE = 10;

const GROUPS = [
    { key: 'products', label: 'Product', param: 'product' },
    { key: 'industries', label: 'Industry', param: 'industry' },
    { key: 'technologies', label: 'Technology', param: 'tech' },
];

const CATEGORY_LABELS = {
    aps: 'Autodesk Platform Services',
    autocad: 'AutoCAD',
    flow: 'Flow',
};

// Full names for short tag values, shown as tooltips and matched by the search.
const TAG_LABELS = {
    AEC: 'Architecture, Engineering & Construction',
    Manufacturing: 'Product Design & Manufacturing',
    APS: 'Autodesk Platform Services',
    ACC: 'Autodesk Construction Cloud',
    MCP: 'Model Context Protocol',
};

let skills = null;
let search = null;

const state = {
    query: '',
    filters: Object.fromEntries(GROUPS.map(group => [group.key, new Set()])),
    expanded: new Set(),
};

const $ = id => document.getElementById(id);
const els = {
    search: $('search'),
    groups: $('filter-groups'),
    clear: $('clear-filters'),
    toggle: $('toggle-filters'),
    count: $('result-count'),
    active: $('active-filters'),
    grid: $('grid'),
    empty: $('empty'),
    emptyReset: $('empty-reset'),
    loading: $('loading'),
    loadError: $('load-error'),
    loadRetry: $('load-retry'),
    details: $('details'),
    detailsBody: $('details-body'),
};

// ---------------------------------------------------------------- Loading

async function init() {
    els.loading.hidden = false;
    els.loadError.hidden = true;
    try {
        skills = await loadSkills();
        search = createSearch(skills);
    } catch (error) {
        console.error(error);
        els.loadError.hidden = false;
        return;
    } finally {
        els.loading.hidden = true;
    }
    render();
    if (location.hash) {
        openDetails(decodeURIComponent(location.hash.slice(1)));
    }
}

// ---------------------------------------------------------------- Search

// Words, keeping the characters that matter in technology names (C#, C++, Node.js, .NET).
const WORD = /[\p{L}\p{N}#+]+(?:\.[\p{L}\p{N}#+]+)*/gu;

function normalizeTerm(term) {
    return term.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

// Tags, their full names, and the category, so that e.g. "construction" finds ACC skills.
function tagText(skill) {
    const tags = GROUPS.flatMap(group => skill[group.key].flatMap(tag => [tag, TAG_LABELS[tag] || '']));
    return [...tags, CATEGORY_LABELS[skill.category] || skill.category].join(' ');
}

function createSearch(items) {
    const index = new MiniSearch({
        fields: ['name', 'title', 'tags', 'summary', 'description'],
        extractField: (skill, field) => {
            switch (field) {
                case 'id': return skill.name;
                case 'name': return skill.name.replace(/-/g, ' ');
                case 'tags': return tagText(skill);
                default: return skill[field];
            }
        },
        tokenize: text => text.match(WORD) ?? [],
        processTerm: normalizeTerm,
        searchOptions: {
            boost: { name: 3, title: 3, tags: 2 },
            combineWith: 'AND',
            prefix: true,
            // No typos in very short words, one in words up to 5 characters, two in longer ones.
            fuzzy: term => term.length < 3 ? false : term.length <= 5 ? 1 : 2,
        },
    });
    index.addAll(items);
    return index;
}

// ---------------------------------------------------------------- Filtering

function matchesFilters(skill, exceptGroup) {
    return GROUPS.every(group => {
        const selected = state.filters[group.key];
        return group.key === exceptGroup || selected.size === 0 || skill[group.key].some(tag => selected.has(tag));
    });
}

function searchResults() {
    if (!state.query.trim()) {
        return skills.map(skill => ({ skill, terms: [] }));
    }
    return search.search(state.query).map(result => ({
        skill: skills.find(skill => skill.name === result.id),
        terms: result.terms,
    }));
}

function hasActiveFilters() {
    return GROUPS.some(group => state.filters[group.key].size > 0);
}

// ---------------------------------------------------------------- Rendering

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
}

// Wraps the words of `text` that matched the search (the `terms` of a MiniSearch result) in <mark>.
function highlight(text, terms) {
    const matched = new Set(terms);
    let html = '';
    let cursor = 0;
    for (const match of text.matchAll(WORD)) {
        if (matched.has(normalizeTerm(match[0]))) {
            html += escapeHtml(text.slice(cursor, match.index)) + '<mark>' + escapeHtml(match[0]) + '</mark>';
            cursor = match.index + match[0].length;
        }
    }
    return html + escapeHtml(text.slice(cursor));
}

function tagButton(group, tag) {
    const active = state.filters[group.key].has(tag);
    const title = TAG_LABELS[tag] ? `${TAG_LABELS[tag]} — ` : '';
    return `<button type="button" class="tag tag--${group.key}${active ? ' tag--active' : ''}"
        data-group="${group.key}" data-tag="${escapeHtml(tag)}" aria-pressed="${active}"
        title="${escapeHtml(title)}${active ? 'Remove' : 'Filter by'} ${group.label.toLowerCase()}">${escapeHtml(tag)}</button>`;
}

function categoryLabel(skill) {
    return CATEGORY_LABELS[skill.category] || skill.category;
}

function renderCard(skill, terms) {
    const tags = GROUPS.flatMap(group => skill[group.key].map(tag => tagButton(group, tag))).join('');
    return `
        <article class="card">
            <p class="card__category">${escapeHtml(categoryLabel(skill))}</p>
            <h2 class="card__title">
                <button type="button" data-open="${escapeHtml(skill.name)}">${highlight(skill.title, terms)}</button>
            </h2>
            <p class="card__name">${highlight(skill.name, terms)}</p>
            <p class="card__summary">${highlight(skill.summary, terms)}</p>
            <div class="tags">${tags}</div>
        </article>`;
}

function renderFilters(results) {
    els.groups.innerHTML = GROUPS.map(group => {
        const totals = new Map();
        for (const skill of skills) {
            for (const tag of skill[group.key]) {
                totals.set(tag, (totals.get(tag) || 0) + 1);
            }
        }
        const counts = new Map();
        for (const { skill } of results) {
            if (matchesFilters(skill, group.key)) {
                for (const tag of skill[group.key]) {
                    counts.set(tag, (counts.get(tag) || 0) + 1);
                }
            }
        }
        const selected = state.filters[group.key];
        const tags = [...totals.keys()].sort((a, b) => totals.get(b) - totals.get(a) || a.localeCompare(b));
        const expanded = state.expanded.has(group.key) || tags.length <= COLLAPSED_FACET_SIZE + 2;
        const visible = expanded ? tags : tags.filter((tag, i) => i < COLLAPSED_FACET_SIZE || selected.has(tag));
        const options = visible.map(tag => {
            const count = counts.get(tag) || 0;
            const checked = selected.has(tag);
            const title = TAG_LABELS[tag] ? ` title="${escapeHtml(TAG_LABELS[tag])}"` : '';
            return `
                <label class="filter-option${count === 0 && !checked ? ' filter-option--empty' : ''}"${title}>
                    <input type="checkbox" data-group="${group.key}" value="${escapeHtml(tag)}"${checked ? ' checked' : ''}>
                    <span class="filter-option__label">${escapeHtml(tag)}</span>
                    <span class="filter-option__count">${count}</span>
                </label>`;
        }).join('');
        const more = tags.length > visible.length || (expanded && state.expanded.has(group.key))
            ? `<div class="filter-group__more"><button type="button" class="link-button" data-expand="${group.key}">
                   ${expanded ? 'Show less' : `Show ${tags.length - visible.length} more`}</button></div>`
            : '';
        return `
            <div class="filter-group" role="group" aria-labelledby="filter-${group.key}">
                <h3 id="filter-${group.key}">${group.label}</h3>
                ${options}${more}
            </div>`;
    }).join('');
}

function renderActiveFilters() {
    els.active.innerHTML = GROUPS.flatMap(group => [...state.filters[group.key]].map(tag => `
        <button type="button" class="active-filter" data-group="${group.key}" data-tag="${escapeHtml(tag)}"
            aria-label="Remove filter ${group.label}: ${escapeHtml(tag)}">
            ${escapeHtml(tag)} <span aria-hidden="true">&times;</span>
        </button>`)).join('');
    els.clear.hidden = !hasActiveFilters();
    const open = els.toggle.getAttribute('aria-expanded') === 'true';
    const count = GROUPS.reduce((sum, group) => sum + state.filters[group.key].size, 0);
    els.toggle.textContent = `${open ? 'Hide' : 'Show'} filters${count ? ` (${count})` : ''}`;
}

function render() {
    if (!skills) {
        return;
    }
    const results = searchResults();
    const visible = results.filter(({ skill }) => matchesFilters(skill));

    els.grid.innerHTML = visible.map(({ skill, terms }) => renderCard(skill, terms)).join('');
    els.empty.hidden = visible.length > 0;
    els.count.textContent = visible.length === skills.length
        ? `${skills.length} skills`
        : `${visible.length} of ${skills.length} skills`;
    renderFilters(results);
    renderActiveFilters();
    writeUrl();
}

// ---------------------------------------------------------------- Details dialog

function codeBlock(command) {
    return `<div class="code"><pre>${escapeHtml(command)}</pre><button type="button" data-copy>Copy</button></div>`;
}

function renderDetails(skill) {
    const meta = GROUPS
        .filter(group => skill[group.key].length > 0)
        .map(group => `<dt>${group.label}</dt><dd class="tags">${skill[group.key].map(tag => tagButton(group, tag)).join('')}</dd>`)
        .join('');
    const compatibility = skill.compatibility
        ? `<h3>Requirements</h3><p class="details__note">${escapeHtml(skill.compatibility)}</p>`
        : '';
    els.detailsBody.innerHTML = `
        <p class="card__category">${escapeHtml(categoryLabel(skill))}</p>
        <h2 id="details-title">${escapeHtml(skill.title)}</h2>
        <p class="card__name">${escapeHtml(skill.name)}</p>
        <p class="details__description">${escapeHtml(skill.description || skill.summary)}</p>
        <h3>Tags</h3>
        <dl class="details__meta">${meta}</dl>
        ${compatibility}
        <h3>Install</h3>
        <div class="install">
            <div>
                <p class="install__label">Claude Code</p>
                ${codeBlock(`claude plugin marketplace add ${REPO}\nclaude plugin install ${skill.name}@${MARKETPLACE}`)}
            </div>
            <div>
                <p class="install__label">GitHub Copilot CLI</p>
                ${codeBlock(`copilot plugin marketplace add ${REPO}\ncopilot plugin install ${skill.name}@${MARKETPLACE}`)}
            </div>
            <div>
                <p class="install__label">Any agent, with the <a href="https://www.npmjs.com/package/skills">skills</a> CLI</p>
                ${codeBlock(`npx skills add ${REPO} --project --skill ${skill.name}`)}
            </div>
        </div>
        <div class="details__actions">
            <a class="button" href="${escapeHtml(skill.url)}">View on GitHub</a>
            <a class="button button--secondary" href="${escapeHtml(skill.url.replace('/tree/', '/blob/'))}/SKILL.md">Read SKILL.md</a>
        </div>`;
}

function openDetails(name) {
    const skill = skills?.find(item => item.name === name);
    if (!skill) {
        return;
    }
    renderDetails(skill);
    if (!els.details.open) {
        els.details.showModal();
    }
    if (location.hash !== `#${name}`) {
        history.replaceState(null, '', `#${name}`);
    }
}

// ---------------------------------------------------------------- URL state

function readUrl() {
    const params = new URLSearchParams(location.search);
    state.query = params.get('q') || '';
    for (const group of GROUPS) {
        state.filters[group.key] = new Set(params.getAll(group.param));
    }
    els.search.value = state.query;
}

function writeUrl() {
    const params = new URLSearchParams();
    if (state.query) {
        params.set('q', state.query);
    }
    for (const group of GROUPS) {
        for (const tag of state.filters[group.key]) {
            params.append(group.param, tag);
        }
    }
    const search = params.toString();
    const url = `${location.pathname}${search ? `?${search}` : ''}${location.hash}`;
    if (url !== `${location.pathname}${location.search}${location.hash}`) {
        history.replaceState(null, '', url);
    }
}

// ---------------------------------------------------------------- Events

function toggleFilter(groupKey, tag, on) {
    const selected = state.filters[groupKey];
    const enable = on ?? !selected.has(tag);
    if (enable) {
        selected.add(tag);
    } else {
        selected.delete(tag);
    }
    render();
}

function resetAll() {
    state.query = '';
    els.search.value = '';
    GROUPS.forEach(group => state.filters[group.key].clear());
    render();
}

els.search.addEventListener('input', () => {
    state.query = els.search.value;
    render();
});

els.groups.addEventListener('change', event => {
    const input = event.target.closest('input[data-group]');
    if (input) {
        toggleFilter(input.dataset.group, input.value, input.checked);
    }
});

els.groups.addEventListener('click', event => {
    const button = event.target.closest('[data-expand]');
    if (button) {
        const key = button.dataset.expand;
        state.expanded.has(key) ? state.expanded.delete(key) : state.expanded.add(key);
        render();
    }
});

els.clear.addEventListener('click', () => {
    GROUPS.forEach(group => state.filters[group.key].clear());
    render();
});

els.toggle.addEventListener('click', () => {
    const open = els.toggle.getAttribute('aria-expanded') !== 'true';
    els.toggle.setAttribute('aria-expanded', String(open));
    els.toggle.closest('.filters').classList.toggle('filters--open', open);
    renderActiveFilters();
});

els.emptyReset.addEventListener('click', resetAll);

els.loadRetry.addEventListener('click', init);

els.active.addEventListener('click', event => {
    const button = event.target.closest('[data-tag]');
    if (button) {
        toggleFilter(button.dataset.group, button.dataset.tag, false);
    }
});

els.grid.addEventListener('click', event => {
    const tag = event.target.closest('.tag');
    if (tag) {
        toggleFilter(tag.dataset.group, tag.dataset.tag);
        return;
    }
    const open = event.target.closest('[data-open]');
    if (open) {
        openDetails(open.dataset.open);
    }
});

els.details.addEventListener('click', event => {
    if (event.target === els.details || event.target.closest('[data-close]')) {
        els.details.close();
        return;
    }
    const tag = event.target.closest('.tag');
    if (tag) {
        els.details.close();
        toggleFilter(tag.dataset.group, tag.dataset.tag, true);
        return;
    }
    const copy = event.target.closest('[data-copy]');
    if (copy) {
        const text = copy.previousElementSibling.textContent;
        navigator.clipboard.writeText(text).then(() => {
            copy.textContent = 'Copied';
            setTimeout(() => { copy.textContent = 'Copy'; }, 1500);
        }, () => {
            copy.textContent = 'Failed';
        });
    }
});

els.details.addEventListener('close', () => {
    if (location.hash) {
        history.replaceState(null, '', `${location.pathname}${location.search}`);
    }
});

window.addEventListener('hashchange', () => {
    const name = decodeURIComponent(location.hash.slice(1));
    name ? openDetails(name) : els.details.close();
});

document.addEventListener('keydown', event => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (event.key === '/' && !typing && !els.details.open) {
        event.preventDefault();
        els.search.focus();
    }
});

readUrl();
init();
