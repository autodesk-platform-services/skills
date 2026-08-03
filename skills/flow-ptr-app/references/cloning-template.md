# Cloning and renaming the starter template

Apps are named following the `tk-ENGINE-APPNAME` convention:

- `tk-multi-<appname>` if the app should run in more than one engine (Maya, 3ds Max, Nuke, Desktop, Shell, ...)
- `tk-<engine>-<appname>` if it's tied to one DCC, e.g. `tk-maya-characterposer`

**Best practice: ask where the app's source should be cloned to, rather than assuming.** The
default target and clone command depend on the project's config type (see
[locating-config.md](locating-config.md) if you haven't determined that yet):

## Centralized config

Default target is under the config itself, at `install/apps/<name>` — this is the best-practice
location, though the user may still prefer a separate workspace folder to keep the app's own repo
independent of the config from day one, or because they intend to reuse the app across more than
one project; confirm which one before cloning.

```bash
git clone https://github.com/shotgunsoftware/tk-multi-starterapp.git \
  <configuration_folder>/install/apps/tk-multi-myapp
cd <configuration_folder>/install/apps/tk-multi-myapp
rm -rf .git
git init
git remote add origin <your-studio-repo-url>   # once you have a destination to push to
```

e.g. `/mnt/pipeline/my_project/config/install/apps/tk-multi-myapp`. See
[centralized-config.md](centralized-config.md) for more on this layout.

## Distributed config

No local `install/apps` to drop code into — clone into a regular dev workspace folder, and wire it
in later via `switch_app`/a `dev` descriptor (see [install-app.md](install-app.md)):

```bash
git clone https://github.com/shotgunsoftware/tk-multi-starterapp.git tk-multi-myapp
cd tk-multi-myapp
rm -rf .git
git init
git remote add origin <your-studio-repo-url>   # once you have a destination to push to
```

See [distributed-config.md](distributed-config.md) for more on this layout.

**Working from GitHub's UI:** fork https://github.com/shotgunsoftware/tk-multi-starterapp (or
download it as a zip) into your own repo instead, then place/rename it per the sections above.

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
