# P17c. Preferences, settings, and the `Private` namespace (P17)

Part of P17 (`P17-internal-and-removed-apis.md`). Every hit is a required change.

| v7 | v8 |
| --- | --- |
| `viewer.prefs` | `viewer.getPreferences()` (`get`, `set`, `addListeners`, `removeListeners`) |
| `GuiViewer3D#setPropertiesOnSelect(value)` | `viewer.getPreferences().set(av.Prefs.OPEN_PROPERTIES_ON_SELECT, value)` |
| `av.Private.Prefs`, `Prefs2D`, `Prefs3D`, `Preferences` | `av.Prefs`, `av.Prefs2D`, `av.Prefs3D`, `av.Preferences` |
| `av.Private.PropDbLoader`, `av.Private.PropertyDatabase` | `av.PropDbLoader`, `av.PropertyDatabase` |
| `av.Private.VIEW_TYPES`, `av.Private.FPS_TARGET_MODES` | `av.VIEW_TYPES`, `av.FPS_TARGET_MODES` |
| `new Autodesk.Viewing.Private.GuiViewer3D(...)` | `new Autodesk.Viewing.GuiViewer3D(...)` (documented). Common in older samples. |
| `Private.logger`, `Private.analytics` | Drop. Not documented; use `console` or the app's own logging. |
| `Private.OptionSlider`, `Private.OptionDropDown`, `Private.formatValueWithUnits` | Not documented. Build the control with the documented `UI` classes or plain DOM; format units with `model.getDisplayUnit()` and your own formatter. Report it if the user needs the helper itself. |

Other members of `Autodesk.Viewing.Private` aren't documented in v8 (the namespace has no reference
page). Treat any remaining `av.Private.*` use as internal: map it to a documented member or report it.

Behavior changes with no rename (review the calling code, don't just search and replace):

- Preferences (`Prefs`, `Prefs2D`, `Prefs3D`) and `VIEW_TYPES`, `FPS_TARGET_MODES`, `AttributeType`
  are frozen. Code that adds or overwrites keys on them throws in strict mode.
- `Preferences#removeListeners(name)` without callbacks no longer removes all listeners of the
  preference. Pass the callbacks you registered.

## Viewer settings and lifecycle

Documented on `Viewer3D` in v8: `setQualityLevel(useSAO, useFXAA)`, `setSwapBlackAndWhite`,
`setEnvMapBackground`, `setGhosting`, `setDisplayEdges`, `setGroundShadow*`, `setLightPreset`,
`setBackgroundColor`, `setTheme`, `setProgressiveRendering`, `setOptimizeNavigation`,
`setScreenSpaceLineWidth` (WebGPU only), `tearDown`, and `setUp`. Keep them.

Not documented in v8, or removed with the "Ground Reflection" setting: `setScreenMode` on
the viewer, `showModelStructurePanel` (use the Model Structure extension), and
`Private.Prefs3D.GROUND_REFLECTION` (removed with the Prefs rename above). `setGroundReflection`,
`setGroundReflectionAlpha`, and `setGroundReflectionColor` are still on the reference page even
though the setting is removed; treat them as no-ops and don't rely on them (B13).

`viewer.restoreState(state)` with a state saved on v7 may carry render options (tone mapping,
`renderOptions`, or a `seedURN` from another model) that mean nothing to the WebGPU renderer. Test
restoring saved states early, and re-save them from v8 where they matter.
