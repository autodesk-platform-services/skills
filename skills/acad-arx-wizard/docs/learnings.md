# ObjectARX / AutoCAD 2027 — Learnings Wiki

A living knowledge base of gotchas, workarounds, and verified API behaviors hit during real development sessions. **Scope is broad** — anything an agent or developer discovers across the ARX dev journey lands here so future sessions skip the rediscovery cost. Inspired by [Karpathy's LLM Wiki](https://karpathy.ai/llmwiki) — short, dense, battle-tested entries.

**What goes here (non-exhaustive):**
- Build / toolchain quirks (compilers, linkers, props files, pdb warnings, /Wv version pinning)
- ARX/DBX/CRX SDK behaviors (entry points, command macros, reactor lifetimes, transient gotchas)
- MFC, ATL, COM integration traps
- AutoCAD runtime surprises (load order, document state, undo, drag/drop, CUI/CUIX)
- Debugger / APPLOAD / DEMANDLOAD behaviors
- VS 2026 / MSBuild / property-sheet inheritance issues
- API behaviors that contradict docs or are undocumented

**Rules:**
- One entry per discovery. Never delete — only add or annotate.
- Include date (ISO `YYYY-MM-DD`), category tag(s), and how it was verified.
- Prefer concrete error text + minimal repro over prose.
- When the same fix lands in a template/script, append a **Promoted:** line pointing to the file. Do not delete the entry.
- Avoid duplicates — search before adding; if a near-duplicate exists, **annotate** (add a new dated bullet under it) instead of creating a fresh entry.

**For agents (Claude / Copilot / Cursor):** when you discover something new, terse and useful (a workaround, a non-obvious diagnostic, a doc-vs-reality gap), append it here in the right section. This file is the project's long-term memory — adding to it costs little and saves the next session from rediscovering the same trap.

---

## Index

- [Build & Toolchain](#build--toolchain)
- [MFC Integration](#mfc-integration)
- [ARX Entry Point & Commands](#arx-entry-point--commands)
- [ARX Scaffold / Wizard](#arx-scaffold--wizard)
- [Dialogs & UI](#dialogs--ui)
- [Linker](#linker)

---

## Build & Toolchain

### [2026-05-06] `_ALLOW_RTCc_IN_STL` must be uncommented for VS 2026 + ARX SDK 2027

**Tag:** `#build #vs2026 #stl`

The ARX SDK debug configuration (`rxsdk_Debugcfg.props`) enables `/RTCc` (runtime check for narrowing conversions). VS 2022+ STL headers reject this flag and emit:

```
fatal error C1189: /RTCc rejects conformant code, so it is not supported by the C++ Standard Library.
Either remove this compiler option, or define _ALLOW_RTCc_IN_STL to suppress this error.
```

**Fix:** In `StdAfx.h`, uncomment the guard (the scaffold generates it but leaves it commented out):

```cpp
#ifndef _ALLOW_RTCc_IN_STL
#define _ALLOW_RTCc_IN_STL
#endif
```

Must appear **before** any STL or MFC `#include`.

**Verified:** Build failure → fix → clean compile. (VS 18.4 / MSVC 14.50)

**Promoted:** `templates/arx-app/StdAfx.h` emits the guard uncommented (no longer wrapped in `/* */`).

---

### [2026-05-06] ARX SDK 2027 headers require `/std:c++17`

**Tag:** `#build #cpp17 #vs2026`

The ARX SDK 2027 headers use nested namespace definitions (`namespace A::B {}`) which are a C++17 feature. Without it you get:

```
error C2429: language feature 'nested-namespace-definition' requires compiler flag '/std:c++17'
```

**Fix:** Add to `ItemDefinitionGroup > ClCompile` in the `.vcxproj`:

```xml
<LanguageStandard>stdcpp17</LanguageStandard>
```

The scaffold (`New-ArxApp.ps1`) does **not** add this automatically — must be added manually after generation, or patched into the wizard template.

**Verified:** Build failure → added `<LanguageStandard>stdcpp17</LanguageStandard>` → clean compile.

**Promoted:** `templates/arx-app/x64win32.vcxproj` now sets `<LanguageStandard>stdcpp17</LanguageStandard>` in `ItemDefinitionGroup > ClCompile`.

---

### [2026-05-06] `rxapi.pdb` warning is harmless

**Tag:** `#build #linker #pdb`

```
rxapi.lib(libinit.obj) : warning LNK4099: PDB 'rxapi.pdb' was not found
```

The ARX SDK ships `rxapi.lib` without a matching `.pdb`. This is expected — the SDK is a release build. Linking proceeds normally; debug stepping into rxapi code is not possible, but the application runs correctly.

**Action:** Safe to ignore. Do not add `/IGNORE:4099` unless you want to suppress it in CI output.

---

### [2026-05-06] `std::vector` / `std::string` must be included before `arxHeaders.h`

**Tag:** `#build #stl #includes`

`arxHeaders.h` → `acuiComboBox.h` uses `std::vector` without including `<vector>` itself. If `<vector>` hasn't been pulled in yet (e.g., you removed `<afxwin.h>` which drags it in transitively), you get:

```
error C2039: 'vector': is not a member of 'std'
```

**Fix:** In `StdAfx.h`, explicitly include before ARX headers:

```cpp
#include <map>
#include <vector>
#include <string>
```

**Verified:** Missing include → error; added includes → clean compile.

**Promoted:** `templates/arx-app/StdAfx.h` now includes `<vector>` and `<string>` next to `<map>` before `arxHeaders.h`.

---

## MFC Integration

### [2026-05-06] MFC shared-mode `StdAfx.h` does NOT get `afxwin.h` from the scaffold

**Tag:** `#mfc #shared #scaffold`

The `New-ArxApp.ps1` script uses `[!if MFC_EXT_SHARED]` in the `StdAfx.h` template to gate MFC includes. That flag is only true when `MfcMode=ext`. When `MfcMode=shared` (non-extension shared DLL), no MFC headers are injected — you just get `#include <windows.h>`.

**Fix:** After scaffolding with `-MfcMode shared`, manually replace `#include <windows.h>` in `StdAfx.h` with:

```cpp
#include <afxwin.h>         // MFC core and standard components
#include <afxext.h>         // MFC extensions
#include <afxcmn.h>         // MFC support for Windows Common Controls
#include <afxdlgs.h>        // MFC standard dialogs
```

These must sit between the `#undef _DEBUG` debug-workaround block and `#include "arxHeaders.h"`.

**Verified:** Dialog class (`CDialog`) compiled only after adding these includes.

**Promoted:** `templates/arx-app/StdAfx.h` injects `afxwin/afxext/afxcmn/afxdlgs` for both `MFC_REG_SHARED` and `MFC_EXT_SHARED`.

---

### [2026-05-06] `DllMain` conflicts with `mfcs140u.lib(dllmodul.obj)` in MFC shared mode

**Tag:** `#mfc #shared #linker #dllmain`

When `<UseOfMfc>Dynamic</UseOfMfc>` is set (MFC shared DLL), the MFC import library `mfcs140u.lib` contributes `dllmodul.obj` which defines its own `DllMain`. If your project also defines `DllMain` (as the ARX scaffold template does in `<ProjectName>.cpp`), the linker emits:

```
mfcs140u.lib(dllmodul.obj) : error LNK2005: DllMain already defined in <ProjectName>.obj
fatal error LNK1169: one or more multiply defined symbols found
```

**Fix:** Remove the `DllMain` function from `<ProjectName>.cpp`. MFC's `DllMain` initializes the shared MFC runtime correctly. You do NOT need your own. Keep the `DllRegisterServer` / `DllCanUnloadNow` stubs if you need COM exports.

**Note:** `_hdllInstance` (used in old ARX tutorials) is set by the ARX runtime itself; you do not need to capture it in `DllMain` for MFC shared mode.

**Verified:** Linker error → removed DllMain → clean link.

**Promoted:** `templates/arx-app/root.cpp` now skips `DllMain` emission when `MFC_REG_SHARED && !MFC_EXT_SHARED`.

---

### [2026-05-06] Always call `AFX_MANAGE_STATE` in every ARX command handler that uses MFC

**Tag:** `#mfc #shared #modulestate`

In an MFC shared-DLL ARX plugin, the correct module state (which controls resource loading, dialog templates, etc.) is the DLL's own state. AutoCAD may switch the module state away from yours between commands. Every exported function / command handler must restore it:

```cpp
static void TdoTodoTODOSHOW() {
    AFX_MANAGE_STATE(AfxGetStaticModuleState());
    CTodoManagerDialog dlg(CWnd::FromHandle(adsw_acadMainWnd()));
    dlg.DoModal();
}
```

Without this, dialogs may fail to find their resources (IDD_ constants) or crash with assertion errors inside MFC.

**Verified:** Standard ARX + MFC guidance; confirmed during todo app development.

**Promoted:** `templates/arx-app/acrxEntryPoint.cpp` injects `AFX_MANAGE_STATE(AfxGetStaticModuleState())` at the top of every command stub when `MFC_REG_SHARED` is on.

---

## ARX Entry Point & Commands

### [2026-05-06] `ACED_ARXCOMMAND_ENTRY_AUTO` function naming convention

**Tag:** `#commands #macros`

The macro:

```cpp
ACED_ARXCOMMAND_ENTRY_AUTO(ClassName, Group, GlobalCmd, LocalCmd, Flags, UIContext)
```

expects a **static member function** on `ClassName` named exactly `{Group}{GlobalCmd}`:

```cpp
// Macro registration:
ACED_ARXCOMMAND_ENTRY_AUTO(CMyApp, TdoTodo, TODOSHOW, TODOSHOW, ACRX_CMD_MODAL, NULL)

// Required function (name = Group + GlobalCmd):
static void TdoTodoTODOSHOW() { ... }
```

If the function name doesn't match, the linker emits an unresolved external.

**Verified:** Working implementation in `TodoMfcApp` project.

---

### [2026-05-06] `adsw_acadMainWnd()` returns AutoCAD's main window HWND

**Tag:** `#ui #hwnd #dialogs`

Use this to parent MFC dialogs to the AutoCAD frame so they stay on top and behave correctly:

```cpp
CTodoManagerDialog dlg(CWnd::FromHandle(adsw_acadMainWnd()));
dlg.DoModal();
```

`adsw_acadMainWnd()` is declared in `adsdef.h` (included via `arxHeaders.h`). Works for both modal and modeless dialogs.

---

## ARX Scaffold / Wizard

### [2026-05-06] Output `.arx` filename is `{RDS}{ProjectName}.arx`

**Tag:** `#scaffold #output`

The vcxproj sets:

```xml
<TargetName Condition="'$(RDS)'!=''">$(RDS)$(ProjectName)</TargetName>
```

So with `RdsPrefix="Tdo"` and `ProjectName="TodoMfcApp"`, the output is `TdoTodoMfcApp.arx`.

For `APPLOAD` in AutoCAD, the full path is:
```
<ProjectDir>\x64\Debug\TdoTodoMfcApp.arx
```

---

### [2026-05-06] ProjectName must be a valid C++ identifier

**Tag:** `#scaffold #naming`

`New-ArxApp.ps1` rejects names with hyphens or leading digits (validates against `^[A-Za-z_][A-Za-z0-9_]*$`). Folder names like `todo-mfc-app` are fine for the repo root but the project name itself must be e.g. `TodoMfcApp`.

---

## Dialogs & UI

### [2026-05-06] MFC shared-mode ARX: use `CDialog`, not `CAcUiDialog`, for simple dialogs

**Tag:** `#dialogs #mfc #acui`

`CAcUiDialog` (from AcUi) provides AutoCAD-specific keyboard focus management. For simple internal tools, plain `CDialog` works fine provided:
1. The parent window is `adsw_acadMainWnd()`
2. `AFX_MANAGE_STATE` is called before `DoModal()`

For production tools that need full AutoCAD shell integration (e.g., responding to `ESC` correctly), prefer `CAcUiDialog`.

---

### [2026-05-06] `OnEnChangeEditNewItem` pattern for enabling/disabling Add button

**Tag:** `#dialogs #ux`

Wire `ON_EN_CHANGE` to update button states in real time so "Add" is only enabled when the edit box is non-empty:

```cpp
ON_EN_CHANGE(IDC_EDIT_NEW_ITEM, &CTodoManagerDialog::OnEnChangeEditNewItem)

void CTodoManagerDialog::OnEnChangeEditNewItem() {
    CString txt;
    m_editNewItem.GetWindowText(txt);
    txt.Trim();
    GetDlgItem(IDC_BTN_ADD)->EnableWindow(!txt.IsEmpty());
}
```

---

### [2026-06-09] Modeless ARX dialog focus stolen by AutoCAD — official fix is `WM_ACAD_KEEPFOCUS`

**Tag:** `#dialogs #mfc #modeless #focus`

When a modeless dialog is shown from an `ACRX_CMD_MODAL` command, AutoCAD steals focus back to its command line after the command function returns. Timer hacks and `OnActivate`/`SetForegroundWindow` workarounds are unreliable.

**Official fix (from SDK `samples/editor/mfcsamps/modeless/sampdialog.cpp`):** AutoCAD sends `WM_ACAD_KEEPFOCUS` (`WM_ACAD_MFC_BASE + 1` = 1001) to the modeless dialog whenever it is about to reclaim focus. Returning `TRUE` keeps focus on the dialog.

```cpp
#define WM_ACAD_MFC_BASE  1000
#define WM_ACAD_KEEPFOCUS (WM_ACAD_MFC_BASE + 1)

// Header:
afx_msg LRESULT onAcadKeepFocus(WPARAM, LPARAM);

// Message map:
ON_MESSAGE(WM_ACAD_KEEPFOCUS, &CTodoDialog::onAcadKeepFocus)

// Implementation:
LRESULT CTodoDialog::onAcadKeepFocus(WPARAM, LPARAM) { return TRUE; }
```

**Additional best practices from the same SDK sample:**
- Use `acedGetAcadFrame()` (not `CWnd::FromHandle(adsw_acadMainWnd())`) as the dialog parent — it returns the actual MFC `CFrameWnd*` for AutoCAD's main frame.
- `CAcModuleResourceOverride` is only valid when `AC_IMPLEMENT_EXTENSION_MODULE` is declared (MFC extension DLL pattern). In `AcRxArxApp`-based projects (MFC shared mode), `AFX_MANAGE_STATE(AfxGetStaticModuleState())` at the top of the command handler already ensures the correct module is active — no `resOverride` needed.

```cpp
CAcModuleResourceOverride resOverride;
g_pDlg = new CMyDialog(acedGetAcadFrame());
g_pDlg->Create(IDD_MY_DIALOG, acedGetAcadFrame());
g_pDlg->ShowWindow(SW_SHOW);
```

**Verified:** Official Autodesk SDK reference pattern; timer/OnActivate approach removed.

**Source:** `D:\SDKS\ARX2027\samples\editor\mfcsamps\modeless\sampdialog.cpp`

---

## Linker

*(See also MFC section for DllMain conflict)*

### [2026-05-06] PlatformToolset `v145` maps to VS 2022 / VS 2026 MSVC 14.5x toolchain

**Tag:** `#linker #toolchain`

The ARX SDK 2027 ships props files that set `<ArxSDKPlatform>v145</ArxSDKPlatform>` and the vcxproj maps this to `<PlatformToolset>v145</PlatformToolset>`. In VS 2026, this resolves to MSVC 14.50.x. Confirmed working with:

```
MSBuild version 18.4.0+6e61e96ac
MSVC 14.50.35717
```

---

### [2026-05-06] MFC EXT DLL also hits `mfcs140u.lib(dllmodul.obj)` LNK2005 on VS 2026 — RESOLVED

**Tag:** `#mfc #ext #linker #dllmain #open`

The earlier learning said "remove your DllMain in MFC shared mode" and that fix landed in the template (`MFC_REG_SHARED && !MFC_EXT_SHARED`). When the same smoke test was extended to **ext mode** (`-MfcMode ext`), the linker emits the **same** error:

```
mfcs140u.lib(dllmodul.obj) : error LNK2005: DllMain already defined in <Project>.obj
fatal error LNK1169: one or more multiply defined symbols found
```

Verified preexisting on `main` (clean tree, no patches): `New-ArxApp -AppType arx -MfcMode ext` then build → LNK2005.

**Diagnostic:** Removing the project's `DllMain` for ext mode lets the build link cleanly, but then `AfxInitExtensionModule` is never called — so the extension DLL builds but is non-functional at runtime (resource map / runtime-class registration missing).

**Open question:** standard `<afxdllx.h>` pattern + `_AFXEXT` define + own DllMain *should* override the lib's DllMain in classic MFC ext DLLs. Something in MSVC 14.5 / ARX SDK 2027 link order pulls `dllmodul.obj` regardless. Possible root causes to investigate:

- ARX SDK lib references `_hdllInstance` (defined in `dllmodul.obj`), forcing the obj to be linked.
- `_AFXEXT` is being applied via `<PreprocessorDefinitions Condition="'$(UseOfMfc)'=='Dynamic'">_AFXEXT;...` to **both** shared and ext modes — wrong for shared, may be a separate bug.
- Try `int APIENTRY DllMain` signature (matches `<afxdllx.h>` declaration exactly) instead of `BOOL WINAPI`.
- Try `__declspec(dllexport)` on the project's `DllMain`.

**Status:** Smoke test `tests/Invoke-LocalCI.ps1` "Build ArxExt (arx)" failed on `main`. Templates left unchanged for ext mode (same as `main`); the shared-mode fix did **not** regress ext mode — it was already broken.

**[2026-05-06 update] Resolved.** Reference: working project `D:\Projects\SKILLDEMO\TstExportDialog`. Fix is three-part — none alone is sufficient:

1. **Drop `<UseOfMfc>Dynamic</UseOfMfc>`** for ext mode. `<UseOfMfc>Dynamic</UseOfMfc>` makes MSBuild auto-link `mfcs140u.lib` early, dragging `dllmodul.obj` (and its `DllMain`) into link. `_AFXDLL` + `/MD` come from `rxsdk_common.props` instead — sufficient for shared MFC linkage without auto-pulling `mfcs140u.lib`.
2. **Set `_AFXEXT` explicitly** (not via `<PreprocessorDefinitions Condition="'$(UseOfMfc)'=='Dynamic'">_AFXEXT;...`). With `<UseOfMfc>` gone, the condition would never fire.
3. **Add `<ForceFileOutput>MultiplyDefinedSymbolOnly</ForceFileOutput>`** (= `/FORCE:MULTIPLE`) under `<Link>`. Even with steps 1–2, `mfcs140u.lib(dllmodul.obj)` may still get pulled by another symbol reference. `/FORCE:MULTIPLE` lets the linker keep our `DllMain` (our .obj precedes libs in link order, so ours wins) and treat the lib's copy as dead code. Documented ARX MFC ext DLL workaround for VS 2022+.

**Promoted:** `templates/arx-app/x64win32.vcxproj` now gates `<UseOfMfc>` on `[!if !MFC_EXT_SHARED]`, sets `_AFXEXT` explicitly under `[!if MFC_EXT_SHARED]`, and adds `<ForceFileOutput>MultiplyDefinedSymbolOnly</ForceFileOutput>` to `<Link>` for ext mode.

**Verified:** `tests/Invoke-LocalCI.ps1` Build ArxExt (arx) → PASS. Full suite 19/19 green.

---

### [2026-05-06] `_AFXEXT` is preprocessed for both `MfcMode=shared` and `MfcMode=ext`

**Tag:** `#mfc #vcxproj #preprocessor`

`templates/arx-app/x64win32.vcxproj` defines `_AFXEXT` whenever `UseOfMfc=Dynamic`:

```xml
<PreprocessorDefinitions Condition="'$(UseOfMfc)'=='Dynamic'">_AFXEXT;%(PreprocessorDefinitions)</PreprocessorDefinitions>
```

But `UseOfMfc=Dynamic` is set for **both** `MfcMode=shared` and `MfcMode=ext` in `New-ArxApp.ps1`. `_AFXEXT` is only meaningful for actual MFC extension DLLs — applying it in plain shared mode may confuse MFC startup. Likely a contributor to the DllMain conflict in shared mode (already worked around by skipping DllMain emission).

**Action:** Investigate gating `_AFXEXT` only on `MFC_EXT_SHARED`, not `MFC_REG_SHARED`. Requires careful smoke-test of all four MFC variants.

**Status:** Open. Current shared-mode fix sidesteps the symptom by not emitting DllMain.

---

*Last updated: 2026-05-06 — TodoMfcApp session + smoke-test extension*
