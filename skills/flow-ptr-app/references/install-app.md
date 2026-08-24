# Install an app into the target configuration

Pick the environment (e.g. `shot_step` for Shots, `asset_step` for Assets, or `project` if the app
only needs project-level context) and the engine you're targeting (`tk-maya`, `tk-nuke`,
`tk-desktop`, `tk-shell`, ...). Starting with the `tk-shell` engine in the `project` environment is
often the fastest loop for early logic-only development (no DCC startup required, and you can run
it straight from the command line or your IDE if you have a centralized config) — you can wire up
DCC-specific UI/menus afterwards.

**Fastest path — a `dev` location descriptor directly (no git tag needed yet):** a brand-new app
has no git tag to `install_app` from anyway, so for early development just hand-edit the
environment YAML and point the app straight at your local checkout:

```yaml
tk-multi-myapp:
  location:
    type: dev
    path: /path/to/source_code/tk-multi-myapp
```

This goes wherever the app is wired into an engine's settings (e.g.
`env/includes/settings/tk-shell.yml`'s `apps:` block for the environment you picked). Toolkit loads
the code directly from that path, so every edit is picked up on the next reload — no reinstall
step, and no git repo is needed yet.

`type: dev` is about the development workflow (it's what turns on the "Reload and Restart" menu
command), not about *where* the code physically sits — `path:` just points at wherever the app's
source was cloned to. So it's still `type: dev` whether that path is
`<configuration_folder>/install/apps/<name>` or an external workspace folder; the type only changes
once the app stops being actively developed and gets a real release descriptor (`git`/`app_store`/
...) — see [Release and push to production](release.md).

**Alternative — `install_app` + `switch_app`:** useful once the app already has at least one git
tag (e.g. it started life as an app-store/git app and you're now developing a new feature for it).
From a shell, `cd` into the sandbox and use its `tank` command:

```bash
cd /your/development/sandbox
./tank install_app shot_step tk-maya user@remotehost:/path_to/tk-multi-mynewapp.git
```

This installs the latest git tag. Launch the DCC from the sandbox against a Shot/Asset task to
confirm the app loads. Then switch Toolkit to track your local checkout instead of the git tag, so
code edits are picked up immediately — this produces the same `type: dev` location entry as the
fastest-path option above, just generated for you rather than hand-written:

```bash
./tank switch_app shot_step tk-maya tk-multi-mynewapp /Users/you/dev/tk-multi-mynewapp
```

Either way, these are the files under the sandbox's config that end up changed — useful to know
when reviewing the diff before `push_configuration`:
- `env/includes/app_locations.yml` — where Toolkit finds the app's code (git repo, local path, etc.)
- `env/includes/settings/<my_custom_app>.yml` — the app's own settings for this project
- `env/includes/settings/tk-<engine>.yml` — wires the app into an engine + pipeline step
  (asset/shot/sequence/...); make sure the app's settings file is included at the top of this file

> **Engine version:** when the environment config pins an engine (e.g. `tk-maya`), best practice
> is to use the latest available engine version for that environment rather than an old pinned
> one — you get current bug fixes and it avoids chasing issues in the engine that have already
> been fixed upstream.
