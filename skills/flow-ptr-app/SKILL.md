---
name: create-fptr-app
description: "Guide for developing a new Flow Production Tracking (FPTR) / ShotGrid Toolkit (sgtk) app following a Spec-driven approach. Triggers on: create a new FPTR app, new Flow Production Tracking app, new Toolkit app, tk-multi-starterapp, sgtk app development, tank install_app, tank switch_app, dev sandbox pipeline configuration, ShotGrid Toolkit app."
---

# Create a Flow Production Tracking (FPTR) Toolkit App

This skill guides developers and pipeline engineers through building an FPTR app, following a
**spec-driven** way — capture intent, check for reuse, write and validate a spec, plan, then
implement, verify, release, and maintain against that spec. Tell the user which phase (below)
you're starting before acting in it, so they can track progress and step in between phases.

Reference guide: [Developing a Toolkit App](https://help.autodesk.com/view/SGDEV/ENU/?guid=SGD_pg_developer_pg_sgtk_developer_app_html)
Default app template repo: https://github.com/shotgunsoftware/tk-multi-starterapp

## Overview

The How-to guides below hold the mechanical how-to for parts of Phases 1, 3–6, and 8. Phases 2, 7,
and 9 have no dedicated guide — they're about the spec and process rather than a tool/config
action, so they're covered inline above.

- **Phase 1 — Requirements/Intent capture**
   - Step 1.1 — Ask for the business need, and capture it in a short spec (one paragraph or a few
     bullet points) — what the app should do, on which context and environment it will run,
     whether it needs a UI, whether it needs toolkit hooks, constraints and acceptance criteria.
   - Step 1.2 — Find if an existing app / project setting / hook cover fully or partially the
     requirements, and confirm with the user whether later we will fork/extend from that tool or
     scaffold a new app from the starter template.
- **Phase 2 — Specification** — before cloning anything, write down what the app does:
   - Step 2.1 — Clarify the goal, the app name, dependencies on Flow PTR frameworks/engines, the
     environment the tool runs in (e.g. Sequence/Shot/Episode-specific), the entities involved, the
     settings schema, which hooks the tool may need to expose and why, whether it needs a UI, and
     its acceptance criteria.
   - Step 2.2 — Validate the spec before planning: check it for internal contradictions, missing
     edge cases (no-UI/headless path, permissions, multi-engine support), and security/data-privacy
     concerns (e.g. what PTR fields/entities the app reads or writes). Flag gaps to the user instead
     of assuming an answer; only move to Phase 3 once the spec is complete and consistent.
- **Phase 3 — Plan/Design**
   - Step 3.1 — Locate the project's pipeline configuration and figure out how it's set up
     (centralized vs. distributed).
   - Step 3.2 — Find or create a sandbox or a dev configuration if it doesn't exist.
   - Step 3.3 — Clarify where the app's source code should live, and how it will be installed into
     the target configuration (dev path vs. install_app + switch_app).
   - Step 3.4 — Break the spec into a technical plan: architecture decisions, file/module
     breakdown, sequencing of work, identification of risks or open questions. Where practical,
     decide to keep core logic separate from UI code (e.g. `app.py`/a logic module stays
     UI-agnostic, with `dialog.py` calling into it) — this is what lets Phase 6 exercise the tool
     as a headless command in `tk-shell` before wiring up the dialog.
   - Step 3.5 — Split the plan into discrete, independently verifiable tasks/tickets, each with
     clear inputs/outputs and acceptance criteria, so that the work can be parallelized and
     tracked.
- **Phase 4 — Scaffold**
   - Step 4.1 — Clone the reference tool — `tk-multi-starterapp` by default, or whichever existing
     app Phase 1 found as a better fit.
- **Phase 5 — Implement against spec**
   - Step 5.1 — Fill in `info.yml` and implement code with main logic starting in `app.py` and UI
     starting in `python/app/dialog.py`. Declare and implement hooks if applicable.
- **Phase 6 — Verify against spec**
   - Step 6.1 — Test and iterate using Toolkit's "Reload and Restart" menu item, checked against
     acceptance criteria, not just "does it run". If possible and it has a dependency on UI, test
     first in `tk-shell` or a batch context, then in tk-desktop and then in the target DCC engine,
     if applicable. If app is a Menu Action Item, test it in the FPTR Desktop and then in the web
     UI.
- **Phase 7 — Change management**
   - Step 7.1 — Commit in git, pushing changes only to the sandbox configuration, not
     production.
   - Step 7.2 — Future feature changes update the spec first (Phase 2, re-validating it per Step
     2.2), then cascade forward through Phases 3-6 — the spec stays the source of truth, not the
     code.
- **Phase 8 — Release to production**
   - Step 8.1 — Once ready for release, warn the user about the implications of bringing to
     production the new changes. Analyse possible side effects or interruptions to workflow.
   - Step 8.2 — Tag a release and push the sandbox config changes to the production pipeline
     configuration.
- **Phase 9 — Maintenance**
   - Step 9.1 — Treat post-release bug reports or new asks as spec changes, not code patches: update
     the spec first (back to Phase 2), validate it again, then re-enter Phase 3 and cascade forward
     through Phases 4-8 — the spec stays the source of truth for the life of the app, not just
     during initial development.


# How-to guides

## Find existing functionality or apps

Toolkit has a customization ladder — cheaper options first:

1. **Project settings** — often what looks like "custom behavior" is just a setting on an
   existing app (`env/includes/settings/...`).
2. **App settings** — check the target app's `info.yml` for a setting that already does this.
3. **Hooks** — the app may already expose a hook for exactly the behavior you want to change.
4. **An existing app, mainstream or niche** — search for one (below) before assuming none exists.
   Fork/extend if it's close to what you need.
5. **A brand-new app** — only once none of the above can be reused.

Best practice is to search the shotgunsoftware org by keyword — name, description, and README —
before assuming nothing exists:
```bash
curl -s "https://api.github.com/search/repositories?q=<keyword>+org:shotgunsoftware+in:name,description,readme" \
  | grep -o '"full_name": *"[^"]*"'
```
(Use this `curl`/api.github.com form, not `gh api`, if `gh` is configured against an internal
GitHub Enterprise host.) 

Flame, Nuke, Hiero, Houdini, and Mari ship their own export/tracking apps too — check those the
same way before scaffolding new.

- A list of ready-to-use apps: https://help.autodesk.com/view/SGDEV/ENU/?guid=SGD_pc_toolkit_apps_html
- All app/engine/framework source: https://github.com/shotgunsoftware

Before designing your own app's architecture, read
[references/reference-apps.md](references/reference-apps.md) — real Autodesk-maintained apps,
each demonstrating one distinct, reusable pattern (publish pipelines, hook-per-concern slicing,
minimal single-hook apps, web menu actions).

## Locating a project configuration

Before anything else, find the `PipelineConfiguration` you'll actually be developing against, and
figure out how it's set up. This determines where files live, whether there's a local `tank`
command to run, and where the app's code should be cloned to later — get this wrong and
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
this guide branches on what it returns (sandbox strategy, install method, and whether this lookup
itself ends in "blocked, escalate" for some descriptor types), so best practice is to run this
lookup first and draft the rest of the plan *after* it returns, rather than planning the whole
thing upfront. Everything from here on — cloning, write-access probes, `tank` commands — is
execution, not planning.

- **Populated `mac_path`/`windows_path`/`linux_path`, no `descriptor`** → **centralized (classic)**
  configuration.
- **Populated `descriptor`, empty path fields** → **distributed** configuration.

**Centralized (classic):** the whole config lives at one fixed path shared by every machine. Read
[references/centralized-config.md](references/centralized-config.md) before continuing — it covers
the access checks you must run before touching that path, plus how sandboxing, cloning, and the
final release descriptor differ for this config type.

**Distributed:** there's no single fixed install location — every machine resolves the `descriptor`
on demand into its own local bundle cache. Read
[references/distributed-config.md](references/distributed-config.md) before continuing — read the
whole file, not just the descriptor-type table: some descriptor types (App Store, FPTR-attachment)
carry escalation steps that are easy to miss if skipped.

## Find or create a sandbox/dev configuration (strongly advised, not mandatory)

You *can* develop directly against the configuration you located above, even if it's production —
Toolkit doesn't technically stop you. It's just a bad idea: a half-finished app can break real
menus/commands for everyone else on the project, and any test data/events you generate land in
production. Best practice is to use a sandbox unless you have a specific reason not to.

First check whether a dev sandbox already exists for this project — look for one already
cloned/flagged for dev use on the Pipeline Configurations page, or ask the user directly. If one
exists, target it instead of production.

If one doesn't exist yet, create it by following the "Creating a sandbox" section of whichever
reference file matches the config type —
[references/centralized-config.md](references/centralized-config.md) or
[references/distributed-config.md](references/distributed-config.md). Either way, once you have a
target configuration you also know where the app's own code should be cloned to next.

## Cloning and renaming the starter template

Apps are named following the `tk-ENGINE-APPNAME` convention:

- `tk-multi-<appname>` if the app should run in more than one engine (Maya, 3ds Max, Nuke, Desktop, Shell, ...)
- `tk-<engine>-<appname>` if it's tied to one DCC, e.g. `tk-maya-characterposer`

**Best practice: ask where the app's source should be cloned to, rather than assuming.** The
default target and clone command depend on config type — follow the "Cloning the app template"
section of [references/centralized-config.md](references/centralized-config.md) or
[references/distributed-config.md](references/distributed-config.md) (whichever matches the
project's config type), which also covers when the user might still prefer a separate workspace
folder over the config-type default.

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

## Install an app into the target configuration

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
command), not about *where* the code physically sits — `path:` just points at wherever the app's
source was cloned to. So it's still `type: dev` whether that path is
`<configuration_folder>/install/apps/<name>` or an external workspace folder; the type only changes
once the app stops being actively developed and gets a real release descriptor (`git`/`app_store`/
...) — see "Release and push to production" below.

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

## Adjust the app descriptor `info.yml`

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

## App hooks

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

When forking, best practice is to use extended version numbers (`vBASE.LOCAL`, e.g. `v0.2.12.1`) to
indicate "based on upstream v0.2.12, plus our local patch 1" — this keeps a clear trail back to the
original version and makes it obvious the tag isn't an upstream release.

More on descriptors: https://developers.shotgridsoftware.com/tk-core/descriptor.html

## Implement a Flow PTR app

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

### Web menu action (`tk-shotgun` engine)

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
`debug_logging: true` (see "Adjust the app descriptor `info.yml`" above) while iterating. Don't
confuse `tk-shotgun` with `tk-desktop` (the engine that runs *inside* the Desktop launcher itself)
— they're different engines.

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

## Test an app

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

## Release and push to production

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
descriptor" note in whichever reference file matches the project's config type
([references/centralized-config.md](references/centralized-config.md) /
[references/distributed-config.md](references/distributed-config.md)).

**Later, when you ship a new version:** bump the version manually in `app_locations.yml` (and
`core_api.yml` if it's a core update), or use the Desktop app's Project menu → "Check for
configs/core updates" to upgrade automatically, or use `tank` from the project's config, or the
update API — whichever fits the studio's workflow.

## Flow PTR documentation

- **User documentation** — getting-started guides and know-how articles by production role:
  https://help.autodesk.com/view/SGSUB/ENU/
- **Developer documentation** — technical guides for pipeline leads/devs: Toolkit, tools,
  configurations, APIs, integrations, troubleshooting:
  https://help.autodesk.com/view/SGDEV/ENU/
