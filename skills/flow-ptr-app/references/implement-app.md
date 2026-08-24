# Implement a Flow PTR app

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

## Web menu action (`tk-shotgun` engine)

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
`debug_logging: true` (see [Adjust the app manifest, `info.yml`](app-manifest.md)) while
iterating. Don't confuse `tk-shotgun` with `tk-desktop` (the engine that runs *inside* the Desktop
launcher itself) — they're different engines.

## Triggering custom events

If other systems (the studio's Event Framework daemon, webhooks) should react to something your
app does, create an `EventLogEntry` yourself via the Python API, e.g.
`sg.create("EventLogEntry", data)`, using the same naming convention FPTR uses internally:
`ApplicationName_EntityType_Action` (e.g. `tkMultiEventApp_event_new`).

## Python API best practices

Before writing any non-trivial `sg.find`/`sg.create` calls, read
[python-api-best-practices.md](python-api-best-practices.md) — performance, API-key/script
hygiene, and design guidance that's cheap to follow now and expensive to retrofit later. Skip only
for trivial, one-off calls.
