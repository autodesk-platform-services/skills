# Distributed pipeline configuration

`PipelineConfiguration`'s `descriptor` field is populated and the path fields are empty.

## What it looks like

There is no single fixed install location. Every machine resolves the `descriptor` (typically a git
repo + version/branch, or an `app_store` descriptor) on demand and downloads core/apps/engines into
its own local **bundle cache** — `~/Library/Caches/Shotgun` on macOS, `%APPDATA%\Shotgun` on
Windows, `~/.shotgun` on Linux, or wherever `SHOTGUN_BUNDLE_CACHE_PATH` points if it's set. There's
usually still a `tank`/`tank.bat` at the root of a checked-out copy of the config's source repo, but
it bootstraps core from the bundle cache instead of a local `install/core` — commands behave the
same either way.

## Which type is the descriptor?

The `descriptor` string self-describes its type — read the scheme right after `sgtk:descriptor:`,
before the `?`. **Read the whole row for your scheme before acting** — some carry escalation steps
that are easy to miss if you only skim for the clone command:

| Scheme | Meaning | What to do |
|---|---|---|
| `git?path=<url>&version=<tag>` / `git_branch?path=<url>&branch=<branch>` | Git-based; `path=` is the clone URL | `git clone <path> my-dev-config`. Auth failure → ask the repo owner/admin for read access (and write/contributor access too if you'll push back). Can clone but can't push → fork/branch to something you own, point a personal `PipelineConfiguration` at it, and PR back later — good practice even with push access, to avoid disrupting teammates on the same descriptor. No git credentials configured at all → that's an environment setup issue for the user, not a permissions one. |
| `app_store?name=<config>&version=<version>` | Packaged release downloaded into each user's bundle cache — not a repo, not editable | Any local edit is discarded on re-resolve. Check whether the studio already forked this into an editable git-backed config (look for another `PipelineConfiguration` pointing at that fork). If none exists, moving production off an App Store descriptor is an infrastructure decision — **escalate to the pipeline lead/admin rather than doing it unilaterally.** |
| `path?path=<location>` | Plain shared folder, not git-versioned | Treat like the centralized case (see `references/centralized-config.md`) — check read *and* write access directly on the path. |
| `shotgun?...` | Attachment on an FPTR entity — no repo, no branch/fork/PR mechanism | Download the current attachment (web UI, or `sg.download_attachment(...)`), confirm it's the latest version, and treat that unzipped folder as your one working copy — develop against it like the centralized case. Put it under git yourself for a diff/rollback safety net. Confirm you have write access on the field before assuming you can `sg.upload(...)` a new version back. |
