# Centralized (classic) pipeline configuration

`PipelineConfiguration`'s `mac_path`/`windows_path`/`linux_path` fields are populated and `descriptor` is empty.

## What it looks like

The whole config — `config/`, `install/` (core, plus every app/engine/framework it has ever
resolved), `cache/`, and the `tank`/`tank.bat` scripts — lives at one fixed path on disk, the same
path on every machine that uses it. This is what we used earlier in this skill's own dev session:

```
/Users/<username>/dev/FlowPTR/config/my_dev_config
├── tank / tank.bat
├── config/env/...
└── install/
    ├── app_store/...       # git/app_store descriptors resolve here automatically — not for hand-editing
    └── apps/...            # reserved for your own dev-type apps (see cloning-template.md)
```

`cd` into that path and run `./tank ...` directly for every `tank` command referenced elsewhere in
this skill.

Note `install/app_store/` isn't fixed to that name — the actual bundle-cache location on disk is
whatever a `dev`/`app_store`/`git` descriptor in `env/includes/app_locations.yml` resolves to; an
app can live anywhere as long as its descriptor points there.

## Before touching the path: check access

Confirm you (the coding agent) can both see and write to that path — a centralized config's fixed
location is often outside where the agent normally operates, and visibility doesn't imply write
access. Two distinct problems need distinct fixes:

- **Out of workspace scope:** if a plain read (`ls`) is refused as *out of scope* rather than an OS
  error, ask whoever's driving the session to add that path as an additional working directory.
- **No write permission:** once in scope, confirm you can also write
  (`touch <path>/.write_test && rm <path>/.write_test`) — read-only access is common on shared
  configs. If write fails, don't chase wider permissions — build your own sandbox instead (see
  [sandbox-dev-configuration.md](sandbox-dev-configuration.md)), which you'll own outright. Re-run
  both checks against the sandbox if it also turns out to be unwritable.
