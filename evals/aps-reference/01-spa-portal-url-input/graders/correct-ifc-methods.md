---
type: llm
focus: last_message
weight: 3
---
Score PASS only if ALL of these hold:
1. It names the four IFC conversion methods: `legacy`, `modern`, `v3`, and `v4`.
2. It says `legacy` is used by default when `conversionMethod` is omitted.
3. It says Autodesk recommends `v4` (e.g. for full IFC 4.3 support / automatic handling of large coordinates).
4. It does not claim it was unable to read the page, and does not invent other conversion methods.
FAIL if any item is missing or wrong.
