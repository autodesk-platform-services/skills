# Contributing

To add a new skill, create a folder under `skills/` with:

- A `SKILL.md` file containing the full agent instructions (with YAML frontmatter for `name`, `description`, and `metadata`)
- A `references/` subfolder with any supporting documentation the agent needs to read during execution
- A `scripts/` subfolder for any reusable helper scripts the agent should run
- An `assets/` subfolder for output templates and other static resources

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
