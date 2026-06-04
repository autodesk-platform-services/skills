---
name: acad-cuix-builder
description: "Generate an AutoCAD partial CUIX file from prompts. Collects plugin name, ribbon panels, buttons, and LISP/command macros — then builds a ready-to-CUILOAD .cuix file with properly embedded BMP icons."
argument-hint: "Describe the plugin (e.g. 'drafting tools with a Quick Leader button and a Zoom Extents button')"
compatibility: "Windows only. Requires CuixBuilder.exe (see install.ps1) OR .NET SDK 10.0."
---

# AutoCAD CUIX Builder

Conversational skill that generates a partial AutoCAD CUIX file. No manual XML editing.

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
- **Image** — path to `.bmp` file, or Enter/`skip` → auto-generates a colored 16×16 placeholder
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

Write config to `$env:TEMP\cuix_<timestamp>.json`, then run:

```powershell
# With exe (preferred)
& "$env:USERPROFILE\.cuixbuilder\CuixBuilder.exe" $configPath

# With SDK fallback
dotnet run --project "<path-to-src>" -c Release -- $configPath
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
