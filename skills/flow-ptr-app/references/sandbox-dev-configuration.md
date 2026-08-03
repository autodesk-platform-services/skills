# Find or create a sandbox/dev configuration (strongly advised, not mandatory)

You *can* develop directly against the project's production configuration instead of a sandbox —
Toolkit doesn't technically stop you. It's just a bad idea: a half-finished app can break real
menus/commands for everyone else on the project, and any test data/events you generate land in
production. Best practice is to use a sandbox unless you have a specific reason not to.

First check whether a dev sandbox already exists for this project — look for one already
cloned/flagged for dev use on the Pipeline Configurations page, or ask the user directly. If one
exists, target it instead of production.

If one doesn't exist yet, create it based on the project's config type (see
[locating-config.md](locating-config.md) if you haven't determined that yet):

## Centralized config

Right-click the primary config on the Pipeline Configurations page and **Clone** it. This produces
a second `PipelineConfiguration` entity with its own path fields and an on-disk copy with the same
`config/`/`install/`/`tank` structure as the original (see
[centralized-config.md](centralized-config.md)) — that copy is your sandbox.

## Distributed config

Cloning on the Pipeline Configurations page here typically creates a new `PipelineConfiguration`
entity pointing at its own descriptor (e.g. your own branch of the same config repo) rather than a
physical folder copy — so "the sandbox" is a descriptor, not a path (see
[distributed-config.md](distributed-config.md)). To get a working one:

1. Clone the config's own source repo (the one behind its `descriptor`) to a local dev folder:
   ```bash
   git clone https://github.com/mystudio/tk-config-basic.git my-dev-config
   cd my-dev-config
   git checkout -b dev/my-sandbox
   ```
2. Point a (new or existing) sandbox `PipelineConfiguration` entity's `descriptor` at this branch,
   e.g. `sgtk:descriptor:git?path=https://github.com/mystudio/tk-config-basic.git&version=dev/my-sandbox`
   — ask a site admin to create/update it if you don't have permission.
3. Edit `env/*.yml` inside `my-dev-config` and push to `dev/my-sandbox`; that's the equivalent of
   editing the sandbox config directly. Toolkit re-resolves and re-downloads into the bundle cache
   the next time it's used.
