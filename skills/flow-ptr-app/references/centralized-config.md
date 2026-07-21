# Centralized (classic) pipeline configuration

Everything Steps 1-3 and 9 of SKILL.md do differently when the `PipelineConfiguration`'s
`mac_path`/`windows_path`/`linux_path` fields are populated and `descriptor` is empty.

## What it looks like

The whole config — `config/`, `install/` (core, plus every app/engine/framework it has ever
resolved), `cache/`, and the `tank`/`tank.bat` scripts — lives at one fixed path on disk, the same
path on every machine that uses it. This is what we used earlier in this skill's own dev session:

```
/Users/<username>/dev/FlowPTR/config/my_dev_config
├── tank / tank.bat
├── config/env/...
└── install/apps/...       # apps get vendored in here the first time they're installed
```

`cd` into that path and run `./tank ...` directly for every `tank` command referenced elsewhere in
this skill.

## Before touching the path: check access

Confirm you (the coding agent) can both see and write to that path — a centralized config's fixed
location is often outside where the agent normally operates, and visibility doesn't imply write
access. Two distinct problems need distinct fixes:

- **Out of workspace scope:** if a plain read (`ls`) is refused as *out of scope* rather than an OS
  error, ask whoever's driving the session to add that path as an additional working directory.
- **No write permission:** once in scope, confirm you can also write
  (`touch <path>/.write_test && rm <path>/.write_test`) — read-only access is common on shared
  configs. If write fails, don't chase wider permissions — build your own sandbox instead (below),
  which you'll own outright. Re-run both checks against the sandbox if it also turns out to be
  unwritable.

## Creating a sandbox (Step 2)

Right-click the primary config on the Pipeline Configurations page and **Clone** it. This produces
a second `PipelineConfiguration` entity with its own path fields and an on-disk copy with the same
`config/`/`install/`/`tank` structure described above — that copy is your sandbox.

## Cloning the app template (Step 3)

Default target is under the config itself, at `install/apps/<name>` — this is the best-practice
location, though the user may still prefer a separate workspace folder to keep the app's own repo
independent of the config from day one; confirm which one before cloning.

```bash
git clone https://github.com/shotgunsoftware/tk-multi-starterapp.git \
  <configuration_folder>/install/apps/tk-multi-myapp
cd <configuration_folder>/install/apps/tk-multi-myapp
rm -rf .git
git init
git remote add origin <your-studio-repo-url>   # once you have a destination to push to
```

e.g. `/mnt/pipeline/my_project/config/install/apps/tk-multi-myapp`.

## Release descriptor (Step 9)

A git descriptor works well here — one admin runs the update and the resolved code is cached once,
in a location every user already shares.
