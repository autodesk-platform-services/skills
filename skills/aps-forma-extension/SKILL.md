---
name: aps-forma-extension
description: >
  Scaffold and develop a Forma extension for Forma Site Design using TypeScript
  and the Forma SDK. Use for an embedded view, site design extension, or floating
  panel: project registration, proposal geometry, mini/full view synchronization,
  temporary overlays, and fixture-to-live verification.
metadata:
  author: Dinar Sharafutdinov
  version: "0.1"
compatibility: Forma Site Design licence with a project you can edit; Node 20+; forma-embedded-view-sdk 0.96.0
---

# APS Forma Extension

## When to use

Use this skill to create or debug a Forma Site Design extension running in an embedded iframe.
Default to vanilla TypeScript, Vite, and SDK 0.96.0; verify declarations before adopting newer SDK versions.
Host-form observations from an EU project on 2026-09-20/21 are marked as observations and remain unverified in other projects.
The worked example this skill was extracted from is [forma-zoning-check](https://github.com/sharafutdinovdi/forma-zoning-check).

## Step 1 — Prerequisites

1. Confirm a Forma Site Design licence, a hub with Design access, and a project the user can edit.
2. Use the project's Extension menu; membership in someone else's hub without Design access does not permit extension creation.
3. Install Node 20+ and npm.
4. For context-building tests, order **Contextual data → Browse data → Overture buildings** (Free, LOD1) and **Overture Roads** (Free); processing took about 30 seconds in the observed project.
5. Draw a proposal building and a site limit for live geometry checks; an earlier source-project observation reported no buildings on a fresh site, and that host behavior remains unverified elsewhere.

## Step 2 — Register the extension

Open **Extension menu → Add extension → ⚙ → Create extension** in the project.
Use **Myself only** as Owner for personal development; this requires no APS application and is visible only to its creator.
Sharing requires changing Owner to an APS application.

Set Name and **Who are allowed** to the intended project's `pro_…` authcontext or ACC project id.
The allowlist controls which projects show the extension in **Add extension**.
Fill Feedback link and Help link with working URLs.
Under Integration, configure Embedded views with `http://localhost:5173/`.
The observed form offered only `LEFT_MENU_PANEL` and `RIGHT_MENU_ANALYSIS_PANEL`; verify the current choices before registration.
Default to the right analysis panel for a compact summary and copy [assets/buttons.yaml](assets/buttons.yaml) into **Integration → Buttons** for the full view.
`OPEN_FLOATING_PANEL` is a button action, not an embedded-view placement.

Set Presentation's Provider, Description, and Text to show.
Validate URLs before adding Description links or Legal documents; failed persistence was silent in the observed form.
Read [references/setup-and-configuration.md](references/setup-and-configuration.md) for the complete form order and access/save troubleshooting.

## Step 3 — Scaffold

Run the bundled script from the skill directory with a new destination path:

```bash
bash scripts/new-forma-extension.sh /tmp/my-forma-extension
cd /tmp/my-forma-extension
npm install
npm run build
npm run dev
```

The scaffold pins SDK 0.96.0, loads the Forma Design System base stylesheet, binds Vite to port 5173 with `strictPort`, and copies the README and button templates.
It refuses an existing destination and does not install packages or start a server itself.
If port 5173 is occupied, identify the existing process; do not silently move to another port or stop an unrelated server.
Open `http://localhost:5173/?fixture=1` for synthetic data outside Forma.
The fixture flag is ignored in an iframe; the SDK is dynamically imported only for the embedded path.
The scaffold provides a read-only building-path summary and Refresh; implement the task-specific geometry and panels using the following steps.

## Step 4 — Read the proposal

Capture one persisted proposal revision and pass its root to geometry and element reads.
These examples retain the `proposal` calls used by the worked example; they work in 0.96.0 but are deprecated in favour of `Forma.udm.*`.

```typescript
import { Forma } from "forma-embedded-view-sdk/auto";

export async function readProposal() {
  await Forma.proposal.awaitProposalPersisted();
  const [rootUrn, proposalId] = await Promise.all([
    Forma.proposal.getRootUrn(), Forma.proposal.getId(),
  ]);
  const [rootTree, buildings, siteLimits] = await Promise.all([
    Forma.elements.get({ urn: rootUrn }),
    Forma.geometry.getPathsByCategory({ category: "building", urn: rootUrn }),
    Forma.geometry.getPathsByCategory({ category: "site_limit", urn: rootUrn }),
  ]);
  if (await Forma.proposal.getRootUrn() !== rootUrn ||
      await Forma.proposal.getId() !== proposalId) {
    throw new Error("Proposal changed while loading; refresh.");
  }
  return { rootUrn, proposalId, rootTree, buildings, siteLimits };
}
```

Repeat the root/id check after all geometry reads, before accepting the final snapshot.
Deduplicate paths and exclude nested building paths beneath another counted building.
For parcel calculations, expose missing or multiple site limits as an actionable state; do not silently choose a parcel.

Classify a building as **existing** when an ancestor key has `root.properties.flags[key].base === true` or an ancestor URN matches `/:group:[^:]+:base:/`.
Otherwise classify it as **proposal** after resolving its ancestry through child keys.
Unresolvable ancestry is an error; the building's own `basic` URN or name is not a source discriminator.

Use this geometry-provider order, preserving each failed attempt for diagnostics:

1. Try `elements.representations.graphBuilding({ urn: element.urn })`, then `grossFloorAreaPolygons({ urn: element.urn })`, for native buildings or advertised representations.
2. For non-native `basic`/context buildings, prefer a readable direct `geometry.getFootprint({ path, urn: rootUrn })` after those representations.
3. Union all direct child-path footprints; form paths from `element.children[].key`, such as `root/<key>/0` for a floor.
4. Project `geometry.getTriangles({ path, urn: rootUrn })` onto XY and union non-degenerate triangles, retaining holes and disconnected parts.
5. For native `basicbuilding`, use a readable direct footprint only as the last fallback; the observed native buildings returned `undefined`.

The worked example calls the direct footprint first for diagnostics, independently of the acceptance order above.
`getByPath` returns a wrapper; unwrap `element` before reading representations:

```typescript
import { Forma } from "forma-embedded-view-sdk/auto";

type RootUrn = Awaited<ReturnType<typeof Forma.proposal.getRootUrn>>;

export async function readLevels(path: string, rootUrn: RootUrn) {
  const { element } = await Forma.elements.getByPath({ path, rootUrn });
  const graph = await Forma.elements.representations.graphBuilding({ urn: element.urn });
  if (!graph?.data.levels.length) return undefined;
  const { transform } = await Forma.elements.getWorldTransform({ path });
  return { levels: graph.data.levels, floorCount: graph.data.levels.length, transform };
}
```

Graph levels contain `points`, `surfaces`, `spaces`, and `height`; points alone are not an ordered footprint ring.
Reconstruct outer/inner loops, apply the world transform, union level polygons for the footprint, and sum plate areas for model GFA.
The level count is exact to the model; context buildings have no observed floor count and their SDK area metrics returned zero.
Keep unavailable geometry/floors unknown, with an error and source label; do not convert them to zero or discard unresolved buildings.
Read [references/elements-and-geometry.md](references/elements-and-geometry.md) before implementing the classifier or geometry provider.

## Step 5 — UI for both placements

Use one app URL for mini and full views; default to mini below 300 px.
An earlier EU-project observation reported about 190–240 px of right-analysis content width; treat that range as unverified and measure the target container.
Put controls and detailed results in a floating panel with preferred size 440 × 720.
The left-menu placement remains a supported form choice; test its actual container width when using it.
Provide loading, empty, error, and ready states with a concrete next action for missing data.
Load the [Forma Design System base stylesheet](https://app.autodeskforma.eu/design-system/v2/forma/styles/base.css) before local CSS.
Panel extensions must follow the [Forma design guidelines](https://aps.autodesk.com/en/docs/forma/v1/overview/design-guidelines/); the same guidelines are recommended for floating panels.
Use semantic variables such as `--background-color-surface-100`, `--text-color-medium-default`, `--text-color-light`, `--background-color-accent`, `--border-color-input-box`, and the `--12-*`, `--14-*`, and `--20-*` type tokens.
Do not invent Forma spacing or radius tokens; no global tokens for those values were found in the loaded base styles.
Load only the Weave modules the view uses.
Official examples use `weave-button`, `weave-input`, `weave-select` with `weave-select-option`, `weave-checkbox`, `weave-tooltip`, `weave-progress-bar`, `weave-radio-button` with its group, `weave-toggle`, `weave-slider`, and `weave-accordion`.
Check component APIs in the [Forma Design System Storybook](https://app.autodeskforma.eu/design-system/v2/docs/?path=/docs/forma-component-library--docs), and keep domain-specific charts or cards custom when no verified component fits.

Treat mini and floating views as separate same-origin iframes, and verify origin and host lifecycle behavior in the target project.
Use `BroadcastChannel`, with `localStorage` events as fallback, to share proposal-scoped controls and snapshots.
Reject messages for another proposal/root or an older timestamp; render incoming results without recomputation or rebroadcast.
A newly opened view requests the current snapshot from a peer.

The source uses `Forma.proposal.subscribe(callback, { debouncedPersistedOnly: true })`; it is present in 0.96.0 and deprecated in favour of `udm.subscribe`.
Debounce persisted changes by 600 ms.
If subscription setup rejects or times out after 8 seconds, poll every 4 seconds using a fingerprint of proposal id, root URN, sorted building/site-limit paths, and counts.
Pause polling while hidden, clean up subscriptions/timers on teardown, and retain manual Refresh.
Read [references/embedded-view-ux.md](references/embedded-view-ux.md) for synchronization, fallback limits, and panel lifecycle details.

## Step 6 — Overlays

Use `Forma.render.addMesh` for temporary status tints, height-excess boxes, and setback bands.
Pass `Float32Array` positions and `Uint8Array` RGBA colours per vertex; keep vertices near a local origin and translate with the mesh transform.
Require a known base elevation before placing building meshes.
Serialize `Forma.render.cleanup()` with replacement jobs and cancel stale work when the proposal changes.
If rendering fails partway, clean up partial meshes and report the overlay error separately from numeric results.
Assign overlays to the calculating view; receiving views clear their own meshes to avoid duplicate tints.
The SDK declares host cleanup when an extension iframe closes; verify that behavior and recalculate/render from a surviving view when overlays disappear.

## Step 7 — Verify

First run `npm install && npm run build` and check the standalone fixture.
The scaffold exposes `?fixture=1&state=loading`, `state=empty`, and `state=error`; omission of `state` shows ready data.
Fixture checks validate application behavior, not Forma host contracts.

- [ ] Standalone fixture performs no SDK handshake; standalone without the flag gives host instructions.
- [ ] Loading, empty, error/retry, and ready states work at 190, 240, and 440 px without horizontal overflow.
- [ ] In Forma, the allowlisted project can add the extension, and the button opens its floating panel.
- [ ] Live reads include both Overture context and a drawn native building, with correct ancestry classification.
- [ ] Native geometry uses an available provider; missing geometry remains visible as unknown with its exact error.
- [ ] Add/delete/edit a building and switch proposals; subscription or polling refreshes without accepting a stale snapshot.
- [ ] Mini/full controls and reports synchronize; another proposal's messages are ignored and storage failure leaves each view usable.
- [ ] Mesh placement, colour, cleanup, and disappearance on owner-view close are checked in the live host.
- [ ] Keyboard focus is visible; any task-specified motion respects reduced motion; refresh does not shift the layout.

Record the SDK version, tested paths/providers, build output, fixture results, and remaining live checks in the generated README.
Do not describe synthetic fixtures as live Forma verification.

## Step 8 — Share beyond yourself (optional)

Owner **Myself only** is enough for development. To let other Forma users install the extension:

1. Create an APS application of type **Server-to-Server** at https://aps.autodesk.com/ (Applications → Create application).
2. In the extension form set **Owner** → the APS application; if the list is empty, use **Manage APS applications**. Reverting that ownership change to **Myself only** is undocumented and unverified.
3. Host the built app on a public URL and replace `http://localhost:5173/` in Embedded views and Buttons; keep the allowlist or switch to **All users of Forma**. Even with **All users**, others find the extension only by its Extension ID until it is published.
4. Treat Marketplace listing as a separate publishing flow with public production URLs, design-guideline conformance, and Autodesk review.

Sources: [sharing extensions](https://aps.autodesk.com/en/docs/forma/v1/overview/sharing-extensions/) and [publishing extensions](https://aps.autodesk.com/en/docs/forma/v1/overview/publishing-extensions/).

## Gotchas

- Extensions are created from a project; hub membership alone does not grant Design access.
- **Myself only** needs no APS app but exposes the extension only to its creator.
- A missing project allowlist entry keeps the extension out of that project's **Add extension** list.
- An earlier observed form offered only `LEFT_MENU_PANEL` and `RIGHT_MENU_ANALYSIS_PANEL`; verify the current choices, and use Buttons YAML for a floating panel.
- An earlier observed save reordered YAML `actions` before `label`; treat key order as insignificant.
- An earlier EU-project observation found that `http://localhost:5173/` worked without HTTPS; verify the current host policy.
- Load Forma Design System `base.css`; each Weave custom element also requires its own module.
- The reported 190–240 px right-analysis content width is unverified outside the source project; measure the target container.
- In one unverified form observation, a not-yet-published GitHub URL and `mailto:` failed to persist after about 60 seconds; validate links and reopen the form after saving.
- An unverified Vite development observation reported `504 Outdated Optimize Dep` after dependency installation; close and reopen the panel before deeper diagnosis.
- An earlier observed Presentation form had no icon upload field; verify the current form instead of inventing one.
- An earlier source-project observation reported no buildings on a fresh site until context was ordered or proposal buildings were drawn; verify the target site.
- The category is singular `"building"`, despite inconsistent declaration examples; site limits use `"site_limit"`.
- Existing buildings are identified by base ancestry, not `overture`/`integrate` substrings in their URNs.
- Overture `basic` buildings have footprints but no observed floor count; zero SDK area metrics do not prove zero area.
- Drawn `basicbuilding` elements can contain only `category` in properties and return `undefined` from `getFootprint`.
- SDK 0.96.0 `floorStack` only creates buildings; there is no `getFloors` reader there.
- Footprint `coordinates` are a plain `[x,y]` ring in local metres, not a nested GeoJSON polygon.
- `getFootprint` does not traverse children; `getTriangles` does, and child paths use keys rather than URN fragments.
- SDK 0.96.0 has no selection setter; an extension cannot select a host element programmatically.
- Proposal root/id/persistence calls and `proposal.subscribe` exist but are deprecated in favour of UDM.
- The polling fingerprint cannot detect edits that change neither the root revision nor the paths.
- The inspected 0.96.0 implementation uses its own iframe synchronization and overlay ownership; verify whether the current host provides newer lifecycle or state APIs.

## References

- Read [references/setup-and-configuration.md](references/setup-and-configuration.md) when registering, sharing, or troubleshooting form persistence and access.
- Read [references/elements-and-geometry.md](references/elements-and-geometry.md) when reading buildings, classifying ancestry, or implementing geometry fallbacks.
- Read [references/embedded-view-ux.md](references/embedded-view-ux.md) when implementing panels, synchronization, refresh, or overlays.
- Read [references/gotchas.md](references/gotchas.md) when observed host behavior contradicts SDK examples or earlier worked-example notes.
