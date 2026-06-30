---
name: acad-cuix-builder
description: "Generate a complete AutoCAD .bundle (CUIX ribbon + extended tooltip GIFs + LISP + PackageContents) from a plain-English prompt. No XML editing required."
argument-hint: "Describe the plugin: panels, buttons, commands, tooltip GIFs, and optional LISP file (e.g. 'drafting tools with zoom selection and layer isolate commands, GIF tooltips, lispPath at D:/demo/DraftingTools.lsp')"
compatibility: "Windows only. Requires CuixBuilder.exe (install via install.ps1) OR .NET SDK 10.0."
---

# AutoCAD CUIX Builder

Conversational skill that generates a complete AutoCAD `.bundle` folder:
- Ribbon tab + panels + buttons (CUIX)
- Extended tooltips with GIF animations (XAML)
- LISP command file (copied from `lispPath`)
- `PackageContents.xml` — AutoCAD plugin manifest

Drop the bundle in `%APPDATA%\Autodesk\ApplicationPlugins\` and AutoCAD auto-loads on next startup.

Architecture reference: see `references/cuix-architecture.md`.

---

## Step 0 — Verify generator is available

```powershell
$exe = "$env:USERPROFILE\.cuixbuilder\CuixBuilder.exe"
if (Test-Path $exe) {
    & $exe --help          # shows all config fields
} elseif (Get-Command dotnet -ErrorAction SilentlyContinue) {
    dotnet --version
} else {
    Write-Host "Neither found — run install.ps1 first"
}
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
  - LISP expression: `(c:ZOOMSEL)` → generator adds `^C^C` automatically
  - Pre-formatted: `^C^CMYCOMMAND` → used as-is
- **Image** — path to `.bmp` file (16×16), or Enter/`skip` → auto-generates colored placeholder. Verify file exists and ends in `.bmp` before writing config.
- **Tooltip** — short hover text (defaults to label)
- **Tooltip description** — optional extended body text shown in expanded tooltip
- **Tooltip GIF** — optional path to `.gif`/`.png` animation shown in expanded tooltip (recommended: 300×187px, <30KB)

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
  "pluginName": "DraftingTools",
  "displayName": "Drafting Tools",
  "tab": "Drafting Tools",
  "outputPath": "C:\\full\\path\\DraftingTools.cuix",
  "acadDir": "C:\\Program Files\\Autodesk\\AutoCAD 2027",
  "lispPath": "C:\\full\\path\\DraftingTools.lsp",
  "panels": [
    {
      "name": "Panel Name",
      "buttons": [
        {
          "label": "Zoom Selection",
          "command": "(c:ZOOMSEL)",
          "imagePath": "C:\\icons\\zoomsel.bmp",
          "tooltip": "Zoom to selected objects",
          "tooltipDescription": "Zooms viewport to fit current selection set.",
          "tooltipImage": "C:\\icons\\zoomsel.gif"
        }
      ]
    }
  ]
}
```

- `acadDir` — AutoCAD install dir, used to detect R-series (R26.0 = 2027, R25.1 = 2026, R25.0 = 2025)
- `lispPath` — copied into bundle; `.Help.html` and `.chm` next to it are also auto-copied
- `tooltipImage` — GIF/PNG shown in expanded tooltip; recommended 300×187px, <30KB
- `imagePath` — 16×16 BMP for ribbon button icon; omit for auto-generated colored placeholder

Write config with an explicit timestamp to `$env:TEMP`, then run:

```powershell
$configPath = "$env:TEMP\cuix_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
# ... write config to $configPath ...

# With exe (preferred)
& "$env:USERPROFILE\.cuixbuilder\CuixBuilder.exe" $configPath

# With SDK fallback — clone source from GitHub
$src = "$env:TEMP\acad-cuix-builder-src"
if (-not (Test-Path $src)) {
    git clone https://github.com/ADN-DevTech/acad-cuix-builder $src
}
dotnet run --project $src -c Release -- $configPath
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

## F1 Help — AutoCAD 2027 Note

> **AutoCAD 2027 uses a web-based help engine.** `setfunhelp` with CHM/HLP files is ignored. `<Command HelpTopic>` in PackageContents also redirects to Autodesk's online help.

**For demos and production: skip F1 — use tooltip GIFs instead.** The extended tooltip with animated GIF is the primary way to show command help inline.

If online help is required, add a dedicated help button to the ribbon:
```json
{
  "label": "?",
  "command": "(startapp \"cmd.exe\" \"/c start https://yoursite.com/help#commandname\")",
  "tooltip": "Open online help"
}
```

---

## Requirements

- **CuixBuilder.exe** — install via `install.ps1` (downloads from GitHub Releases, ~200KB)
- **.NET 10 runtime** — ships with AutoCAD 2027; or install from https://dot.net
- **Windows only** — AutoCAD bundle format is Windows-specific
