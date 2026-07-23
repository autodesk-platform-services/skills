# Find or create a sandbox/dev configuration (strongly advised, not mandatory)

You *can* develop directly against the project's production configuration instead of a sandbox —
Toolkit doesn't technically stop you. It's just a bad idea: a half-finished app can break real
menus/commands for everyone else on the project, and any test data/events you generate land in
production. Best practice is to use a sandbox unless you have a specific reason not to.

First check whether a dev sandbox already exists for this project — look for one already
cloned/flagged for dev use on the Pipeline Configurations page, or ask the user directly. If one
exists, target it instead of production.

If one doesn't exist yet, create it by following the "Creating a sandbox" section of whichever
reference file matches the config type —
[centralized-config.md](centralized-config.md) or
[distributed-config.md](distributed-config.md). Either way, once you have a
target configuration you also know where the app's own code should be cloned to next.
