# P9. Fragment-level visibility → instance visibility states

- Object-level: keep `viewer.hide`/`show`/`isolate`/`setGhosting` (documented, unchanged).
- Sub-object or custom content:
  `instances.setVisibilityState(id, avs.VisibilityState.Hidden)` hides an instance. Pass
  `avs.VisibilityState.Ghosted` or `avs.VisibilityState.Visible` instead for those states.
- Replace `viewer.impl.visibilityManager.setNodeOff`, `model.getFragmentList().setVisibility`, and
  `setFragOff`.
