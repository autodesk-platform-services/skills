# Setup and configuration

These are observations from the EU Forma Site Design form on 2026-09-20/21.

## Access and project scope

Extension creation starts in a project at **Extension menu → Add extension → ⚙ → Create extension**.
Owner **Myself only** requires no APS application and makes the extension visible only to its creator.
Sharing with others requires changing Owner to an APS application.
**Who are allowed** is a project allowlist accepting a `pro_…` authcontext or ACC project id.
An extension appears in **Add extension** only for allowlisted projects.

A member of someone else's hub without Design access cannot create extensions.
**Create a new hub** is disabled for non-contract-managers in the observed account.
A personal Forma Site Design licence creates its own hub.

## Form order

| Section | Fields in observed order |
| --- | --- |
| General | Name; Owner; Who are allowed; Feedback link; Help link |
| Integration | Buttons (YAML); Embedded views; Service accounts; Endpoints; Secret; Bundles |
| Presentation | Provider; Description; Description links; Legal documents; Text to show |

For the read-only local starter, configure Buttons and Embedded views; the observed personal-owner flow needs no APS credentials.
Leave unrelated integration sections unchanged.
Provider, Description, and Text to show persisted in the observed form.
There is no icon upload field.

## Placements and button

The Embedded views form offers exactly `LEFT_MENU_PANEL` and `RIGHT_MENU_ANALYSIS_PANEL`.
The default workflow uses the right analysis panel for the mini view and a button for the floating view.
Paste [the button template](../assets/buttons.yaml) into **Integration → Buttons**.
The template uses `OPEN_FLOATING_PANEL`, URL `http://localhost:5173`, and preferred size 440 × 720.
Floating is not an embedded-view placement value.
Forma reorders YAML keys on save, placing `actions` first and `label` last.

`http://localhost:5173` works as the local embedded-view URL without HTTPS.
Keep the same scheme, host, and port for both views to support same-origin synchronization.
Vite's strict port prevents a server from silently starting at an unregistered URL.

## Save verification

Description links and Legal documents silently failed to persist with a not-yet-existing GitHub URL or `mailto` in the observed attempt.
Save spun for about 60 seconds without an error.
This observation does not establish that every `mailto` or valid GitHub URL is unsupported.
Validate target URLs before saving, reopen the form, and check that each value persisted.
If it fails, record the field and URL scheme, correct the target, and retry the affected field.
Do not treat an absent error message as proof of a successful save.

## Context data

A fresh site has no buildings.
Order **Contextual data → Browse data → Overture buildings** (Free, LOD1) and **Overture Roads** (Free).
Processing took approximately 30 seconds in the observed project; verify completion before interpreting an empty category result.
Draw a separate native proposal building for comparison and a site limit for parcel calculations.
