# Contributing

The APS skills follow a fixed structure of foundational, domain, and workflow skills. Before you add content, read [Skill structure](#skill-structure) to find the skill that owns your topic. Most contributions extend an existing skill, or fill in a planned one, instead of adding a new skill.

## Adding or filling in a skill

Each skill is a folder under `skills/` with:

- A `SKILL.md` file containing the full agent instructions (with YAML frontmatter for `name`, `description`, and `metadata`, including the [gallery tags](#gallery-tags))
- A `README.md` file for humans describing what the skill does, its requirements, recommended installation command (e.g., `npx skills add autodesk-platform-services/skills --project --skill <skill-name>`), any additional setup steps, and example usage
- A `references/` subfolder with any supporting documentation the agent needs to read during execution
- A `scripts/` subfolder for any reusable helper scripts the agent should run
- An `assets/` subfolder for output templates and other static resources

Planned skills already have a placeholder folder that holds only a `.gitkeep` file. Placeholders aren't bundled, listed in the gallery, or checked by `scripts/check-skills.mjs`. To fill one in, add the files above and delete the `.gitkeep`.

> [!IMPORTANT]
> Prefix the skill name (for example, with `aps-`) to avoid name clashes with other skills. Don't add an APS skill that isn't in the [skill map](#skill-map) without discussing it in an issue first.

Then update the skill's row in the "Available skills" tables of the main [README.md](README.md): remove "Planned.", link the skill name to its folder (``[`aps-example`](skills/aps-example/)``), and keep the description short. Keep all other skill-specific information (requirements, installation, usage) in the skill's own `README.md`. The main README should only contain general information about the repository.

There's no separate registration step for the plugin. The repository is a single [Agent Plugin](https://agent-plugins.org) called `aps-skills`, defined by [`plugin.json`](plugin.json) and listed in [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) (used by both Claude Code and GitHub Copilot). Every folder under `skills/` that contains a `SKILL.md` is bundled automatically.

- The `name` in the `SKILL.md` frontmatter must match the skill folder name.
- Don't add a `version` field to `plugin.json` or the marketplace entry. Without a `version` Claude Code uses the git commit SHA, so users get updates on every push.
- Don't add a `plugin.json` to individual skill folders, and don't add a separate `.github/plugin/marketplace.json`. GitHub Copilot reads the same `.claude-plugin/marketplace.json`.
- Keep the plugin `name` permanent: renaming it breaks existing installs.

### Gallery tags

The skill gallery (a static site hosted with GitHub Pages from the [`docs`](https://github.com/autodesk-platform-services/skills/tree/docs) branch) loads the list of skills from the `main` branch of this repository at runtime (from each skill's `SKILL.md` frontmatter and its `README.md` title), and lets users search skills and filter them by product, industry, and technology. Add these tags to the `metadata` block of the skill's `SKILL.md` frontmatter as comma-separated strings:

```yaml
metadata:
  products: "AutoCAD, Civil 3D, Design Automation"
  industries: "AEC, Manufacturing"
  technologies: ".NET, C#"
```

- Reuse existing tag values where they fit, so that filters stay short. Check the filters in the gallery for the current values.
- Use `AEC`, `Manufacturing`, and `Media & Entertainment` for `industries`. List all industries the skill is useful for.

There's no build step and nothing to change in the `docs` branch: the skill shows up in the gallery as soon as it's merged to `main`.

Validate your changes locally with the [Claude Code CLI](https://code.claude.com/docs/en/setup) and the consistency check script before opening a pull request:

```bash
claude plugin validate .
node scripts/check-skills.mjs
```

Both checks also run in CI on every pull request.

## Skill structure

The APS skills help coding agents build new solutions, migrate existing codebases, troubleshoot issues, and integrate APS-based extensions accurately. The structure was derived from a catalog of real APS developer questions. All skills ship in the single `aps-skills` plugin.

### Design principles

- **Three layers.** Foundational skills hold cross-domain knowledge. Domain skills cover one APS component each. Workflow skills are outcome-oriented and combine the other two layers.
- **One owner per topic.** Each piece of guidance lives in exactly one skill. Other skills link to it instead of repeating it. For example, region handling and GraphQL query patterns live only in `aps-api-essentials`. Refer to another skill by name (for example, "use the `aps-reference` skill to find the docs page"), not by a relative path, because users can install skills individually.
- **Durable knowledge only.** Skills hold best practices, decision guidance, and gotchas. Volatile details stay in authoritative sources and are referenced, not copied. These include endpoint lists, scopes per endpoint, rate limit values, page sizes, pricing, and deprecation mappings.
- **Known gaps carry a date.** Capability gaps (for example, "the Issues API can't delete issues") stop agents from inventing endpoints, but they change over time. Record them in a "Known gaps" section with a last-verified date, and tell the agent to confirm against the OpenAPI spec or GraphQL schema before telling a user something is impossible.
- **Progressive disclosure.** Large skills keep `SKILL.md` short and act as a router to per-topic files in `references/`, which the agent loads on demand. Deterministic operator tasks live in `scripts/`. For example, `aps-migration` keeps the general migration method in `SKILL.md` and the Viewer v7→v8 playbook in `references/viewer-v8.md`.
- **No circular dependencies.** Workflow skills depend on domain and foundational skills. Domain skills depend on foundational skills and, where needed, on other domain skills. Nothing depends back up the chain.

### Known gaps format

```markdown
## Known gaps

Last verified: 2026-11-20. Confirm against the OpenAPI spec or GraphQL schema before telling a user something isn't possible.

- The Issues API can't delete issues.
```

### Skill map

All domain and workflow skills implicitly require `aps-reference`, `aps-auth`, and `aps-api-essentials`. The "Requires" column lists only additional dependencies.

#### Foundational skills

| Skill | Requires | Owns |
| ----- | -------- | ---- |
| `aps-reference` | None | Locating authoritative and supporting sources (OpenAPI specs, GraphQL schemas, docs, blog posts, tutorials, samples, SDKs, changelogs, deprecation notices), the product rename map (Forge→APS, Design Automation→Automation API, BIM 360 and ACC→Forma), and judging whether an older Forge-era answer still applies |
| `aps-auth` | `aps-reference` | Choosing between 2-legged, 3-legged, PKCE, and SSA; scope selection; token lifecycle and refresh; 3-legged callback and PKCE errors; x-user-id impersonation and migration to SSA; custom integration provisioning; downscoped Viewer tokens |
| `aps-api-essentials` | `aps-reference`, `aps-auth`, `aps-app-management` | URN encoding, ID formats, hub regions, rate limits and backoff, pagination, async and 202 patterns, polling versus webhooks, error payloads, batch "skipped" items, shared GraphQL patterns, error triage, SDK versus raw REST, shell quirks |
| `aps-app-management` | `aps-reference`, `aps-auth` | Developer hubs, enabling API products, billable usage, passthrough billing, usage suspension, consumption and cost estimation, app registration, secret rotation |

#### Domain skills

| Skill | Requires | Owns |
| ----- | -------- | ---- |
| `aps-data-management` | Foundational only | Object storage (buckets, regions, signed S3 uploads and downloads) and the project hierarchy (hubs, projects, folders, items, versions, relationships, permissions) |
| `aps-model-derivative` | `aps-data-management` | Translation jobs and manifests, linked and zipped inputs, IFC converters, thumbnails and 2D views, metadata and properties, `forceget`, translation errors, offline viewing |
| `aps-viewer` | `aps-model-derivative` | Framework integration, performance, dbId mapping, multi-model loading, coordinate transforms, events, custom properties, markups, sheets and views, embedding constraints |
| `aps-automation` | `aps-data-management` | Activities, work items, and app bundles; inputs and parameters; multiple product versions; CI/CD; debugging with reports; common failures; plugin and bundle scaffolding |
| `aps-webhooks` | Foundational only | Choosing events, delivery semantics, signature verification, local development, hook management |
| `aps-aec-data-model` | Foundational only | Hub activation and indexing, element groups, property discovery, type versus instance properties, version changes, Plant 3D data |
| `aps-mfg-data-model` | Foundational only | Fusion hubs, projects, and designs; assembly structure and BOMs; component properties |
| `aps-data-exchange` | `aps-data-management` | Creating data exchanges, REST versus GraphQL token rules, incremental sync, publishing views |
| `aps-forma` | `aps-data-management` | Account and project admin (Forma versus BIM 360), members, Issues, RFIs, Submittals, Transmittals, Forms, Assets, Cost, Takeoff, Model Coordination, BuildingConnected, data exports, container IDs |

#### Workflow skills

| Skill | Requires | Owns |
| ----- | -------- | ---- |
| `aps-web-viewer-app` | `aps-data-management`, `aps-model-derivative`, `aps-viewer`, `aps-forma`, `aps-webhooks` | End-to-end browser apps: sign-in, region-aware pickers, upload and view, issues next to the model, overlays from external data, reloading on new versions |
| `aps-model-data-extraction` | `aps-aec-data-model`, `aps-model-derivative`, `aps-viewer`, `aps-data-management`, `aps-forma` | Choosing a data source and fallback order, exporting element data, comparing versions, recurring change reports |
| `aps-cloud-batch-processing` | `aps-automation`, `aps-data-management`, `aps-webhooks` | Scripts over many models without desktop products, batch conversion, cloud health checks, per-file failures, completion tracking |
| `aps-sync-and-notifications` | `aps-webhooks`, `aps-forma`, `aps-data-management` | Syncing external databases, scheduled exports to BI tools, notifications to Teams and email, polling where no events exist |
| `aps-mcp-server` | Domain skills as needed for the tools being built | Building and extending MCP servers for APS: the server's APS identity, separating MCP client auth from APS auth, adding tools, client connection failures |
| `aps-migration` | `aps-viewer`, `aps-forma`, `aps-data-exchange` | The migration method (inventory, map through the official guide, verify, cut over) for Forge→APS, Authentication v2, x-user-id→SSA, Viewer v7→v8, BIM 360→Forma, BuildingConnected v2→v3, Forms API v1, Data Exchange lookup by file ID, developer hub migration, and SDK target changes. Mapping tables stay in the official guides. |

#### Deferred skills

`aps-tandem` (facilities, streams and sensor data, asset queries) and `aps-forma-site-design` (proposals, terrain, elements, revisions) are out of scope for now because few questions need them. Until they're added, agents rely on `aps-reference` to find the relevant docs and samples. They don't have placeholder folders.

## Best Practices

The following guidance is adapted from [agentskills.io/skill-creation/best-practices](https://agentskills.io/skill-creation/best-practices).

### Start from real expertise

Avoid generating skills purely from an LLM's general knowledge — the result is vague, generic instructions that don't add value. Ground skills in domain-specific context:

- **Extract from a hands-on task.** Complete a real task with an agent, then extract the reusable pattern: what steps worked, what corrections you made, what context you provided, and what the input/output looked like.
- **Synthesize from project artifacts.** Feed existing material into the skill: internal docs, runbooks, API specs, code review comments, issue trackers, and real failure cases. Project-specific material outperforms generic references.

### Refine with real execution

Run the skill against real tasks and feed the results back into the skill. Ask: what triggered false positives? What was missed? What could be cut? Even one pass of execute-then-revise noticeably improves quality.

Common causes of wasted agent steps: instructions that are too vague, instructions that don't apply to the current task, or too many options presented without a clear default.

### Spend context wisely

The full `SKILL.md` body loads into the agent's context window on every activation, competing for attention with conversation history and other active skills.

- **Add what the agent lacks, omit what it knows.** Focus on project-specific conventions, non-obvious edge cases, and the particular APIs or tools to use. Skip general knowledge.
- **Design coherent units.** A skill should encapsulate a coherent unit of work — not so narrow that multiple skills must load for one task, not so broad that it can't be activated precisely.
- **Aim for moderate detail.** Concise, stepwise guidance with a working example outperforms exhaustive documentation. When covering every edge case, consider whether most are better left to the agent's judgment.
- **Keep `SKILL.md` under 500 lines / 5,000 tokens.** Move detailed reference material to `references/` and tell the agent *when* to load each file (e.g., "Read `references/api-errors.md` if the API returns a non-200 status code").

### Calibrate control

Match the specificity of instructions to the fragility of the task.

- **Give the agent freedom** when multiple approaches are valid. Explain *why* rather than dictating *what* — an agent that understands the purpose makes better context-dependent decisions.
- **Be prescriptive** when operations are fragile, consistency matters, or a specific sequence must be followed.
- **Provide defaults, not menus.** When multiple tools could work, pick one and mention alternatives briefly.
- **Favor procedures over declarations.** Teach the agent *how to approach* a class of problems, not what to produce for a specific instance.

### Useful patterns

**Gotchas sections** — the highest-value content in many skills. List concrete, environment-specific facts that defy reasonable assumptions:

```markdown
## Gotchas

- The `users` table uses soft deletes; always include `WHERE deleted_at IS NULL`.
- User ID is `user_id` in the database, `uid` in the auth service, and `accountId`
  in the billing API — all three refer to the same value.
```

**Output templates** — provide a concrete template when you need output in a specific format. Agents pattern-match against structure more reliably than prose descriptions. Short templates belong inline in `SKILL.md`; longer ones go in `assets/`.

**Checklists** — for multi-step workflows, an explicit checklist helps the agent track progress and avoid skipping steps:

```markdown
- [ ] Step 1: Analyze input (`scripts/analyze.py`)
- [ ] Step 2: Create mapping (`mapping.json`)
- [ ] Step 3: Validate (`scripts/validate.py`)
- [ ] Step 4: Execute (`scripts/run.py`)
```

**Validation loops** — instruct the agent to run a validator after each attempt and fix issues before proceeding.

**Plan-validate-execute** — for batch or destructive operations, have the agent produce an intermediate plan, validate it against a source of truth, then execute.

**Bundled scripts** — if the agent independently reinvents the same logic across runs, write a tested script once and bundle it in `scripts/`.

## Evals

Evals check that a skill fires on the right prompts, stays quiet on the wrong ones, and gives better answers than the agent does without it. They use [`claude plugin eval`](https://code.claude.com/docs/en/setup). By default, each case runs twice: once with the skill installed and once without it, and the report shows the score difference.

Evals live at the repo root, one subfolder per skill. They don't go inside `skills/<skill-name>/`, because everything in that folder ships to users when they install the plugin:

```
evals/
  <skill-name>/
    01-<case-name>/
      prompt.md          # frontmatter (run settings) + the user prompt
      graders/
        <grader>.md      # one file per check
    results/             # run output (gitignored)
```

### Creating a case

Scaffold a blank case from the repo root:

```bash
claude plugin eval init --bare 01-<case-name> --eval-dir evals/<skill-name>
```

Then edit `prompt.md`. The frontmatter holds the run settings and the body holds the prompt the agent receives:

```markdown
---
max_turns: 30
timeout_seconds: 600
runs: 3
allowed_tools: [Skill, Read, WebFetch, "Bash(curl:*)", "WebFetch(domain:example.autodesk.com)"]
plugins: [../../../skills/<skill-name>]
---
Write a Node.js script that gets a 2-legged token and kicks off an SVF2 translation...
```

- `plugins` is required. It's resolved relative to the case folder and points the case at the skill under test.
- `allowed_tools` lists the tools the agent may use. The case is skipped unless every gated tool on the list (`Bash`, `WebFetch`, `Write`, `Edit`, `mcp__*`) is also granted with `--allow-tools` at run time (see below).
- Write prompts the way a real user would. Don't name the skill or hint at it.

Add graders under `graders/`, one file per check. Three types are used in this repo:

```markdown
---
type: tool_used          # did the skill fire?
tool: Skill
input_match: <skill-name>
min: 1                   # for negative cases: min: 0, max: 0
---
```

```markdown
---
type: regex              # cheap, deterministic text check
target: last_message
match: not_contains      # or: contains
weight: 3
flags: i                 # optional
---
forge\.autodesk\.com|authentication/v1/
```

```markdown
---
type: llm                # judged by a model (default: haiku)
focus: last_message
weight: 1
---
Score PASS only if ALL of these hold:
1. ...
FAIL if any item is missing or wrong.
```

Tips for a good suite:

- **Include negative cases**: prompts that are close to the skill's domain but shouldn't trigger it. Grade them with `tool_used` and `min: 0, max: 0`.
- **Prefer regex graders** for hard rules, such as banned URLs or deprecated endpoints. Give them a high `weight`. Use `llm` graders for correctness that regex can't express, and write their criteria as an explicit checklist.
- The `tool_used: Skill` grader only shows whether the skill fired. It isn't counted in the with/without score, because the baseline run can't fire the skill.
- Use `runs: 3` or more. Agent output varies from run to run, and a single run is noise.

See [`evals/aps-reference/`](evals/aps-reference/) for a complete example.

### Running evals locally

Run from the repo root, granting every gated tool your cases list in `allowed_tools`:

```bash
claude plugin eval . --eval-dir evals/<skill-name> \
  --allow-tools Skill Read WebFetch "Bash(curl:*)" "WebFetch(domain:example.autodesk.com)"
```

Useful flags:

- `--case '<glob>'`: run only matching cases, for example `--case '03*'`. It takes a single glob; if you repeat the flag, only the last one is used.
- `--runs 1`: quick smoke test while you're iterating on a case.
- `--max-cost-usd <n>`: hard cost ceiling.
- `-j <n>`: run up to `n` agents in parallel. They all share your rate limit.
- `--ablation none`: skip the no-skill baseline run.
- `--no-publish`: keep the HTML report local.

Results and an HTML report are written to `evals/<skill-name>/results/<timestamp>/`.

> [!NOTE]
> Every run is a full agent session billed to your credentials. An 8-case suite with 3 runs and both arms is 48 agent runs. Use `--case` and `--runs 1` while iterating, and `--max-cost-usd` to cap a full run.

### Troubleshooting

**"Not logged in" / every run scores 0 in both arms.** Eval runs start separate `claude` processes, and those can't always read credentials that Claude Code stored in the macOS keychain. If you authenticate with a Console API key, read it from the keychain and pass it as an environment variable:

```bash
ANTHROPIC_API_KEY="$(security find-generic-password -s 'Claude Code' -w)" \
  claude plugin eval . --eval-dir evals/<skill-name> --allow-tools ...
```

The keychain entry name can differ between setups. To list the Claude-related entries on your machine without printing any secrets, run:

```bash
security dump-keychain | grep -i '"svce".*claude'
```

Then pass the matching name to `-s` (and add `-a <account>` if more than one entry shares the same name). An entry ending in `-credentials` holds a claude.ai subscription login, not an API key. Don't pass it as `ANTHROPIC_API_KEY`.

Run evals from a regular terminal, not from inside a Claude Code session. Nested runs can fail to authenticate.

**Cases that grant `Bash` fail during sandbox setup.** Docker Desktop puts symlinks in `~/.docker` that the eval sandbox refuses to work with. Setting `DOCKER_CONFIG` doesn't help. Quit Docker Desktop, move the folder aside for the duration of the run, then restore it:

```bash
mv ~/.docker ~/.docker.eval-bak
claude plugin eval . --eval-dir evals/<skill-name> --allow-tools ...
mv ~/.docker.eval-bak ~/.docker
```

**`curl` inside the agent can't reach a domain.** A bare `WebFetch` grant doesn't open network access for shell commands. Grant each domain explicitly, both in the case's `allowed_tools` and on the command line: `--allow-tools "WebFetch(domain:example.autodesk.com)"`.

**A case shows "not granted" and is skipped.** Some tools in its `allowed_tools` are missing from `--allow-tools`, or a pattern is malformed. Copy the list from the case's frontmatter into the command.
