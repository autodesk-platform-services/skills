# ObjectARX Wizard Skill for AutoCAD 2027 / VS 2026

**Agentic project scaffolding for ObjectARX C++ development — works in GitHub Copilot, Cursor, Claude, and any AI agent that can invoke a terminal.**

> The classic `.vsz` / `VsWizardEngine` wizard is broken in Visual Studio 2026.
> See [MS Developer Community #11071541](https://developercommunity.visualstudio.com/t/VsWizardVsWizardEngine-vsz-based-projec/11071541).
> This skill replaces it entirely for AutoCAD 2027 / VS 2026.
> VS 2022 users can continue using the original [ObjectARX-Wizards installer](https://github.com/ADN-DevTech/ObjectARX-Wizards).

**New here? → [USAGE.md](USAGE.md) — quick start + example prompts for every wizard type.**

---

## Design Philosophy

### Why a PowerShell script instead of pure AI generation?

This is a deliberate architectural choice — the PowerShell scripts are a **token firewall**:

```
Pure AI-native (no script)
─────────────────────────────────────────────────────────────────────
  Agent reads template 1 (tokens) → template 2 (tokens) → ... → template 14 (tokens)
  Agent holds all expanded content in context             (tokens)
  Agent writes 14 files via create_file                   (tokens)
  = ~15,000–40,000 tokens per invocation

Script-assisted (this skill)
─────────────────────────────────────────────────────────────────────
  Agent collects 5–6 parameters in conversation   →  ~500  tokens
  Agent runs: New-ArxApp.ps1 -ProjectName X ...   →  ~50   tokens
  Script does ALL file I/O outside context window
  Agent confirms: "14 files generated in C:\..."  →  ~100  tokens
  = ~650 tokens per invocation
```

**~60× fewer tokens per scaffolding operation**, with deterministic output every time.

Additional benefits:
- **Deterministic** — same inputs always produce identical output; complex `[!if/!else/!endif]` nesting is evaluated by the PowerShell engine, not by AI inference
- **Offline capable** — once the skill is installed, scripts run standalone with no AI needed
- **CI/CD friendly** — call `New-ArxApp.ps1` directly from build pipelines
- **Auditable** — developers can read, modify, and version-control the scaffolding logic

---

## Available Wizards

| Script | Equivalent old wizard | What it generates |
|---|---|---|
| `New-ArxApp.ps1` | ArxAppWiz | Full ARX/DBX/CRX project (vcxproj + all source files) |
| `New-ArxCustomObject.ps1` | ArxWizCustomObject | Custom ObjectDBX entity class (.h + .cpp) |
| `New-ArxReactors.ps1` | ArxWizReactors | Transient reactor class (.h + .cpp) |
| `New-ArxJig.ps1` | ArxWizJig | AcEdJig subclass (.h + .cpp) |
| `New-ArxMFCSupport.ps1` | ArxWizMFCSupport | MFC dialog/palette/control class (.h + .cpp) |
| `New-ArxNETWrapper.ps1` | ArxWizNETWrapper | Managed .NET wrapper class (.h + .cpp) |
| `New-ArxComWrapper.ps1` | ArxAtlWizComWrapper | ATL COM wrapper object (.h + .cpp + .idl + .rgs) |
| `New-ArxDynProp.ps1` | ArxAtlWizDynProp | ATL dynamic property class (.h + .cpp + .idl + .rgs) |

---

## Installation

### Install from the APS skills repository (recommended: user-level)

Requires [Node.js v16.7+](https://nodejs.org/). Run from your project folder:

```bash
npx skills add autodesk-platform-services/skills --global --skill acad-arx-wizard
```

Project-level alternative (for repo-specific sharing/commit):

```bash
npx skills add autodesk-platform-services/skills --project --skill acad-arx-wizard
```

Manual option (example for Claude Code):

```bash
git clone https://github.com/autodesk-platform-services/skills.git
cp -r skills/acad-arx-wizard ~/.claude/skills/
```

> Behind a corporate VPN or proxy? Add `--registry=https://registry.npmjs.org/`

### PowerShell execution policy (first-time Windows setup)

The scripts require Windows PowerShell 5.1 (built-in on every Windows 10/11 machine — no install needed). If scripts are blocked, run once:

```powershell
powershell.exe -Command "Set-ExecutionPolicy -Scope CurrentUser RemoteSigned"
```

> **pwsh (PowerShell 7+) is optional** — the installer auto-detects it and prefers it, but falls back to the built-in `powershell.exe` automatically.

Then in any AI chat, type e.g.:
> "Create an ObjectARX ARX application called MyPlugin with MFC shared and ATL COM support"

---

## How the AI and scripts work together

The AI agent is the **smart front-end**; the PowerShell scripts are the **deterministic back-end**.

```
Developer (natural language)
        ↓
   AI Agent  ──reads──▶  SKILL.md  (what wizards exist, what params they need)
        │
        ├─ maps intent to wizard type
        ├─ extracts params from the sentence, asks only for missing ones
        ├─ runs New-Arx*.ps1  ◀── token firewall: all file I/O happens here
        ├─ confirms generated files
        └─ continues assisting: explains generated code, suggests next steps,
           answers ObjectARX questions, helps integrate into the project
```

**Example conversation:**
> *You:* "Add a Jig to my MyPlugin project that jiggles an AcDbLine with 2 input points"
>
> *Agent:* "Where should I put the files? (your project folder)"
>
> *You:* `C:\Dev\MyPlugin`
>
> *Agent:* *(runs script)* "Generated `CMyJig.h` and `CMyJig.cpp` in `C:\Dev\MyPlugin`.
> In Visual Studio: right-click your project → Add → Existing Item → select both files.
> Want me to show you how to wire the jig command into `acrxEntryPoint.cpp`?"

The AI handles project planning, code explanation, and problem-solving throughout — the script just handles the deterministic file generation part.

### Running scripts directly (CI/CD or power users)

Once you know your parameters, you can bypass the AI entirely — useful for build pipelines:

```powershell
# Full ARX project
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%USERPROFILE%\.copilot\skills\acad-arx-wizard\scripts\New-ArxApp.ps1" `
    -ProjectName MyPlugin -OutputPath C:\Dev -AppType arx -MfcMode shared

# Add a Jig class
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%USERPROFILE%\.copilot\skills\acad-arx-wizard\scripts\New-ArxJig.ps1" `
    -ClassName CMyJig -ObjectName AcDbLine -NumberOfInputs 2 -OutputPath C:\Dev\MyPlugin

# Add a database reactor
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%USERPROFILE%\.copilot\skills\acad-arx-wizard\scripts\New-ArxReactors.ps1" `
    -ClassName CMyReactor -ReactorType AcDbDatabaseReactor -OutputPath C:\Dev\MyPlugin
```

---

## Requirements

- Windows 10/11 (ObjectARX is Windows-only)
- Node.js v16.7+ (for `npx` install only — not needed to run scripts)
- Windows PowerShell 5.1 (built-in — no install) *or* PowerShell 7+ (optional)
- Visual Studio 2026 with C++ Desktop workload
- AutoCAD 2027 / ObjectARX 2027 SDK
