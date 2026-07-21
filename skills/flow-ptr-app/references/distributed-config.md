# Distributed pipeline configuration

Everything Steps 1-3 and 9 of SKILL.md do differently when the `PipelineConfiguration`'s
`descriptor` field is populated and the path fields are empty.

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
| `shotgun?...` | Attachment on an FPTR entity — no repo, no branch/fork/PR mechanism | Download the current attachment (web UI, or `sg.download_attachment(...)`), confirm it's the latest version, and treat that unzipped folder as your one working copy — develop against it like the centralized case (Step 3 of SKILL.md). Put it under git yourself for a diff/rollback safety net. Confirm you have write access on the field before assuming you can `sg.upload(...)` a new version back. |

## Creating a sandbox (Step 2)

Cloning on the Pipeline Configurations page here typically creates a new `PipelineConfiguration`
entity pointing at its own descriptor (e.g. your own branch of the same config repo) rather than a
physical folder copy — so "the sandbox" is a descriptor, not a path. To get a working one:

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

## Cloning the app template (Step 3)

No local `install/apps` to drop code into — clone into a regular dev workspace folder, and wire it
in later via `switch_app`/a `dev` descriptor (Step 4):

```bash
git clone https://github.com/shotgunsoftware/tk-multi-starterapp.git tk-multi-myapp
cd tk-multi-myapp
rm -rf .git
git init
git remote add origin <your-studio-repo-url>   # once you have a destination to push to
```

## Release descriptor (Step 9)

A git descriptor means every user's machine resolves and downloads it independently into their own
bundle cache, so each of them needs git installed and authenticated against your repo. An App Store
or Shotgun-uploaded descriptor avoids that per-user git dependency.
