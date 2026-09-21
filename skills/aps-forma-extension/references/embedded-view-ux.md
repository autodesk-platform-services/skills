# Embedded view UX

## Mini and floating views

An earlier EU-project observation reported approximately 190–240 px of right-analysis content width; remeasure it in the target project.
Default to a mini summary below 300 px and put controls and detailed results in a 440 × 720 floating panel.
Serve both from the same app URL and origin.
The observed form offered `LEFT_MENU_PANEL` and `RIGHT_MENU_ANALYSIS_PANEL`; verify the current choices, and open the floating view through a button action.
Use [the Buttons YAML template](../assets/buttons.yaml) for the host button.

A mini-view action can also use the experimental SDK call found in `src/forma.ts`:

```typescript
import { Forma } from "forma-embedded-view-sdk/auto";

export async function openFullPanel() {
  const url = new URL(window.location.href);
  url.searchParams.delete("fixture");
  url.searchParams.delete("state");
  await Forma.openFloatingPanel({
    embeddedViewId: "forma-extension-full",
    url: url.href,
    title: "Forma extension",
    preferredSize: { width: 440, height: 720 },
    minimumWidth: 360,
    placement: { type: "center" },
  });
}
```

Handle opening failures with a visible message and the host-button alternative.
Do not promise a host selection action: SDK 0.96.0 has no selection setter.

## State and fixture behavior

Keep loading, ready, empty, and error states usable at mini and full widths.
Reserve result space during refresh and keep controls in place.
Empty states name the missing input and the next action: draw a site limit, order context, draw a proposal building, or enable existing-building inclusion when the task supports it.
Errors preserve the failing operation and provide Refresh or another concrete recovery action.
Keep keyboard focus visible and validate any task-specified motion under `prefers-reduced-motion`.
The scaffold loads Forma Design System base styles and uses native HTML controls without custom styling or animation; it is a functional starting point, not a product visual design.
Before production, load the custom-element modules used by the view and replace applicable controls with Weave components documented in the Forma Design System Storybook.

Load the SDK dynamically only on the embedded path.
Outside an iframe, `?fixture=1` enables synthetic data without a host handshake; without that flag, display instructions to open the extension in Forma.
Ignore the fixture flag inside an iframe to avoid presenting synthetic results as project data.
Iframe detection alone does not authenticate a Forma host; arbitrary third-party embedding is not a supported test.

## Synchronization

The inspected SDK 0.96.0 implementation uses no host state-synchronization API between mini and floating views; verify whether a newer SDK provides one.
The worked example's `src/sync.ts` uses `BroadcastChannel` and falls back to `localStorage` plus its `storage` event when channel creation is unavailable.
Use a channel name specific to the extension and a message containing proposal id, root revision, timestamp, controls, and results.
Validate the payload shape, require the active proposal/root, and reject an older timestamp.
Render accepted results without recalculating or rebroadcasting them.
A newly opened view requests a matching snapshot from an existing peer before calculating its own.
Invalidate an unfinished local read when accepting a newer peer result.

The storage fallback writes and immediately removes a transient message; full geometry is not a durable cache.
Persist user controls separately under a proposal-scoped key when the task needs persistence.
When both transports fail, each view remains usable independently and displays the synchronization limitation.
Close channels and remove event listeners on teardown.

## Subscription and polling

The subscription API is **present**, not absent, in SDK 0.96.0.
`src/main.ts` supplies `Forma.proposal.subscribe` to the `autoRefresh` helper in `src/sync.ts`.
The declared callback receives `{ rootUrn }`, and the returned promise resolves to `{ unsubscribe }`.
It is deprecated in favour of `Forma.udm.subscribe`.

```typescript
import { Forma } from "forma-embedded-view-sdk/auto";

export async function subscribeToChanges(changed: (rootUrn: string) => void) {
  return Forma.proposal.subscribe(
    ({ rootUrn }) => changed(rootUrn),
    { debouncedPersistedOnly: true },
  );
}

export async function pathFingerprint() {
  const [rootUrn, proposalId] = await Promise.all([
    Forma.proposal.getRootUrn(), Forma.proposal.getId(),
  ]);
  const [sites, buildings] = await Promise.all([
    Forma.geometry.getPathsByCategory({ category: "site_limit", urn: rootUrn }),
    Forma.geometry.getPathsByCategory({ category: "building", urn: rootUrn }),
  ]);
  return JSON.stringify([
    proposalId, rootUrn, sites.length, [...sites].sort(),
    buildings.length, [...buildings].sort(),
  ]);
}
```

The source hashes the same fingerprint components; comparing the serialized value above has the same change-detection intent.
Its operational defaults are:

- Debounce persisted change callbacks by 600 ms.
- Give subscription setup 8 seconds; on rejection or timeout, begin polling every 4 seconds.
- Give fingerprint requests an 8-second timeout, skip overlapping polls, and log failures without replacing results with zero data.
- If a subscription resolves after fallback starts, unsubscribe it to prevent duplicate updates.
- Skip hidden-view polling, defer hidden-view changes, and check again when visible.
- On teardown, cancel timers, unsubscribe, remove visibility listeners, and ignore late callbacks.
- Keep manual Refresh available.

The root revision detects persisted geometry edits even when paths are unchanged.
Edits that change neither revision nor paths are invisible to this fallback.
The source includes synthetic fallback tests; live event delivery and background iframe visibility still require host verification.

## Overlay ownership

`Forma.render.addMesh` supports temporary meshes for status tints, height-excess boxes, and setback bands.
The worked example uses `Float32Array` positions, per-vertex `Uint8Array` RGBA colours, and a transform translating locally centred vertices into Forma's metric frame.
It uses known building base elevations; it omits an overlay when the base is unknown.
Its setback bands are illustrative flat strips, not terrain-draped geometry.

Only the calculating view renders its report's meshes; recipients clear their own meshes to avoid stacked transparent copies.
Serialize cleanup and replacement, and cancel stale jobs with a generation token.
Call `Forma.render.cleanup()` before replacement, after partial failure, and on teardown as a best-effort operation.
The SDK declaration promises host cleanup when an extension closes, but iframe ownership and unload behavior remain unverified in Forma.
If closing the calculating view removes its overlays, another view must calculate and render again.

The worked example's simple-ring mesh triangulator omits polygons with holes and reports a warning; numeric calculations retain holes.
That is an application renderer limitation, not a claim that the SDK cannot render such meshes.
Test actual placement, alpha blending, cleanup isolation, and view-close behavior in Forma.
