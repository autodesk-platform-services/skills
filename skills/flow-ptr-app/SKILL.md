---
name: create-fptr-app
description: "Guide for scaffolding a new Flow Production Tracking (FPTR) / ShotGrid Toolkit (sgtk) app from the official tk-multi-starterapp template — setting up a dev sandbox pipeline configuration, forking the template, wiring info.yml/hooks, and testing before pushing to production config. Triggers on: create a new FPTR app, new Flow Production Tracking app, new Toolkit app, tk-multi-starterapp, sgtk app development, tank install_app, tank switch_app, dev sandbox pipeline configuration, ShotGrid Toolkit app."
---

# Create a Flow Production Tracking (FPTR) Toolkit App

Scaffolds a new Toolkit (`sgtk`) app for Flow Production Tracking (formerly ShotGrid/Shotgun)
by forking Autodesk's official starter template, rather than building an app from scratch.

Reference guide: [Developing a Toolkit App](https://help.autodesk.com/view/SGDEV/ENU/?guid=SGD_pg_developer_pg_sgtk_developer_app_html)
Template repo: https://github.com/shotgunsoftware/tk-multi-starterapp

## Before you start: do you really need a new app?

Toolkit has a customization ladder — cheaper options first:

1. **Project settings** — often what looks like "custom behavior" is just a setting on an
   existing app (`env/includes/settings/...`).
2. **App settings** — check the target app's `info.yml` for a setting that already does this.
3. **Hooks** — the app may expose a hook for exactly the behavior you want to change.
4. **An existing app, mainstream or niche** — search for one (below) before assuming none exists.
   Fork/extend it (Step 6's "forking an existing app" note) if it's 90% of what you need.
5. **A brand-new app** — only once steps 1-4 genuinely don't cover it.

**Before scaffolding, search the shotgunsoftware org by keyword — name, description, and
README** — the table below is a commonly-used subset, not the full catalog, so absence from it
isn't proof nothing exists (e.g. "import an EDL and create cuts" matches `tk-multi-importcut`,
not anything named "edl"):
```bash
curl -s "https://api.github.com/search/repositories?q=<keyword>+org:shotgunsoftware+in:name,description,readme" \
  | grep -o '"full_name": *"[^"]*"'
```
(Use this `curl`/api.github.com form, not `gh api`, if `gh` is configured against an internal
GitHub Enterprise host.) If you get a hit, confirm it's not archived, then go to Step 6's forking
path instead of Step 3's template clone.

| App | What it does |
|---|---|
| Panel | Lightweight FPTR overview inside the DCC (Maya, Nuke, Houdini, ...) — current task, activity stream, notes, tasks, versions, publishes, without leaving the app. |
| About | Displays the current Toolkit context, config, and installed app/engine versions — debugging/support utility. |
| Launch App | Shortcuts to start any supported application from the web or Desktop interface. |
| Snapshot | Capture/restore the state of the current DCC scene as a local backup (not shared/published). |
| Workfiles | Safely create, open, or version up workfiles tied to a task/asset/shot; can also start from an already-published file. |
| Publish | Lets artists publish work for downstream use, with pre-publish validation and progress/logging; supports both in-DCC and standalone file publishing. |
| Loader | Browse and load/reference published files into the current DCC, with a customizable, context-aware tree view. |
| Breakdown | Tracks assets referenced in a scene and flags when newer published versions are available. |

Flame, Nuke, Hiero, Houdini, and Mari ship their own export/tracking apps too — check those the
same way before scaffolding new. Editorial/cut-import workflows specifically are covered by
`tk-multi-importcut` (https://github.com/shotgunsoftware/tk-multi-importcut) — an EDL/AAF import
app that creates Cuts, CutItems, and Versions and links them to Sequences/Shots.

- Full list of ready-to-use apps: https://help.autodesk.com/view/SGDEV/ENU/?guid=SGD_pc_toolkit_apps_html
- All app/engine/framework source: https://github.com/shotgunsoftware

## Overview

1. Locate the project's pipeline configuration and figure out how it's set up (centralized vs. distributed).
2. Find or create a **sandbox/dev configuration** to develop against instead of production (strongly advised, not mandatory).
3. Clone and rename the `tk-multi-starterapp` template.
4. Install the app into the target configuration and point Toolkit at your local checkout (`switch_app`).
5. Adjust `info.yml` (name, description, supported engines, required versions, settings schema).
6. Decide whether the app needs custom **hooks**.
7. Implement the app (`app.py`, `python/app/dialog.py`), supporting both UI and no-UI paths.
8. Test and iterate using Toolkit's "Reload and Restart" menu item.
9. Tag a release and push the sandbox config changes to the production pipeline configuration.

If planning before executing: only step 1's read-only lookup is safe to run during the plan pass —
it determines the config type/descriptor, which almost every later step branches on. Run it first,
then draft the rest of the plan from what it returns rather than trying to plan steps 2-9 upfront.

## Step 1 — Locate the project configuration

Before anything else, find the `PipelineConfiguration` you'll actually be developing against, and
figure out how it's set up. This determines where files live, whether there's a local `tank`
command to run, and where the app's code goes in Step 3 — get this wrong and
`install_app`/`switch_app` will look in the wrong place or fail outright.

Check the project's **Pipeline Configurations** page in Flow Production Tracking, or query it via
the API:

```python
sg.find_one(
    "PipelineConfiguration",
    [["project", "is", {"type": "Project", "id": PROJECT_ID}], ["code", "is", "Primary"]],
    ["mac_path", "windows_path", "linux_path", "descriptor"],
)
```

**Planning boundary:** this query (and reading the descriptor scheme below) is read-only and safe
to run during a plan pass — it doesn't touch the filesystem or any repo. Almost everything else in
this skill branches on what it returns (sandbox strategy, install method, and whether Step 1 itself
ends in "blocked, escalate" for some descriptor types), so treat this lookup as the plan-phase
action and draft the rest of the plan *after* it returns, rather than trying to plan the whole
thing upfront. Everything from here on — cloning, write-access probes, `tank` commands — is the
execute phase.

- **Populated `mac_path`/`windows_path`/`linux_path`, no `descriptor`** → **centralized (classic)**
  configuration.
- **Populated `descriptor`, empty path fields** → **distributed** configuration.

**Centralized (classic):** the whole config lives at one fixed path shared by every machine. Read
[references/centralized-config.md](references/centralized-config.md) before continuing — it covers
the access checks you must run before touching that path, plus how sandboxing, cloning, and the
final release descriptor (Steps 2, 3, and 9) differ for this config type.

**Distributed:** there's no single fixed install location — every machine resolves the `descriptor`
on demand into its own local bundle cache. Read
[references/distributed-config.md](references/distributed-config.md) before continuing — read the
whole file, not just the descriptor-type table: some descriptor types (App Store, FPTR-attachment)
carry escalation steps that are easy to miss if skipped.

## Step 2 — Find or create a sandbox/dev configuration (strongly advised, not mandatory)

You *can* develop directly against the configuration located in Step 1, even if it's production —
Toolkit doesn't technically stop you. It's just a bad idea: a half-finished app can break real
menus/commands for everyone else on the project, and any test data/events you generate land in
production. Use a sandbox unless you have a specific reason not to.

First check whether a dev sandbox already exists for this project — look for one already
cloned/flagged for dev use on the Pipeline Configurations page, or ask the user directly. If one
exists, skip to Step 3 and target it instead of production.

If one doesn't exist yet, create it by following the "Creating a sandbox" section of whichever
reference file you read in Step 1 —
[references/centralized-config.md](references/centralized-config.md) or
[references/distributed-config.md](references/distributed-config.md). Either way, once you have a
target configuration you also know where the app's own code should be cloned to in Step 3.

## Step 3 — Clone and rename the starter template

Name the app, following the `tk-ENGINE-APPNAME` convention:

- `tk-multi-<appname>` if the app should run in more than one engine (Maya, 3ds Max, Nuke, Desktop, Shell, ...)
- `tk-<engine>-<appname>` if it's tied to one DCC, e.g. `tk-maya-characterposer`

**Ask where the app's source should be cloned to — don't assume.** The default target and clone
command depend on config type — follow the "Cloning the app template" section of
[references/centralized-config.md](references/centralized-config.md) or
[references/distributed-config.md](references/distributed-config.md) (whichever matches Step 1),
which also covers when the user might still prefer a separate workspace folder over the config-type
default.

**Working from GitHub's UI:** fork https://github.com/shotgunsoftware/tk-multi-starterapp (or
download it as a zip) into your own repo instead, then place/rename it per the reference file above.

The template already ships with:

```
app.py                 # Application entry point, registers menu commands
info.yml               # Manifest: metadata, settings schema, frameworks, version requirements
python/app/__init__.py
python/app/dialog.py   # Main window logic / callbacks
python/app/ui/         # Auto-generated from resources/dialog.ui (pyside2-uic / build_resources.yml)
resources/dialog.ui    # Qt Designer source for the UI
resources/resources.qrc
style.qss              # Qt stylesheet
```

## Step 4 — Install the app into the target configuration

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
`env/includes/settings/tk-shell.yml`'s `apps:` block for the environment you picked) — see the
"Adding an app" reference guide for exactly where. Toolkit loads the code directly from that path,
so every edit is picked up on the next reload — no reinstall step. This is exactly what we did
earlier in this skill's own dev session, wiring `tk-multi-eventAiCreated` into `tk-shell.yml` and
`tk-desktop.yml` this way, with no git repo involved at all yet.

`type: dev` is about the development workflow (it's what turns on the "Reload and Restart" menu
command), not about *where* the code physically sits — `path:` just points at wherever Step 3 put
it. So it's still `type: dev` whether that path is `<configuration_folder>/install/apps/<name>` or
an external workspace folder; the type only changes once the app stops being actively developed
and gets a real release descriptor (`git`/`app_store`/...) in Step 9.

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

> **Engine version:** when the environment config pins an engine (e.g. `tk-maya`), use the
> latest available engine version for that environment rather than an old pinned one — you get
> current bug fixes and it avoids chasing issues in the engine that have already been fixed
> upstream.

## Step 5 — Adjust `info.yml`

Update the manifest to describe the app and its configuration surface:

```yaml
display_name: "My New App"
description: "What this app does."

supported_engines:            # leave empty/omit if engine-agnostic
requires_shotgun_fields:      # PTR entity fields this app depends on, if any
requires_core_version: "v0.19.18"
requires_engine_version:      # minimum engine version needed, if any (leave empty unless required)
deny_permissions:             # restrict which PTR roles/groups can run this app, if needed
deny_platform:                # restrict OS platforms, if needed
help_url:                     # URL opened by the app's "help" button, if any

configuration:
  save_template:
    type: template
    default_value: "maya_asset_work"
    description: "The template to use when building the path to save the file into"
    allows_empty: False
  debug_logging:
    type: bool
    default_value: false
    description: "Controls whether debug logging is enabled for this app."

frameworks:
  - {"name": "tk-framework-shotgunutils", "version": "v2.x.x"}
  - {"name": "tk-framework-qtwidgets", "version": "v1.x.x", "minimum_version": "v1.5.0"}
```

`entity_types` is another common setting (which PTR entity types the app applies to — Shots,
Assets, Versions, ...) and `templates` lets a setting reference a filesystem template instead of
a literal value/path.

Read settings in code with `self.get_setting("save_template")` (inside `Application`) or
`app.get_setting(...)` from the dialog module.

Manifest reference: https://developers.shotgridsoftware.com/tk-core/platform.html#manifest-file

## Step 6 — Decide on hooks

Hooks let studios override specific pieces of app behavior per-project without touching the app's
code — extract a piece of logic that's likely to need per-studio customization (path logic,
naming, validation rules) into its own hook. Only add one when that's actually likely; most simple
apps need zero custom hooks.

Declare each hook in `info.yml`'s `configuration` block, and ship the default implementation as its
own `.py` file (with a `Hook` class) under a `hooks/` folder at the app's code root:

```yaml
configuration:
  my_custom_hook:
    type: hook
    default_value: "{self}/my_custom_hook.py"
    description: "Hook to customize X behavior."
```

**Studios override it** by copying the default hook file into the project config's `hooks/` folder
(e.g. `my_project_config/config/hooks/my_custom_hook.py`), editing it there, then repointing the
environment YAML setting at the copy:

```yaml
hook_before_app_launch: default              # built-in hook
hook_before_app_launch: before_app_launch    # <- studio's custom copy
```

Common generic hook names you'll see across apps (useful naming inspiration for your own):
`hook_before_app_launch`, `hook_app_launch`, `pick_environment`, `hook_before_register_command`,
`hook_ui_config`, `actions_hook`, `post_load`.

**Alternative to building new — forking an existing app:** if an existing app already covers most
of what you need and hooks/settings genuinely aren't enough, fork it via git instead of starting
from the starter template. Convention: place the clone under `config/install/app_store` in the
config, and point `app_locations.yml` at it:

```yaml
my_custom_app:
  location:
    type: git
    path: git@github.com:yourstudio/tk-multi-mycustomapp.git
    version: v1.0.0
```

When forking, use extended version numbers (`vBASE.LOCAL`, e.g. `v0.2.12.1`) to indicate "based on
upstream v0.2.12, plus our local patch 1" — this keeps a clear trail back to the original version
and makes it obvious the tag isn't an upstream release.

More on descriptors: https://developers.shotgridsoftware.com/tk-core/descriptor.html

## Step 7 — Implement the app

- `app.py`: `Application` subclass, registers menu command(s) via `self.engine.register_command(...)`.
- `python/app/dialog.py`: dialog construction and callbacks.
- Support **both** UI and no-UI execution paths, since not every engine/context has Qt available:
  - **With UI**: full Qt window via `self.engine.show_dialog(...)` (PySide2/PySide6 or PyQt).
  - **Without UI**: a console-only code path (check `self.engine.has_ui`) so the app still works
    headlessly, e.g. under `tk-shell` or a batch/farm context.
  - Qt bindings (PySide/PyQt) must be available in whichever Python environment runs the DCP/engine
    — install PySide2/PySide6 (or PyQt) into that environment if it's missing.
- As soon as the config has one or more `dev`-descriptor apps in it, Toolkit adds a **Reload and
  Restart** entry to the PTR menu — use it to pick up code and config changes without restarting
  the host application. It reloads the config and code and restarts the engine, but any app UI
  already open on screen does **not** auto-update — close and re-launch it from the menu after
  reloading to see your changes.
- App logic will mainly talk to PTR through the **Python API** (`shotgun_api3`, already available
  via `sgtk`/the engine). It may also need the **REST API** for cases outside a Python/DCC context
  (e.g. external services, non-Python integrations): https://developers.shotgridsoftware.com/rest-api/

### If the app is a web menu action (`tk-shotgun` engine)

Apps launched from a right-click menu in the FPTR **web** UI (not from inside a DCC) run under the
`tk-shotgun` engine, which behaves differently from DCC engines like `tk-maya`:

1. Clicking the menu action in the browser sends a request to FPTR Desktop.
2. Desktop spawns a separate local Python process and bootstraps the `tk-shotgun` engine in it.
3. Your app code runs in that process — same idea as `python script.py` from the command line,
   but with the Toolkit framework loaded.
4. If UI is needed, a Qt app starts there (same with-UI/without-UI detection as above).
5. All output is captured and sent back to the web interface **only after the process
   completes** — it is not streamed live.

Implications: this requires FPTR Desktop to be installed and running, plus network connectivity
for the API calls. Logging goes to the standard Toolkit log files, not the browser console — set
`debug_logging: true` (see Step 5) while iterating. Don't confuse `tk-shotgun` with `tk-desktop`
(the engine that runs *inside* the Desktop launcher itself) — they're different engines.

### Triggering custom events

If other systems (the studio's Event Framework daemon, webhooks) should react to something your
app does, create an `EventLogEntry` yourself via the Python API, e.g.
`sg.create("EventLogEntry", data)`, using the same naming convention FPTR uses internally:
`ApplicationName_EntityType_Action` (e.g. `tkMultiEventApp_event_new`).

### Python API best practices

Before writing any non-trivial `sg.find`/`sg.create` calls, read
[references/python-api-best-practices.md](references/python-api-best-practices.md) — performance,
API-key/script hygiene, and design guidance that's cheap to follow now and expensive to retrofit
later. Skip only for trivial, one-off calls.

## Step 8 — Test

- Iterate using Reload and Restart as above.
- Ask whether to verify headless in `tk-shell` first before testing in the final DCC/engine, or go
  straight to the final target — `tk-shell` first gives a faster logic-only loop (no DCC startup)
  and catches non-UI bugs early, but ultimately the dialog/UI still needs to be confirmed working
  in the real target engine (`tk-desktop` or the DCC itself) before calling it tested.
- To bring in another tester without giving them production access, add them to the
  **User Restrictions** field on the sandbox's `PipelineConfiguration` entity in PTR, and make sure
  they have read access to your app's repo/checkout.
- The Python API is useful for writing quick test scripts or exercising app logic against real
  PTR data outside the DCC:
  - https://developers.shotgridsoftware.com/python-api/
  - https://help.autodesk.com/view/SGDEV/ENU/?guid=SGD_py_python_api_overview_html

## Step 9 — Release and push to production

An app must be versioned to be installed via a git/App Store/GitHub descriptor at all — Toolkit
resolves `version:` against git tags, so every release needs one. Use semantic versioning
(`vMAJOR.MINOR.PATCH`, e.g. start at `v0.1.0` during early development, `v1.0.0` for the first
production-ready release) and bump it for every change you want the config to be able to pin to.

Tag a version in git (e.g. `v1.0.0`), then switch the sandbox back from dev mode to the tagged
git descriptor:

```bash
./tank switch_app shot_step tk-maya tk-multi-mynewapp user@remotehost:/path_to/tk-multi-mynewapp.git
```

Toolkit will pick up the highest-numbered tag. Finally, push the sandbox's config changes to the
project's primary production configuration:

```bash
./tank push_configuration
```

Other descriptor types are available for the final `location` entry besides a git tag — App Store,
GitHub releases, or a Shotgun-uploaded attachment — pick whichever matches how the studio
distributes Toolkit apps.

Descriptor choice for this final release step also differs by config type — see the "Release
descriptor" note in whichever reference file you read in Step 1
([references/centralized-config.md](references/centralized-config.md) /
[references/distributed-config.md](references/distributed-config.md)).

**Later, when you ship a new version:** bump the version manually in `app_locations.yml` (and
`core_api.yml` if it's a core update), or use the Desktop app's Project menu → "Check for
configs/core updates" to upgrade automatically, or use `tank` from the project's config, or the
update API — whichever fits the studio's workflow.

## Reference apps to study

Before designing your own app's architecture, read
[references/reference-apps.md](references/reference-apps.md) — real Autodesk-maintained apps,
each demonstrating one distinct, reusable pattern (publish pipelines, hook-per-concern slicing,
minimal single-hook apps, web menu actions).

## After this skill

Once the app is scaffolded, developed, and tested in the sandbox, come back for help wiring the
final descriptor and reviewing the environment YAML diff before it's pushed to the production
pipeline configuration.

## Documentation starting points

- **User documentation** — getting-started guides and know-how articles by production role:
  https://help.autodesk.com/view/SGSUB/ENU/
- **Developer documentation** — technical guides for pipeline leads/devs: Toolkit, tools,
  configurations, APIs, integrations, troubleshooting:
  https://help.autodesk.com/view/SGDEV/ENU/
