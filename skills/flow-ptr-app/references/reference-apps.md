# Reference apps to study

Real Autodesk-maintained apps that each demonstrate a distinct, reusable pattern — read their
source before designing your own app's architecture.

**Architectural patterns (DCC-side)**
- [tk-multi-publish2](https://github.com/shotgunsoftware/tk-multi-publish2) — collector +
  pluggable publish-plugin hooks (`accept()` → `validate()` → `publish()` → `finalize()`). Use
  this as the reference if your app needs a "process N items through configurable tasks" workflow.
- [tk-multi-workfiles2](https://github.com/shotgunsoftware/tk-multi-workfiles2) — a moderately
  complex app sliced into 9 independent hooks rather than one monolith.
- [tk-multi-loader2](https://github.com/shotgunsoftware/tk-multi-loader2) — dispatches different
  logic per published-file-type via an `actions_hook`.
- [tk-multi-breakdown2](https://github.com/shotgunsoftware/tk-multi-breakdown2) — compares scene
  state against PTR's published data and flags what's out of date.

**Simple, minimal apps**
- [tk-multi-about](https://github.com/shotgunsoftware/tk-multi-about) — read-only, no side
  effects; closest thing to a "hello world" Toolkit app.
- [tk-multi-snapshot](https://github.com/shotgunsoftware/tk-multi-snapshot) — single-purpose local
  utility, no PTR data beyond the local file, no hooks needed.
- [tk-multi-launchapp](https://github.com/shotgunsoftware/tk-multi-launchapp) — its entire
  customization surface is one hook (`before_app_launch`); good "one hook is enough" reference.

**Web menu-action apps (`tk-shotgun` engine)**
- [tk-shotgun-setupproject](https://github.com/shotgunsoftware/tk-shotgun-setupproject) — a full
  project-setup wizard triggered from the web UI.
- [tk-shotgun-launchvredreview](https://github.com/shotgunsoftware/tk-shotgun-launchvredreview) —
  a web action that launches an external tool (VRED) for review.
- [tk-shotgun-folders](https://github.com/shotgunsoftware/tk-shotgun-folders),
  [tk-shotgun-launchfolder](https://github.com/shotgunsoftware/tk-shotgun-launchfolder),
  [tk-shotgun-launchpublish](https://github.com/shotgunsoftware/tk-shotgun-launchpublish) — minimal,
  single-action `tk-shotgun` apps.
