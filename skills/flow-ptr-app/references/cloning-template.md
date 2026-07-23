# Cloning and renaming the starter template

Apps are named following the `tk-ENGINE-APPNAME` convention:

- `tk-multi-<appname>` if the app should run in more than one engine (Maya, 3ds Max, Nuke, Desktop, Shell, ...)
- `tk-<engine>-<appname>` if it's tied to one DCC, e.g. `tk-maya-characterposer`

**Best practice: ask where the app's source should be cloned to, rather than assuming.** The
default target and clone command depend on config type — follow the "Cloning the app template"
section of [centralized-config.md](centralized-config.md) or
[distributed-config.md](distributed-config.md) (whichever matches the project's config type),
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
