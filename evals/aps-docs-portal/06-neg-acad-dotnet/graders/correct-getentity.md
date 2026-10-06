---
type: llm
focus: last_message
weight: 1
---
Score PASS only if ALL of these hold:
1. It uses `Editor.GetEntity` (typically with `PromptEntityOptions`), getting the editor from the active document (`Application.DocumentManager.MdiActiveDocument.Editor`).
2. It checks `PromptEntityResult.Status == PromptStatus.OK` before using the result.
3. It reads the id from `PromptEntityResult.ObjectId`.
4. It does not point the user to APS / Autodesk Platform Services web APIs.
