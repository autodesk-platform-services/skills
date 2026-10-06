# Contributing

To add a new skill, create a folder under `skills/` with:

- A `SKILL.md` file containing the full agent instructions (with YAML frontmatter for `name`, `description`, and `metadata`)
- A `README.md` file for humans describing what the skill does, its requirements, recommended installation command (e.g., `npx skills add autodesk-platform-services/skills --project --skill <skill-name>`), any additional setup steps, and example usage
- A `references/` subfolder with any supporting documentation the agent needs to read during execution
- A `scripts/` subfolder for any reusable helper scripts the agent should run
- An `assets/` subfolder for output templates and other static resources

> [!IMPORTANT]
> Prefix the skill name (for example, with `aps-`) to avoid name clashes with other skills.

Then add a row for the new skill to the "Available Skills" table in the main [README.md](README.md), with a short description and a link to the skill's folder. Keep all other skill-specific information (requirements, installation, usage) in the skill's own `README.md`. The main README should only contain general information about the repository.

Finally, register the skill in the plugin marketplace (used by both Claude Code and GitHub Copilot) by adding an entry to the `plugins` array in [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json). Copy an existing entry and update it:

```json
{
  "name": "<skill-name>",
  "source": "./skills/<skill-name>",
  "description": "<same short description as in the README table>",
  "category": "aps",
  "tags": ["aps", "<product>", "<topic>"],
  "author": { "name": "Autodesk" },
  "homepage": "https://github.com/autodesk-platform-services/skills/tree/main/skills/<skill-name>",
  "repository": "https://github.com/autodesk-platform-services/skills",
  "license": "MIT"
}
```

- `name` must match the skill folder name and the `name` in its `SKILL.md` frontmatter. Users install the skill as `<skill-name>@aps-skills`, so treat the name as permanent: renaming it later breaks existing installs.
- Use `aps`, `autocad`, or `flow` as the `category`, or introduce a new one if none fits.
- Don't add a `version` field, and don't add a `plugin.json` to the skill folder. The marketplace entry serves as the plugin manifest, and without a `version` Claude Code uses the git commit SHA, so users get updates on every push. GitHub Copilot reads the same `.claude-plugin/marketplace.json` and also falls back to the `SKILL.md` in the plugin root, so don't add a separate `.github/plugin/marketplace.json` either.

Validate your changes locally with the [Claude Code CLI](https://code.claude.com/docs/en/setup) and the consistency check script before opening a pull request:

```bash
claude plugin validate .
node scripts/check-skills.mjs
```

Both checks also run in CI on every pull request.

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

See [`evals/aps-docs-portal/`](evals/aps-docs-portal/) for a complete example.

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
