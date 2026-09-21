# Forma extension

A read-only Forma Site Design starter using vanilla TypeScript, Vite, and `forma-embedded-view-sdk` 0.96.0.
It displays the number of building paths in the current proposal and provides Refresh.
The summary includes context and proposal paths; it does not classify buildings or calculate geometry.

## Local development

Requires Node 20+ and npm.

```bash
npm install
npm run build
npm run dev
```

Vite uses port 5173 with `strictPort`; an occupied port is an error, not an automatic switch to another port.
Inspect any existing server before reusing or stopping it.

Open `http://localhost:5173/?fixture=1` outside Forma for synthetic data.
Use `&state=loading`, `&state=empty`, or `&state=error` to inspect those states; omit `state` for ready.
Retry exits the synthetic loading/error state and restores ready fixture data.
Standalone without the flag displays host instructions and does not initialize the SDK.
Inside an iframe the flag is ignored and the app reads the host proposal.

## Register in Forma

1. Use a Forma Site Design licence and an editable project with Design access.
2. Open **Extension menu → Add extension → ⚙ → Create extension**.
3. Set Name and Owner **Myself only** for personal development; sharing requires an APS application owner.
4. Add the project's `pro_…` authcontext or ACC project id under **Who are allowed**.
5. Set the embedded view URL to `http://localhost:5173` and select `RIGHT_MENU_ANALYSIS_PANEL`.
6. Paste `buttons.yaml` into **Integration → Buttons** for a 440 × 720 floating panel.
7. Save and verify the extension appears in the allowlisted project's **Add extension** list.

The other offered placement is `LEFT_MENU_PANEL`; floating is a button action, not a placement.
The right panel is approximately 190–240 px wide; add a mini summary there and keep task-specific controls in the floating view.
The starter uses unstyled native HTML controls and has no animation.

## Verification record

- [ ] Dependency installation and production build pass; record Node and SDK versions and build output.
- [ ] Standalone fixture states and Refresh work without SDK initialization.
- [ ] Ready/empty/error/loading states fit 190, 240, and 440 px; keyboard focus remains visible.
- [ ] Live project registration, allowlist, embedded view, and floating button work.
- [ ] Overture context and a drawn proposal building are present; record actual paths and geometry providers after implementing them.
- [ ] After adding automatic refresh, verify subscription and the 4-second polling fallback.
- [ ] After adding shared controls/results, verify cross-view synchronization and proposal isolation.
- [ ] After adding overlays, verify placement, cleanup, and removal when their creating iframe closes.

Record fixture and live results separately, with any remaining host checks.
The generated starter has not been verified inside Forma.
