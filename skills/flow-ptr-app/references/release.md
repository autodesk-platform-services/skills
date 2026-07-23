# Release and push to production

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
([centralized-config.md](centralized-config.md) / [distributed-config.md](distributed-config.md)).

**Later, when you ship a new version:** bump the version manually in `app_locations.yml` (and
`core_api.yml` if it's a core update), or use the Desktop app's Project menu → "Check for
configs/core updates" to upgrade automatically, or use `tank` from the project's config, or the
update API — whichever fits the studio's workflow.
