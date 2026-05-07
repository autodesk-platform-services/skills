# Usage Guide

## Quick start — your first ARX project

```powershell
mkdir todo-mfc-app
cd todo-mfc-app
code .          # open in VS Code
```

Open GitHub Copilot Chat (`Ctrl+Alt+I`) and type:

> Create an ObjectARX ARX application called TodoMfc with MFC shared support, output to the current folder

The agent reads the skill, runs the scaffold script, and confirms the generated files.
Open the `.vcxproj` in Visual Studio 2026 and build (`Ctrl+Shift+B`).

---

## Useful prompts — copy, paste, adapt

### New full project

```
Create an ObjectARX ARX project called MyPlugin, MFC shared, in C:\Dev
```
```
Create a DBX custom object library called MyEntLib, no MFC, output to C:\Dev
```
```
Create an ARX plugin called ComServer with MFC shared and ATL COM support in C:\Dev
```
```
Create a CRX constraint runtime plugin called MyConstraint, no MFC, in C:\Dev
```
```
New ARX project called MfcExtPlugin using MFC extension DLL mode, output C:\Dev
```

### Add a Jig

```
Add a Jig class CLineJig that jiggles an AcDbLine with 2 input points
into C:\Dev\MyPlugin
```
```
Add a Jig for AcDbCircle with 3 inputs called CCircleJig, put it in my project folder
```

### Add a Reactor

```
Add an AcDbDatabaseReactor class CMyDbReactor to C:\Dev\MyPlugin
```
```
Add an AcEdInputContextReactor class CInputSpy to my project
```
```
Add a layout manager reactor class CLayoutWatcher to C:\Dev\MyPlugin
```

### Add a Custom Object (AcDbEntity subclass)

```
Add a custom object class CMyLine based on AcDbEntity with DWG/DXF protocol support,
put it in C:\Dev\MyPlugin
```
```
Add a custom object CMyBlock derived from AcDbBlockReference with all protocols,
output to C:\Dev\MyPlugin
```

### Add an MFC dialog or palette

```
Add an MFC Dialog class CMySettingsDlg with resource ID IDD_SETTINGS
to C:\Dev\MyPlugin
```
```
Add an MFC modeless palette class CMyPalette to C:\Dev\MyPlugin
```

### Add a .NET managed wrapper

```
Add a .NET managed wrapper MyManagedLine for custom object CMyLine,
company namespace Acme, object namespace MyPlugin, in C:\Dev\MyPlugin
```

### Add a COM wrapper (ATL)

```
Add a COM wrapper for custom object MyLine, short name MyLine,
into C:\Dev\MyPlugin
```

### Add a Dynamic Property (ATL)

```
Add a dynamic property class CMyDynProp to C:\Dev\MyPlugin
```

---

## IDE-specific: where to open the chat

| IDE | How to open AI chat |
|---|---|
| **VS Code** | `Ctrl+Alt+I` → Copilot Chat panel |
| **Visual Studio 2026** | View → GitHub Copilot Chat |
| **Cursor** | `Ctrl+L` (chat) or `Ctrl+K` (inline) |
| **Claude Code** | Just type in the terminal — `CLAUDE.md` is the context file |

---

## After scaffolding — next steps in Visual Studio

1. Open the `.vcxproj` (or double-click the `.sln` if generated)
2. For **add-on files** (Jig, Reactor, etc.): right-click the project → **Add → Existing Item** → select the generated `.h` and `.cpp`
3. Set `ARXSDK` environment variable if not already set:
   ```
   ARXSDK=D:\SDKS\ARX2027
   ```
   Or edit `Autodesk.arx-2027.props` directly in the project folder.
4. Build → `x64 / Debug` → confirm `.arx`, `.dbx`, or `.crx` is produced under `x64\Debug\`

---

## Troubleshooting

| Error | Fix |
|---|---|
| `Cannot open include file 'acdb.h'` | Set `ARXSDK` env var or edit `Autodesk.arx-2027.props` |
| `Scripts blocked / cannot be loaded` | Run: `powershell.exe -Command "Set-ExecutionPolicy -Scope CurrentUser RemoteSigned"` |
| `skill not found` / agent ignores skill | Run `npx github:ADN-DevTech/acad-arx-wizard-skill` to (re)install |
| VS 2026 wizard dialog is broken | That is the VS bug this skill replaces — use the prompts above instead |
