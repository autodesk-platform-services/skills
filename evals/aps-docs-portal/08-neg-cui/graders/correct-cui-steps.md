---
type: llm
focus: last_message
weight: 1
---
Score PASS only if ALL of these hold:
1. It says to open the editor with the `CUI` command (or Manage tab → Customization → User Interface).
2. It describes creating a new command in the Command List pane and setting its Macro (e.g. `^C^C_MYCOMMAND`), optionally name/image.
3. It describes adding the command to a ribbon panel (dragging it into a panel row under Ribbon → Panels, creating a panel/tab if needed, and making sure the panel is on a tab in the workspace).
4. It ends with Apply/OK to save.
5. It does not point the user to APS / Autodesk Platform Services web APIs.
