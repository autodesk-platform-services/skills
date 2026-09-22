# Elements and geometry

The API names below match `forma-embedded-view-sdk` 0.96.0 and the worked example's `src/forma.ts`.
The supplied live observations establish context/native element shapes; successful alternative geometry providers still require verification against the target project's elements.

## Snapshot and response shapes

Wait for `Forma.proposal.awaitProposalPersisted()`, then capture `getRootUrn()` and `getId()`.
Pass `urn: rootUrn` to geometry calls and `rootUrn` to `elements.getByPath`.
`elements.get` and `getByPath` return `{ element, elements }`; `elements` contains bundled elements that can be reused when resolving children.
Recheck root and proposal id after acquisition, including calls such as `getWorldTransform` that have no root argument.
Reject a mixed-revision snapshot with a Refresh action.
These proposal calls are deprecated in favour of `Forma.udm.*` but remain available in 0.96.0.

Use category `"building"` for buildings and `"site_limit"` for site limits.
Deduplicate paths and count only top-level building paths when nested category-building paths exist.

## Observed element shapes

| Property | Existing/context building | Drawn proposal building |
| --- | --- | --- |
| Path | `root/<groupKey>/<key>` | `root/<key>` |
| Element URN | `urn:adsk-forma-elements:basic:…` | `urn:adsk-forma-elements:basicbuilding:…` |
| Parent | `urn:adsk-forma-elements:group:<pro>:base:<rev>` | Proposal root |
| Properties | `geometry_hash`, `category`, `name` (`Building #N`), `elevationDefinition`, `heightDefinition` | `{category: "building"}` |
| Direct footprint | Readable XY ring | Observed `undefined` |
| Floors | No observed floor count | Exact count from valid graph levels when available |

The context elevation definitions include MAGL or MASL; the observed height definition is MAGL.
Do not infer model floors from those property names.
Context SDK area metrics returned zero, which is not evidence of zero footprint area or known GFA.

## Ancestry discriminator

Classify from ancestors before applying any existing-building inclusion control.
The root's `properties.flags[<groupKey>].base === true` marks the observed base group.
An ancestor URN matching `/:group:[^:]+:base:/` also establishes existing context.
Walk children by `key`, reuse bundled elements, and cache additional `elements.get({ urn })` results per snapshot.
Unresolved ancestry must produce an error instead of a guess.

This minimal classifier uses the same API names and base checks as the worked example:

```typescript
import { Forma } from "forma-embedded-view-sdk/auto";

type Tree = Awaited<ReturnType<typeof Forma.elements.get>>;

export async function buildingKind(tree: Tree, path: string) {
  const root = tree.element;
  const keys = path.split("/").slice(1, -1);
  const baseGroup = /:group:[^:]+:base:/;
  if (baseGroup.test(root.urn) ||
      keys.some(key => root.properties?.flags?.[key]?.base === true)) {
    return "existing";
  }
  const elements: Tree["elements"] = { ...tree.elements, [root.urn]: root };
  let parent = root;
  for (const key of keys) {
    const child = parent.children?.find(item => item.key === key);
    if (!child) throw new Error(`Cannot resolve building ancestor: ${path}`);
    if (baseGroup.test(child.urn)) return "existing";
    if (!elements[child.urn]) {
      const fetched = await Forma.elements.get({ urn: child.urn });
      Object.assign(elements, fetched.elements, { [child.urn]: fetched.element });
    }
    parent = elements[child.urn];
  }
  return "proposal";
}
```

For bulk reads, share the cache and in-flight fetches across classifier calls as the worked example does.
The building's own URN is not the discriminator: observed Overture URNs contain neither `overture` nor `integrate`.

## Geometry acceptance order

The direct footprint can be requested first to capture the diagnostic result while choosing a better representation later.

| Priority | Provider | Acceptance rule |
| --- | --- | --- |
| 1 | `elements.representations.graphBuilding({ urn })` | Native `basicbuilding` or advertised graph; valid levels, loops, and world transform |
| 2 | `elements.representations.grossFloorAreaPolygons({ urn })` | Native or advertised representation; valid floor polygons and elevations |
| 3 | `geometry.getFootprint({ path, urn: rootUrn })` | Prefer at this stage for non-native/context elements |
| 4 | Direct child footprints | Union a complete readable set; use child keys in paths |
| 5 | `geometry.getTriangles({ path, urn: rootUrn })` | Union non-degenerate XY projections of all triangles |
| 6 | Direct native footprint | Accept a readable native footprint only after preferred providers fail |

Catch provider errors independently and retain exact error text and return shape, including `undefined`.
If every provider fails, keep the building with unknown footprint, unknown membership, and incomplete totals.

### Graph and floor representations

`elements.floorStack` exposes `createFromFloors` and `createFromFloorsBatch` in 0.96.0; it has no floor reader.
Use `elements.representations.graphBuilding({ urn: element.urn })` to read ordered `data.levels`.
Each level has `points`, `surfaces`, `spaces`, and `height`.
Resolve each space's `outerLoop` and `innerLoops` through surface ids and `directionAToB`; validate loop continuity.
`level.points` is an indexed point collection, not an ordered perimeter.
Apply `elements.getWorldTransform({ path })` to local polygons; the worked example rejects invalid or tilted transforms for its horizontal-floor calculation.
Union spaces on each level, sum plate areas net of holes, and union all level polygons for the footprint.
The floor count is `levels.length`; sum the scaled level heights for the stack height.

`grossFloorAreaPolygons` supplies `data[].grossFloorPolygon` (outer ring plus holes) and `elevation`.
Distinct elevations supply model floor count, but this representation has no floor heights and cannot establish the last-floor top alone.
Do not invent a final storey height.

### Footprints and child paths

```typescript
import { Forma } from "forma-embedded-view-sdk/auto";

export async function readFootprint(path: string, rootUrn: string) {
  const footprint = await Forma.geometry.getFootprint({ path, urn: rootUrn });
  if (footprint?.type !== "Polygon") return undefined;
  return footprint.coordinates;
}
```

The returned polygon coordinates are a plain `[x,y]` ring in local metres; they are not nested GeoJSON rings.
Validate finite coordinates, nonzero area, and ring topology before calculation.
The direct footprint cannot describe holes or multipart geometry.
Native floor children may have paths `root/<key>/0`, `root/<key>/1`, and category `floor`; enumerate actual child keys rather than guessing a range.
`getFootprint` does not traverse children; a partial child union must not be treated as the whole building.

### Triangle fallback and unknown measurements

`getTriangles` traverses children and returns flat `Float32Array` XYZ triangles.
Project each triangle onto XY, discard zero-area projections, and union the results in bounded batches.
Preserve holes and disconnected pieces; a convex hull or bounding rectangle changes the footprint.
Mesh height is `maxZ - minZ`, and `minZ` supplies the overlay base when the mesh is valid in the expected frame.
Triangle geometry does not establish a floor count.
The worked example's `ceil(height / 3.5)` is an explicitly labelled estimate, not an SDK fact or this skill's default.
Its `properties.height` fallback is unverified; do not assume that property exists or establishes a base elevation.

## Diagnostic evidence

Record the SDK version, proposal/root revision, building path, ancestor classification, element type, child keys/categories, attempted providers, and exact errors.
For successful geometry, record the accepted provider and whether floors/areas are model-derived, estimated, or unknown.
The worked example's graph fixture has three levels of 3, 4, and 2.5 m and areas of 120, 80, and 48 m²: 3 model floors, 248 m² GFA, 120 m² footprint, and 9.5 m height.
Those fixture measurements validate the adapter only; they do not establish representation availability in a live proposal.
