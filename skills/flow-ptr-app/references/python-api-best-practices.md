# Python API best practices (shotgun_api3 / sgtk)

Guide: https://help.autodesk.com/view/SGDEV/ENU/?guid=SGD_py_python_api_best_practices_html

**Performance**
- Don't request fields you don't need in `sg.find(...)` — extra fields add overhead.
- Make filters as specific as possible; filter in the API query rather than fetching everything
  and parsing/filtering the results in Python.
- Exact-match filters (`is`) perform better than partial-match filters (`contains`).
- For linked entities, requesting the bare `entity` field already gives you type/id/name for
  free. Only use dot notation (`entity.Asset.code`) when you need a field beyond those three, since
  it's slower.

**Control and debugging**
- Use a separate API key per script/tool — invaluable for debugging.
- Every script should have an owner/maintainer kept current on the Scripts page (Admin menu).
- Consider a read-only permission group for API users that only need read access, to limit
  exposure to accidental writes.
- Track which keys are actually in use so old/retired scripts' keys can be removed (some studios
  log this in their API wrapper).
- Don't assume you can predict a field's API name from its UI display name (they can differ and
  the display name can change) — look it up under Admin > Fields, or via `schema_read()`,
  `schema_field_read()`, `schema_entity_read()`.

**Design**
- For larger studios, consider an API isolation layer/wrapper so tools are shielded from API
  changes and access/debugging/auditing can be centralized without touching the API itself.
- Use the latest API version for its bug fixes and performance improvements — same rationale as
  using the latest engine version for a pinned engine.
- Be aware of where the script runs: something on a render farm calling PTR thousands of times a
  minute can hurt site performance — put a read-only caching layer in front of it.
- You can turn off event generation for scripts that run very often and whose events you won't
  need to track later — recommended for high-frequency scripts, since otherwise the event log can
  grow very large. Conversely, this is a togglable setting on the script's API key ("Generate
  Events") — if your app needs to create events (see "Triggering custom events" in SKILL.md) and
  nothing is showing up, check that this is enabled for the key it authenticates with.
