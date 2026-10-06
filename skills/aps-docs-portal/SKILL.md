---
name: aps-docs-portal
description: >
  Navigate the Autodesk Platform Services (APS) documentation portal — find the right API docs,
  decode glossary terms, index table-of-contents JSON trees, extract content from static HTML pages,
  and build valid aps.autodesk.com portal links. Covers ACC, BIM 360, Model Derivative,
  Data Management, Viewer, Design Automation, Authentication, Webhooks, and all related APS APIs.
metadata:
  author: Developer Advocates @ Autodesk
  version: "0.2"
compatibility: Requires curl, jq, and htmlq for documentation scraping and TOC navigation.
---

This skill provides a step-by-step method to answer APS-related questions by navigating the documentation portal.

## Behavior
1. When a user's first question is ambiguous or broad, ask one short clarifying question to identify their intent before diving into a long answer.
2. Always provide reference links with your answers.
3. Always attempt to answer APS-related questions directly.
4. Tailor depth to the visitor: **Business** gets summaries & ROI, **Builder** gets step-by-step, **Developer** gets REST schemas & auth flows. Ask if unsure.

## Ground rules

- **Never fetch `aps.autodesk.com/en/docs/...`** (WebFetch, curl, or otherwise). The portal is a JavaScript SPA: every URL under it — valid or not — returns the same ~10 KB HTML shell. It contains no docs content and can't even tell you whether a URL exists.
- All content lives in two static places: the **TOC JSON** (`developer.doc.config.autodesk.com`) and the **page HTML** (`developer.doc.autodesk.com`). Use only these.
- **Never show those CDN URLs to the user**, and never hand-build portal links from CDN paths. Every portal link comes from column 1 of the TOC index (Step 3).
- **Answer from the glossary alone** when the question is only about terminology — no fetching needed.

---

# Method: How to Answer an APS Question

## Step 1 — Read the Glossary to Decode Jargon

If the question mentions an acronym you don't see here, look for its definition in the docs you fetch later.

### APS Glossary

- **APS**: Autodesk Platform Services (formerly Forge)
- **ACC**: Autodesk Construction Cloud. Recent docs pages also say **Forma** for ACC services (e.g. "Forma Issues", "Forma Data Management"); the separate **Forma Site Design API** is `forma_v1`.
- **BIM 360**: Legacy construction management platform (predecessor to ACC)
- **MD**: Model Derivative API — translates design files into viewable formats (SVF/SVF2)
- **DM**: Data Management API — manages files, folders, and storage (OSS, BIM 360, ACC hubs)
- **URN**: Base64-encoded resource identifier used across APS APIs
- **SVF/SVF2**: Scalable Viewing Format — optimized 3D web viewing format produced by Model Derivative and consumed exclusively by the APS Viewer SDK, similar concept to glTF format with openCTM compression
- **OSS**: Object Storage Service — APS cloud storage for uploading design files
- **Webhook**: Server-to-server callback triggered by APS events (e.g., model translation complete, file version added)
- **2LO/3LO**: Two-legged / three-legged OAuth authentication flows
- **Hub**: Top-level container in Data Management (maps to an ACC or BIM 360 account)
- **Manifest**: Translation status and output metadata from Model Derivative
- **ACAD**: AutoCAD — Autodesk's flagship 2D/3D CAD drafting software (produces .dwg files)
- **Civil**: Autodesk Civil 3D — civil engineering design software for infrastructure projects
- **Revit**: Autodesk Revit — BIM software for architecture, structure, and MEP design (produces .rvt files)
- **Build**: Autodesk Build — construction management module within ACC (field management, cost, etc.)
- **IFC**: Industry Foundation Classes — open standard file format for BIM data exchange between tools
- **RFI**: Request for Information — formal question submitted during construction, tracked in ACC/BIM 360
- **SSA**: Secure Service Accounts — a server-to-server identity that signs a JWT assertion with its private key and exchanges it for a **three-legged** (user-context) access token, without any interactive sign-in
- **AEC**: Architecture, Engineering, and Construction — the industry vertical APS primarily serves
- **AECDM**: AEC Data Model API — unified API for accessing design and construction data across ACC
- **DX**: Data Exchange — API for exchanging design data between applications in a neutral format
- **Auth**: Authentication — APS OAuth flows including 2LO, 3LO, PKCE, PAT (Personal Access Tokens), and SSA

**Translation Cost (Model Derivative API):**
Complex jobs are Revit (.rvt), IFC, and Navisworks (.nwd/.nwc). Everything else is a simple job.

---

## Step 2 — Identify the Relevant APIs

Use the source table below to pick the TOC(s) to open. For example:
- *"file changes"* → Data Management events, documented in the Webhooks API (`webhooks_v1`)
- *"model translate"* → Model Derivative API (`model-derivative_v2`)
- *"digital twin"* → Tandem (`tandem_v1`)
- *"events/callbacks"* → Webhooks API (`webhooks_v1`) — all event families (`dm.*`, `issue.*`, `extraction.*`, cost, reviews, …) live under its `reference/events/` section

| Source ID | API Title |
|---|---|
| `acc_v1` | Autodesk Construction Cloud APIs |
| `aecdatamodel_v1` | AEC Data Model API |
| `applications_v1` | Application Management API |
| `bim360_v1` | BIM 360 API |
| `buildingconnected_v2` | BuildingConnected & TradeTapp APIs |
| `data_v2` | Data Management API |
| `dataviz_v1` | Data Visualization |
| `design-automation_v3` | Automation API |
| `dx-sdk-beta_v7.2.0` | Data Exchange .NET SDK v7.2.0 |
| `fdxgraph_v1` | Data Exchange GraphQL |
| `flow_graph_engine_v1` | Flow Graph Engine |
| `forma_v1` | Forma Site Design API (Beta) |
| `informed-design_v1` | Informed Design API (Beta) |
| `insights_v1` | Business Success Plan Reporting API |
| `mfgdataapi_v3` | Manufacturing Data Model API |
| `model-derivative_v2` | Model Derivative API |
| `oauth_v2` | Authentication API |
| `parameters_v1` | Parameters API |
| `profile_v2` | User Profile API |
| `ssa_v1` | Secure Service Account API |
| `sustainability_v3` | Sustainability Data API |
| `tandem_v1` | Tandem Data |
| `tokenflex_v1` | Token Flex Usage Data API |
| `vaultdataapi_v2` | Vault Data API |
| `viewer_v7` | Viewer |
| `webhooks_v1` | Webhooks API |

**Portal URL ↔ source ID:** a portal URL `https://aps.autodesk.com/en/docs/{api}/{version}/…` always belongs to source ID `{api}_{version}` (e.g. `/en/docs/acc/v1/…` → `acc_v1`).

---

## Step 3 — Download and Index the TOC (once per source)

Download each TOC you need **once** to a local file, then query the file. TOCs are large (ACC ≈ 140 KB, Data Exchange SDK ≈ 650 KB) — never print one raw, and don't re-download it.

```bash
curl -sL --create-dirs -o /tmp/aps-docs/acc_v1.json "https://developer.doc.config.autodesk.com/bPlouYTd/acc_v1.json"
```

Turn it into a flat index — one line per page: **portal URL**, title, and CDN source path, tab-separated:

```bash
jq -r '.url_path as $api | .doc_version as $v | def w($p): ($p + [.url_path // ""]) as $q | (if .source then "https://aps.autodesk.com/en/docs/\($api)/\($v)/\($q | map(select(. != "")) | join("/"))/\t\(.display_name)\t\(.source)" else empty end), (.children[]? | w($q)); .children[] | w([])' /tmp/aps-docs/acc_v1.json | grep -i 'issues'
```

Filter with `grep -i` on topic words; for a quick look at the structure, list the top-level sections with `jq -r '.children[] | .url_path' FILE`.

Example output:

```
https://aps.autodesk.com/en/docs/acc/v1/reference/http/issues-issues-GET/	GET issues	acs-acs-api-documentation-main-52/acc/v1/reference/http/issues/issues-GET.html
```

- **Column 1 is the only valid portal link for that page.** The portal resolves pages by the TOC's `url_path` values, not by the CDN file path, and the two often differ:

  | CDN source path (after the repo slug) | Correct portal URL |
  |---|---|
  | `acc/v1/reference/http/issues/issues-GET.html` | `…/en/docs/acc/v1/reference/http/issues-issues-GET/` |
  | `model-derivative/v2/overview.html` | `…/en/docs/model-derivative/v2/developers_guide/overview/` |
  | `dx-sdk-beta/v1/v720/developers_guide/overview.html` | `…/en/docs/dx-sdk-beta/v7.2.0/developers_guide/overview/` |

- **Column 3 is the page HTML path** for Step 4.
- **Given a portal URL** (from the user or elsewhere): map it to its source ID (Step 2), index that TOC, and `grep -F` for the exact URL (with trailing `/`) to get its CDN source. Given a CDN URL: `grep -F` the path after `bPlouYTd/` in column 3; if the repo slug is outdated, grep for the tail of the path instead.
- Section nodes without a page have no `source`, so they aren't in the index; link to their first child page instead.

---

## Step 4 — Fetch Each Page Once, Extract Locally

Download the page HTML once, then run every extraction on the local file:

```bash
curl -sL -o /tmp/aps-docs/page.html "https://developer.doc.autodesk.com/bPlouYTd/{source}"

# 1. Structure first — tells you whether it's a reference page, guide, tutorial, or event list
htmlq -f /tmp/aps-docs/page.html -r 'script, style' --text 'h1, h2, h3, h4'

# 2. Prose, lists, and code samples
htmlq -f /tmp/aps-docs/page.html -r 'script, style, noscript' --text 'p, li, pre'

# 3. Tables (parameters, response fields, status codes) — one row per line
htmlq -f /tmp/aps-docs/page.html -r 'script, style' --text 'tr' | sed 's/^[[:space:]]*//' | grep -v '^$'
```

Notes:
- **REST reference pages** start with a table holding *Method and URI*, *Authentication Context* (e.g. "User context required"), and *Required OAuth Scopes*; then headers, URI/query parameters, request body, and response body tables. Required fields are marked with `*`. Grep the table rows for the parameter or field you need (e.g. `grep -A2 '^limit'`) instead of reading the whole page.
- Use a different file name per page if you need several at once.
- Select `tr`, not `td`/`table`: nested cells otherwise repeat the same text several times.

---

## Step 5 — Compile Into a Coherent Answer

1. **Define the terms** (from the glossary or what you found in the docs)
2. **Explain the relevant APIs and endpoints** (from the TOC and fetched pages)
3. **List the specific events, parameters, or features** (from the reference pages — quote values exactly)
4. **Provide reference links** — portal URLs copied from index column 1 only
5. **Include a practical example** if applicable (curl command, code snippet, etc.)

---

## Gotchas

- **`htmlq` is not pre-installed** — install it with `brew install htmlq` (macOS) or `cargo install htmlq`. If unavailable, fall back to `python3 -c` with `html.parser`.
- **The TOC JSON URL fails if the source ID is wrong** — it is case-sensitive and versioned (`data_v2`, not `data`). Use the table in Step 2.
- **Old CDN repo slugs keep resolving but serve stale content** — always take the `source` path from the current TOC rather than reusing a path from memory or from an older answer.
- **Webhook events are documented only in `webhooks_v1`**, under `reference/events/{family}/` (e.g. `data_management_events/dm.version.added/`). Data Management events use the `dm.` prefix; ACC Issues events are versioned (`issue.created-1.0`).

---

# Worked Example: "What webhooks are available for when a file changes?"

**Step 1 — Glossary.** A **webhook** is a server-to-server callback. **Data Management** handles files in OSS, BIM 360 Docs, and ACC Docs.

**Step 2 — Identify APIs.** File events are Data Management events, documented in the Webhooks API (`webhooks_v1`).

**Step 3 — Index the TOC.**

```bash
curl -sL --create-dirs -o /tmp/aps-docs/webhooks_v1.json "https://developer.doc.config.autodesk.com/bPlouYTd/webhooks_v1.json"
jq -r '<index filter from Step 3>' /tmp/aps-docs/webhooks_v1.json | grep 'data_management_events'
```

This yields one line per event — `dm.version.added`, `dm.version.modified`, `dm.version.deleted`, `dm.version.moved`, `dm.version.copied`, `dm.lineage.reserved`, `dm.lineage.unreserved`, `dm.lineage.updated`, `dm.folder.added`, `dm.folder.modified`, `dm.folder.deleted`, `dm.folder.purged`, `dm.folder.moved`, `dm.folder.copied`, `dm.operation.started`, `dm.operation.completed`, and more — each with its portal URL and source path.

**Step 4 — Fetch the pages you need** (e.g. the `dm.version.added` page from column 3) and extract headings, then the payload table.

**Step 5 — Compile.**

- `dm.version.added` — "When a new version of an item is added to a Folder" (scope: folder)
- `dm.version.modified` / `dm.version.deleted` / `dm.version.moved` / `dm.version.copied` — version changes
- `dm.folder.*` — folder changes

Links (copied from column 1):
- [Data Management events](https://aps.autodesk.com/en/docs/webhooks/v1/reference/events/data_management_events/)
- [dm.version.added](https://aps.autodesk.com/en/docs/webhooks/v1/reference/events/data_management_events/dm.version.added/)
- [Webhooks API overview](https://aps.autodesk.com/en/docs/webhooks/v1/developers_guide/overview/)
