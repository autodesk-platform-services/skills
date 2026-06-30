---
name: acad-cuix-builder
description: "Generate AutoCAD CUIX files with ribbon UI, extended tooltips, and optional F1 help from prompts. Supports buttons, CHM help files, and bundle deployment. No XML editing required."
argument-hint: "Describe the plugin with panels, buttons, and optional help files (e.g. 'drafting tools with zoom and layer commands, help file at help/DraftingTools.chm')"
compatibility: "Windows only. Requires CuixBuilder.exe (see install.ps1) OR .NET SDK 10.0."
---

# AutoCAD CUIX Builder

Conversational skill that generates AutoCAD CUIX files with **ribbon UI**, **extended tooltips**, and **optional F1 help**. No manual XML editing. Works great with or without help files — it's up to you!

Architecture reference: see `references/cuix-architecture.md`.

---

## Step 0 — Verify generator is available

Run in PowerShell:

```powershell
$exe = "$env:USERPROFILE\.cuixbuilder\CuixBuilder.exe"
if (Test-Path $exe) { Write-Host "exe found: $exe" }
elseif (Get-Command dotnet -ErrorAction SilentlyContinue) { dotnet --version }
else { Write-Host "Neither found — see install.ps1" }
```

- **exe found** → use `& $exe <config.json>` in Step 5
- **dotnet SDK** → use `dotnet run --project <src-path> -c Release -- <config.json>` in Step 5
- **neither** → tell user to run `install.ps1` first (downloads exe, no SDK needed)

---

## Step 1 — Collect plugin identity

Ask:
- **Plugin display name** — shown as ribbon tab and group label (e.g. `Drafting Tools`)
- **Internal name** — derive from display name, no spaces (e.g. `DraftingTools`)

---

## Step 2 — Collect panels

Ask:
- How many ribbon panels?
- Name of each panel (e.g. `Annotation`, `View`)

---

## Step 3 — Collect buttons (per panel)

For each panel, for each button ask:
- **Label** — text on the button (e.g. `Quick Leader`)
- **Command** — one of:
  - Bare AutoCAD command: `QLEADER` → generator adds `^C^C` automatically
  - LISP expression: `(alert "hi")` → generator adds `^C^C` automatically
  - Pre-formatted: `^C^CMYCOMMAND` → used as-is
- **Image** — path to `.bmp` file, or Enter/`skip` → auto-generates a colored 16×16 placeholder. If the user provides an image path, check that the file exists and ends with `.bmp` before writing the config. If the path is invalid or the extension is wrong, warn the user and offer to use a placeholder instead.
- **Tooltip** — optional hover text (defaults to label)

---

## Step 4 — Output path

Ask where to save the `.cuix` file.  
Default: current directory + `<PluginName>.cuix`

---

## Step 5 — Confirm, build JSON, generate

Show a summary table:
```
Plugin : <DisplayName>   Tab : <Tab>   Output : <path>

Panel: <name>
  [1] <label>  →  <command>   image: <file or "placeholder blue">
  [2] ...
```

Confirm with user, then build the JSON config:

```json
{
  "pluginName": "NoSpaces",
  "displayName": "Human Name",
  "tab": "Tab Label",
  "outputPath": "C:\\full\\path\\Plugin.cuix",
  "panels": [
    {
      "name": "Panel Name",
      "buttons": [
        {
          "label": "Button Label",
          "command": "raw input",
          "imagePath": null,
          "tooltip": "Optional"
        }
      ]
    }
  ]
}
```

Write config with an explicit timestamp to `$env:TEMP`, then run:

```powershell
$configPath = "$env:TEMP\cuix_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
# ... write config to $configPath ...

# With exe (preferred)
& "$env:USERPROFILE\.cuixbuilder\CuixBuilder.exe" $configPath

# With SDK fallback
dotnet run --project "$env:USERPROFILE\.cuixbuilder\src\CuixBuilder" -c Release -- $configPath
```

---

## Step 6 — Report result

On success:
```
Done: <outputPath>
In AutoCAD: CUILOAD → browse to <outputPath>
```

On failure: show stderr and diagnose (common: missing exe, wrong path, invalid JSON).

---

## Command normalization

| User types | Becomes |
|---|---|
| `QLEADER` | `^C^CQLEADER` |
| `zoom e` | `^C^CZOOM E` |
| `(alert "Hi")` | `^C^C(alert "Hi")` |
| `^C^CMYCOMMAND` | `^C^CMYCOMMAND` (unchanged) |

---

## Placeholder icon colors (auto-generated when no image provided)

Index cycles 0→7 across all buttons in the CUIX.

| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Blue | Green | Orange | Purple | Teal | Red | Amber | Cyan |

---

## F1 Help Integration (OPTIONAL)

Two ways to add F1 help:

**Option A: Pre-compiled CHM (fastest)**
- You have: `DraftingTools.chm` (already compiled)
- Skill bundles it as-is
- Configure: `"chmPath": "C:\\path\\to\\DraftingTools.chm"`

**Option B: AI generates HTML files from text (easiest, no compilation)**
- You have: Simple text file with command descriptions
- AI parses text → generates HTML files with anchors → creates config → invokes CuixBuilder
- No CHM compilation, no HTML Help Workshop needed
- CuixBuilder automatically bundles the generated HTML files directly into the CUIX archive — no additional compilation step required.
- **Recommended: simplest path**

**Option C: No help (for now)**
- Omit help fields
- Add help later by re-running

### Config format

**Minimal (no help):**
```json
{
  "pluginName": "DraftingTools",
  "displayName": "Drafting Tools",
  "tab": "Drafting Tools",
  "panels": [...]
}
```

**With pre-compiled CHM:**
```json
{
  "pluginName": "DraftingTools",
  "displayName": "Drafting Tools",
  "tab": "Drafting Tools",
  "chmPath": "C:\\path\\to\\DraftingTools.chm",
  "lispPath": "C:\\path\\to\\commands.lsp",
  "panels": [...]
}
```

---

## Workflow: AI generates HTML help (Option B)

**Step 1: Provide help.txt**

You provide the skill with a simple text file:
```
ZOOMSEL
Zoom to selected objects and fit in viewport
Type ZOOMSEL and press Enter, all selected geometry fits in view

LAYISO
Isolate the layer of a picked object
Type LAYISO, pick an object on target layer, that layer becomes isolated
```

**Step 1a: Validate help.txt entries**

Before generating HTML files, the skill validates that each help.txt entry contains at least a command name and one description line. If an entry is malformed or the file is empty, the skill informs you: "The help.txt entry for [entry] is missing required fields (command name and description). Please provide at least a command name on line 1 and a short description on line 2 for each entry." The skill will not generate HTML files for invalid entries.

**Step 2: AI generates HTML files**

The skill parses and creates:
- `zoomsel.htm` with anchor `<a id="zoomsel"></a>`
- `layiso.htm` with anchor `<a id="layiso"></a>`
- `index.htm` linking all topics together

These files are written to `$env:TEMP\cuix_help_<pluginName>\` (e.g., `$env:TEMP\cuix_help_DraftingTools\`). This folder path will be referenced in the config as `helpSourcePath` so CuixBuilder can locate the files.

**Step 3: Skill generates config.json**

No CHM file — just reference the HTML output folder:

```json
{
  "pluginName": "MyPlugin",
  "displayName": "My Plugin Name",
  "tab": "My Tab",
  "helpSourcePath": "C:\\Users\\username\\AppData\\Local\\Temp\\cuix_help_MyPlugin\\",
  "panels": [
    {
      "name": "Panel Name",
      "buttons": [
        {
          "label": "Command Name",
          "command": "COMMANDNAME",
          "imagePath": "C:\\icons\\icon.bmp",
          "tooltip": "Hover text",
          "helpTopic": "commandname"
        }
      ]
    }
  ]
}
```

⚠️ **Key difference from Option A**: No `chmPath` needed. CuixBuilder bundles the HTML files directly into the CUIX archive.

**Step 4: Skill invokes CuixBuilder**

```powershell
# CuixBuilder automatically copies HTML files into the bundle
& "$env:USERPROFILE\.cuixbuilder\CuixBuilder.exe" $configPath
```

CuixBuilder packages:
- Generated HTML files (with anchors)
- LISP commands (if provided)
- Button images
- PackageContents.xml with F1 routing

**Step 5: Test in AutoCAD**
- F1 on ribbon → opens help
- Type `ZOOMSEL`, F1 → opens help
- Done! ✅

### Generated outputs (Option B only)

1. **HTML help files** — No compilation step
   - Skill generates `zoomsel.htm`, `layiso.htm`, etc.
   - Each file includes `<a id="commandname"></a>` anchor
   - Clean, simple HTML — users can edit later

2. **PackageContents.xml** — F1 routing configured
   - `<Command HelpTopic="zoomsel" />` entries
   - AutoCAD F1 resolves to correct HTML anchor

3. **CUIX MenuGroup** — Ribbon buttons linked
   - `HelpTopic="zoomsel"` on each button
   - Works with tooltips and images

4. **Ready-to-deploy bundle**
   - HTML files embedded in CUIX
   - No external CHM dependency
   - F1 works immediately in AutoCAD

---

## Requirements

**Option A: Pre-compiled CHM**
- Provide an existing `.chm` file (any name)
- CuixBuilder bundles it as-is
- No compilation, no dependencies
- ✅ Fast if you already have a CHM

**Option B: AI generates HTML**
- Provide help.txt with command descriptions
- Skill generates HTML files with anchors
- CuixBuilder bundles HTML directly
- ✅ No compilation step, no hhc.exe needed, no dependencies
