# Gotchas and evidence boundaries

## Troubleshooting

| Symptom | Observed cause or check | Action |
| --- | --- | --- |
| Create extension is unavailable | Membership without Design access is insufficient | Use a licensed hub/project with edit access |
| Create a new hub is disabled | The observed account is not a contract manager | Check licence/hub access; a personal Site Design licence creates its own hub |
| Another person cannot see the extension | Owner is Myself only | Change Owner to an APS application for sharing |
| Add extension does not list it | The project is absent from Who are allowed | Add the project's authcontext or ACC project id |
| Floating placement cannot be found | The form offers only left-menu and right-analysis placements | Use `OPEN_FLOATING_PANEL` in Buttons YAML |
| YAML changes order after saving | Forma serializes actions before label | Compare values, not key order |
| Local embedded URL is assumed to need TLS | HTTP localhost worked in the observed project | Use `http://localhost:5173` for this local workflow |
| Controls overflow the right panel | Content width is about 190–240 px | Use mini results and a 440 × 720 floating panel for controls |
| Save spins and links disappear | Invalid/not-yet-existing GitHub URL or mailto attempt did not persist | Validate the URL and reopen the form to verify persistence |
| No icon uploader is visible | The observed Presentation form has none | Do not invent an icon field |
| A fresh site returns no buildings | Context has not been ordered and none have been drawn | Order free Overture data and draw a native test building |
| Building query returns nothing | Some declaration examples use an inconsistent plural | Use category `"building"` |
| Context gets counted as proposal | Its URN contains neither overture nor integrate | Inspect root base flags and ancestor group URNs |
| Overture reports zero area metrics | Context metrics returned zero in the live observation | Measure available geometry; keep unavailable GFA unknown |
| A drawn building has no footprint | Native basicbuilding returned undefined from getFootprint | Try graph/GFA representations, child footprints, then triangle projection |
| Native building has no height/floors properties | Observed properties contain only category | Read geometry/representations, not invented property keys |
| floorStack has no getFloors | SDK 0.96.0 exposes only creation methods there | Read `elements.representations.graphBuilding` |
| Footprint parsing produces nonsense | A plain XY ring was treated as nested GeoJSON | Use polygon.coordinates as the ring, in local metres |
| Child path does not resolve | URN fragments were used as path segments | Append actual child keys |
| Footprint omits child geometry | getFootprint does not traverse children | Read children or use getTriangles, which traverses them |
| Graph footprint is malformed | Level points were treated as a perimeter | Reconstruct space loops through surfaces and edge directions |
| SDK selection action cannot be implemented | No selection setter exists in 0.96.0 | Avoid promising programmatic host selection |
| Proposal methods show deprecation warnings | The methods remain available but UDM supersedes them | Keep the tested calls for 0.96.0; verify UDM signatures before migration |
| Automatic refresh is unavailable | Subscription setup failed or timed out | Poll the proposal/root/path fingerprint every 4 seconds and retain Refresh |
| Geometry edits are not detected by polling | Neither revision nor paths changed | Use manual Refresh; do not claim full event coverage |
| Mini and floating controls diverge | They run in separate iframes with no host sync | Use validated proposal-scoped channel/storage messages |
| Tints double in opacity | Both views rendered the same report | Give overlay ownership to the calculating view |
| Tints disappear after closing the full view | Its iframe owned those meshes | Recalculate/render in a surviving view |

## Source precedence

The supplied specification records live observations in Forma Site Design, EU region, on 2026-09-20/21 with SDK 0.96.0.
The local source materials are the worked example's `NOTES.md`, `src/forma.ts`, `src/sync.ts`, `src/render.ts`, and `README.md`.
Read later corrections in NOTES before relying on earlier entries or the example README.

- The v2.2 ancestry correction replaces the earlier `integrate`/`overture` URN heuristic still mentioned in the example README.
- The refresh section replaces earlier manual-refresh-only notes; the subscription exists, with polling as a compatibility fallback.
- The native-geometry section replaces the earlier behavior that skipped unreadable native buildings.
- The source executor's synthetic tests do not establish live representation availability, coordinate placement, or host event delivery.

The live native observation establishes `basicbuilding`, sparse properties, and the direct-footprint failure.
The alternative provider chain is implemented and synthetically tested in the worked example; inspect the target project's returned representations before claiming live success.
The supplied live spec establishes iframe overlay lifetime and same-origin view separation; runtime cleanup, synchronization transports, and actual rendered placement remain items to verify in a new extension.
The 0.96+ compatibility field is not a claim that every later SDK has been tested.
