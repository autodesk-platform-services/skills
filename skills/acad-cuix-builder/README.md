# AutoCAD CUIX Builder Skill

**Conversational ribbon customization for AutoCAD — describe your buttons in plain English, get a ready-to-load `.cuix` file.**

Works in GitHub Copilot, Claude Code, Cursor, and any AI agent that can run a terminal.

---

## Install (one command)

```powershell
irm https://raw.githubusercontent.com/autodesk-platform-services/skills/main/skills/acad-cuix-builder/install.ps1 | iex
```

Downloads `CuixBuilder.exe` (~200 KB) and installs the skill in one shot.

> **Requires .NET 10 runtime** — ships with AutoCAD 2027. No separate SDK install needed.

Then in your agent: `/acad-cuix-builder`

---

## Example prompt

```
/acad-cuix-builder

I need a ribbon tab called "Drafting Tools" with two panels:

Panel 1 — Annotation:
  - Quick Leader button (command: QLEADER)
  - Mtext button (command: MTEXT)

Panel 2 — View:
  - Zoom Extents button (command: ZOOM E)
  - Regen button (command: REGEN)

Save to C:\Plugins\DraftingTools.cuix
```

The skill collects your plugin name, panels, buttons, and commands — then runs `CuixBuilder.exe` to generate the `.cuix`:

```
Done: C:\Plugins\DraftingTools.cuix
In AutoCAD: CUILOAD → browse to C:\Plugins\DraftingTools.cuix
```

---

## What gets generated

- A partial CUIX file with a **ribbon tab**, **panels**, and **buttons**
- Each button gets a `^C^C`-prefixed macro automatically (bare commands and LISP expressions both handled)
- Buttons without an image path get **auto-colored 16×16 BMP placeholders** (cycles blue → green → orange → purple → teal → red → amber → cyan)

Load in AutoCAD with `CUILOAD` — the tab appears instantly in the ribbon.

---

## Command formats the skill understands

| You type | Becomes |
|---|---|
| `QLEADER` | `^C^CQLEADER` |
| `zoom e` | `^C^CZOOM E` |
| `(alert "Hi")` | `^C^C(alert "Hi")` |
| `^C^CMYCOMMAND` | `^C^CMYCOMMAND` (unchanged) |

---

## Source

- Skill: [autodesk-platform-services/skills](https://github.com/autodesk-platform-services/skills/tree/main/skills/acad-cuix-builder)
- Generator: [ADN-DevTech/acad-cuix-builder](https://github.com/ADN-DevTech/acad-cuix-builder)
