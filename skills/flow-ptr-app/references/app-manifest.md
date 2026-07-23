# Adjust the app manifest, `info.yml`

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
