# App hooks

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
