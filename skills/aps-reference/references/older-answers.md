# Is an older (Forge-era) answer still valid?

Read this when you find a forum answer, blog post, sample, or Stack Overflow snippet that predates the rename of
Forge to APS, or whose date you can't tell, and you must decide whether to use it.

Most old answers are still conceptually right but wrong in specifics: URLs, endpoints, token flows, SDK names, and
region codes. Check the specifics against current docs before using any of it. Don't discard an old answer just
because it's old, and don't trust it just because it was accepted.

## Quick signals that an answer is stale

| You see | Meaning | Check |
| --- | --- | --- |
| `forge.autodesk.com`, `developer.autodesk.com/en/docs/...` links | Pre-APS docs URLs | Find the page in the current docs through `SKILL.md` |
| `/authentication/v1/...` (`authenticate`, `gettoken`) | Authentication v1 | Use `/authentication/v2/authorize` and `/authentication/v2/token` (see `aps-auth`) |
| "Forge" in package names (`forge-apis`, `forge-server-utils`) or `forge-` repos | Old SDKs and samples | Use the official `aps-sdk-*` packages and `aps-` samples |
| "Design Automation for Revit/AutoCAD" | Renamed | Now the Automation API (docs source `design-automation_v3`) |
| BIM 360 Docs, "Autodesk Docs", ACC | Product renames | Docs now say Forma for ACC services; BIM 360 is the legacy platform |
| Viewer v6 or v7 code with ES5 classes, `THREE` globals, or overlays | Old Viewer generation | See `aps-migration` for Viewer v8 |
| `region` of `APAC` | Removed region code | Use `AUS` |
| `output.destination.region` in a translation job body | Deprecated | Use the `region` header |
| Downloading a derivative from `.../manifest/{derivativeUrn}` directly | Deprecated | Use the signed cookies endpoint |
| Pricing, "cloud credits", rate limits stated as numbers | Always time-sensitive | Read current pricing and limits pages |
| Login with a stored refresh token or username and password for a backend job | Superseded pattern | Use SSA (see `aps-auth`) |

## Procedure

1. **Date the answer.** Find the post date, the SDK or Viewer version it uses, and the base URLs. Anything that
   predates the Forge to APS rename (around 2022) needs the checks below.
2. **Find the current page for each API call it uses.** Index the API's TOC, locate the reference page, and compare the
   method and URI, auth context, required scopes, and request fields.
3. **Check for deprecation notes** on that reference page, and search the blog for the endpoint or field name
   (see `other-sources.md`).
4. **Compare concepts, not just names.** If the answer's concept (a bucket, a manifest, a translation) still exists in
   the current docs, the answer's logic is probably fine and only its details need updating.
5. **State what you changed.** When you adapt an old snippet, say which parts you updated and which pages you checked.

## What tends to survive

- OAuth concepts (2-legged and 3-legged), URN encoding, the hub, project, folder, item, and version hierarchy
- The Model Derivative job, manifest, and derivative model
- The general structure of the Viewer API and extension model (though v8 changed internals)
- Webhook delivery semantics (at least once)

## What tends not to

- Anything that names a URL, a header, an SDK package, a region code, a price, or a limit
- Anything about BIM 360 specifics, since the Forma APIs have replaced many of them
- Authentication flows that rely on user passwords or long-lived refresh tokens for automation
