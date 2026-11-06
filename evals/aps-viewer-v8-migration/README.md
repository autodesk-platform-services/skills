# aps-viewer-v8-migration evals

| Case | Purpose | Key checks |
|---|---|---|
| `01-port-es5-extension` | Porting accuracy | ES6 extension class, awaited Initializer, `getPreferences()`, `getPropertySetAsync` |
| `02-neg-v7-selection-color` | Trigger precision | A v7 question from a user who isn't migrating must not fire the skill |

Expected values come from the Viewer v8 preview reference and the 7.131.x changelog (checked on 2026-11-06). If a case starts failing in both arms, re-check the docs before changing the skill.

## Running

From the repo root, in a terminal outside Claude Code:

```bash
claude plugin eval . --eval-dir evals/aps-viewer-v8-migration --allow-tools Skill Read Grep Glob
```

## Audit script regression test

`audit/` holds a small v7 app (`audit/fixture/`) with at least one hit per audit pattern, an already-migrated file (`v8-clean.js`) that must produce no findings, and the expected report (`audit/expected.md`). It runs in CI and needs no credentials:

```bash
node evals/aps-viewer-v8-migration/audit/test-audit.mjs
```

When you change `scripts/audit.mjs` on purpose, review the new report and accept it with `--update`.
