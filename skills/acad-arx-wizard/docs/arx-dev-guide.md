# ObjectARX 2027 Developer Guide — Project Configuration Reference

> Derived from the official MSBuild `.props` files shipped in `ARX2027\inc\`.

---

## 1. Property Sheet Hierarchy

The SDK ships eight `.props` files that form an inheritance chain. Import the **one** sheet that matches your project type; it pulls in everything else automatically.

```
rxsdk_common.props          ← base compiler/linker settings (ALL project types)
├── rxsdk_debugcfg.props    ← Debug-specific overrides   (import for Debug configs)
├── rxsdk_releasecfg.props  ← Release-specific overrides (import for Release configs)
│
├── dbx.props               ← DBX module settings (custom objects / no UI)
│   ├── arx.props           ← ARX module settings (full AutoCAD UI access)
│   └── crx.props           ← CRX module settings (Core Console plug-ins)
│
├── brep.props              ← Boundary-representation API add-on
└── aecmodeler.props         ← AEC solid-modeler API add-on
```

**How to use:** In your `.vcxproj`, add one `<Import>` for the **configuration** sheet (debug or release) and one for the **project-type** sheet. Example for an ARX project:

```xml
<ImportGroup Label="PropertySheets" Condition="'$(Configuration)'=='Debug'">
  <Import Project="$(ARXSDK)\inc\rxsdk_debugcfg.props" />
  <Import Project="$(ARXSDK)\inc\arx.props" />
</ImportGroup>
<ImportGroup Label="PropertySheets" Condition="'$(Configuration)'=='Release'">
  <Import Project="$(ARXSDK)\inc\rxsdk_releasecfg.props" />
  <Import Project="$(ARXSDK)\inc\arx.props" />
</ImportGroup>
```

---

## 2. Common Settings (`rxsdk_common.props`)

These apply to **every** ObjectARX project regardless of type or configuration.

### 2.1 C/C++ Compiler (`ClCompile`)

| Setting | Value | Meaning |
|---|---|---|
| **Runtime Library** | **`MultiThreadedDLL`** (`/MD`) | Links against the DLL version of the CRT. **You must use `/MD` for both Release AND Debug configurations.** AutoCAD is always shipped as a Release build — your plug-in DLL is loaded into its process, so the CRT must match. Using `/MDd` will cause heap corruption, crashes, or silent data corruption at runtime. `/MDd` is only valid if you have an internal Autodesk Debug build of AutoCAD. See §9 Common Pitfalls. |
| **Exception Handling** | `Sync` (`/EHsc`) | Synchronous C++ exception handling only. |
| **RTTI** | `true` (`/GR`) | Run-Time Type Information enabled — required by the ARX class hierarchy. |
| **Warning Level** | `Level3` (`/W3`) | |
| **Treat Warnings as Errors** | `true` (`/WX`) | Every warning is a build error. |
| **String Pooling** | `true` (`/GF`) | Eliminates duplicate string literals. |
| **Function-Level Linking** | `true` (`/Gy`) | Allows linker to remove unreferenced functions. |
| **Buffer Security Check** | `true` (`/GS`) | Stack buffer overrun detection enabled. |
| **wchar_t Built-In** | `true` (`/Zc:wchar_t`) | `wchar_t` is a native type, not a typedef. |
| **Conformant for-loop Scope** | `true` (`/Zc:forScope`) | Standard-conforming loop variable scoping. |
| **Debug Info Format** | `ProgramDatabase` (`/Zi`) | Generates `.pdb` files for debugging. |
| **Precompiled Header** | `Use` — file `stdafx.h` | All source files must `#include "stdafx.h"` first. |
| **Character Set** | Unicode (`_UNICODE`, `UNICODE` defined) | AutoCAD 2027 is Unicode-only. ANSI builds are not supported. |

### 2.2 Preprocessor Definitions

```
_WIN32_IE=0x0601
WIN
WIN32
_CRT_SECURE_CPP_OVERLOAD_STANDARD_NAMES=1
_CRT_SECURE_CPP_OVERLOAD_STANDARD_NAMES_COUNT=1
_AFXDLL
_UNICODE
UNICODE
```

| Macro | Purpose |
|---|---|
| `_WIN32_IE=0x0601` | Target Internet Explorer 6.01+ common controls. |
| `WIN` / `WIN32` | Legacy platform macros expected by ARX headers. |
| `_CRT_SECURE_CPP_OVERLOAD_*` | Auto-routes unsafe CRT calls to safer `_s` overloads. |
| `_AFXDLL` | MFC is used as a shared DLL (required). |
| `_UNICODE` / `UNICODE` | Wide-character APIs throughout. |

### 2.3 Linker (`Link`)

| Setting | Value | Notes |
|---|---|---|
| **Incremental Linking** | `false` | Disabled — produces smaller, faster binaries. |
| **Subsystem** | `Windows` | DLL loaded by AutoCAD — no console subsystem. |
| **Generate Debug Info** | `true` | Always produces `.pdb` even in Release. |
| **Optimize References** | `true` (`/OPT:REF`) | Strips unreferenced data. |
| **COMDAT Folding** | `true` (`/OPT:ICF`) | Merges identical code blocks. |
| **CLR Thread Attribute** | `STAThreadingAttribute` | COM single-threaded apartment for UI interop. |
| **CLR Image Type** | `ForceIJWImage` | If managed code is present, force IJW (It Just Works / mixed mode). |
| **CLR Unmanaged Code Check** | `true` | Adds `SuppressUnmanagedCodeSecurity` audit. |
| **Link Library Dependencies** | `false` (ProjectReference) | SDK `.lib` files are linked explicitly, not via project references. |

### 2.4 Include & Library Paths

The `.props` files set up *relative* search paths using `$(Platform)` (resolves to `x64`):

- **Include Directories:** `inc-$(Platform)` + `inc`
- **Library Directories:** `lib-$(Platform)`

For an absolute setup, define an environment variable or MSBuild property `$(ARXSDK)` pointing to your SDK root and use:

```
$(ARXSDK)\inc-x64       ← platform-specific headers
$(ARXSDK)\inc            ← common headers + .props files
$(ARXSDK)\lib-x64        ← import libraries
```

### 2.5 MIDL (IDL Compiler)

Configured for COM type-library generation if your project exposes COM interfaces. Output files go to `$(IntDir)`.

### 2.6 Resource Compiler

| Setting | Value |
|---|---|
| Culture | `0x0409` (English – United States) |

---

## 3. Debug Configuration (`rxsdk_debugcfg.props`)

Imports `rxsdk_common.props`, then overrides:

| Setting | Value | Notes |
|---|---|---|
| **Optimization** | `Disabled` (`/Od`) | No optimization — full debuggability. |
| **Basic Runtime Checks** | `EnableFastChecks` (`/RTC1`) | Detects stack corruption, uninitialized locals. |
| **Smaller Type Check** | `true` | Catches truncation bugs at runtime. |
| **Runtime Library** | (inherited) **`MultiThreadedDLL`** (`/MD`) | **Even in your Debug configuration, use `/MD` (Release CRT).** AutoCAD is a Release binary; mixing `/MDd` into its process causes CRT mismatch crashes. Only switch to `/MDd` if you have a Debug build of AutoCAD itself (Autodesk internal). |

---

## 4. Release Configuration (`rxsdk_releasecfg.props`)

Imports `rxsdk_common.props`, then overrides:

| Setting | Value | Notes |
|---|---|---|
| **Optimization** | `MaxSpeed` (`/O2`) | Maximize execution speed. |
| **Inline Expansion** | `AnySuitable` (`/Ob2`) | Compiler decides what to inline. |
| **Intrinsic Functions** | `true` (`/Oi`) | Replace CRT calls with CPU intrinsics. |
| **Favor Size or Speed** | `Speed` (`/Ot`) | Prefer speed over code size. |
| **Omit Frame Pointers** | `true` (`/Oy`) | Frees up a register on x64 (minor effect). |
| **Fiber-Safe Optimizations** | `true` (`/GT`) | Safe TLS access for fiber-based scheduling. |
| **Whole Program Optimization** | `true` (`/GL`) | Enable cross-module inlining at compile time. |
| **Link-Time Code Generation** | `UseLinkTimeCodeGeneration` (`/LTCG`) | Full LTCG — pairs with `/GL`. |
| **Basic Runtime Checks** | `Default` (none) | Runtime checks disabled for performance. |
| **Preprocessor Definitions** | `_NDEBUG=1; NDEBUG=1` | Disables `assert()` and debug-only code paths. |

---

## 5. Project-Type Sheets

### 5.1 DBX — Custom Object Module (`dbx.props`)

| Property | Value |
|---|---|
| **Output Extension** | `.dbx` |
| **Link Libraries** | `acpal.lib` `acdb26.lib` `acge26.lib` `acgiapi.lib` `acISMobj26.lib` `rxapi.lib` |

Use a **DBX** when you need custom `AcDbObject` / `AcDbEntity` classes that can be loaded by any host (AutoCAD, Civil 3D, Revit MEP, vertical applications) without depending on the AutoCAD UI.

### 5.2 ARX — AutoCAD Application Module (`arx.props`)

Inherits from `dbx.props`, then adds:

| Property | Value |
|---|---|
| **Output Extension** | `.arx` |
| **Additional Link Libraries** | `accore.lib` `acad.lib` `acui26.lib` `adui26.lib` |

Use an **ARX** when you need full access to the AutoCAD editor, UI, command line, palettes, ribbons, and dialogs.

### 5.3 CRX — Core Console Module (`crx.props`)

Inherits from `dbx.props`, then adds:

| Property | Value |
|---|---|
| **Output Extension** | `.crx` |
| **Additional Link Libraries** | `accore.lib` |

Use a **CRX** for headless/batch automation via **AutoCAD Core Console** (`accoreconsole.exe`). No UI libraries are linked.

---

## 6. Optional Add-On Sheets

### 6.1 B-Rep API (`brep.props`)

| Property | Value |
|---|---|
| **Link Libraries** | `acbr26.lib` `acgex26.lib` |
| **Preprocessor** | `DLLNAME_ACBR=acbr26.dbx` |

Import this sheet if your code uses `AcBr*` boundary-representation traversal classes (faces, edges, loops on 3D solids).

### 6.2 AEC Modeler (`aecmodeler.props`)

| Property | Value |
|---|---|
| **Link Libraries** | `aecmodeler.lib` |

Import this sheet if your code uses the AEC solid-modeling kernel (profiles, extrusions, boolean operations for architectural geometry).

---

## 7. Quick-Reference: Required Compiler & Linker Flags

Copy-paste–friendly flags if you are configuring manually instead of importing `.props`:

### Debug (`x64`)

```
CL:
  /MD /EHsc /GR /W3 /WX /GF /Gy /GS /Zc:wchar_t /Zc:forScope /Zi /Od /RTC1
  /D _WIN32_IE=0x0601 /D WIN /D WIN32 /D _AFXDLL /D _UNICODE /D UNICODE
  /D _CRT_SECURE_CPP_OVERLOAD_STANDARD_NAMES=1
  /D _CRT_SECURE_CPP_OVERLOAD_STANDARD_NAMES_COUNT=1
  ⚠ Use /MD even for Debug — AutoCAD is a Release binary. Never use /MDd.

LINK:
  /SUBSYSTEM:WINDOWS /DEBUG /OPT:REF /OPT:ICF
```

### Release (`x64`)

```
CL:
  /MD /EHsc /GR /W3 /WX /GF /Gy /GS /Zc:wchar_t /Zc:forScope /Zi
  /O2 /Ob2 /Oi /Ot /Oy /GT /GL
  /D _WIN32_IE=0x0601 /D WIN /D WIN32 /D _AFXDLL /D _UNICODE /D UNICODE
  /D _CRT_SECURE_CPP_OVERLOAD_STANDARD_NAMES=1
  /D _CRT_SECURE_CPP_OVERLOAD_STANDARD_NAMES_COUNT=1
  /D _NDEBUG=1 /D NDEBUG=1

LINK:
  /SUBSYSTEM:WINDOWS /DEBUG /OPT:REF /OPT:ICF /LTCG
```

---

## 8. Libraries by Project Type

| Library | DBX | ARX | CRX | Purpose |
|---|:---:|:---:|:---:|---|
| `rxapi.lib` | ✔ | ✔ | ✔ | Runtime extension API (acrxEntryPoint, etc.) |
| `acpal.lib` | ✔ | ✔ | ✔ | Platform Abstraction Layer |
| `acdb26.lib` | ✔ | ✔ | ✔ | Database (DWG read/write, object model) |
| `acge26.lib` | ✔ | ✔ | ✔ | Geometry library (points, curves, transforms) |
| `acgiapi.lib` | ✔ | ✔ | ✔ | Graphics Interface (custom entity display) |
| `acISMobj26.lib` | ✔ | ✔ | ✔ | Intersect/Snap/Mass properties |
| `accore.lib` | | ✔ | ✔ | Core engine (command registration, documents) |
| `acad.lib` | | ✔ | | Editor services (UI, selection, prompts) |
| `acui26.lib` | | ✔ | | AutoCAD-specific MFC UI controls |
| `adui26.lib` | | ✔ | | Autodesk shared MFC UI controls |
| `acbr26.lib` | opt | opt | opt | B-Rep traversal (import `brep.props`) |
| `acgex26.lib` | opt | opt | opt | Extended geometry (import `brep.props`) |
| `aecmodeler.lib` | opt | opt | opt | AEC solid modeler (import `aecmodeler.props`) |

---

## 9. Common Pitfalls

| Mistake | Symptom | Fix |
|---|---|---|
| Using `/MT`, `/MTd`, or **`/MDd`** | Linker errors, heap corruption, random crashes at runtime | **Always use `/MD`** — even in your Debug configuration. AutoCAD ships as a Release build; your plug-in must link against the same Release CRT (`/MD`). `/MDd` is only valid with an internal Autodesk Debug build of AutoCAD. |
| Missing `_UNICODE` / `UNICODE` | `TCHAR` resolves to `char`; APIs fail silently or crash | Ensure both macros are defined |
| Missing `_AFXDLL` | MFC static-link errors (`nafxcw.lib` not found) | Define `_AFXDLL` — MFC must be a shared DLL |
| Forgetting `rxapi.lib` | Unresolved `acrxEntryPoint` / `acrxRegisterAppMDIAware` | Link `rxapi.lib` (included via `dbx.props`) |
| Incremental linking on | Bloated `.arx`, potential load failures | Set **Incremental Linking = false** |
| MBCS / ANSI character set | Widespread `const char*` / `const wchar_t*` mismatches | Project must target **Unicode** |
| Missing `/EHsc` | ARX SDK headers use C++ exceptions internally | Always enable synchronous exception handling |
| Disabling RTTI (`/GR-`) | `dynamic_cast` / `AcRxObject::isKindOf()` fails | Keep **`/GR`** enabled |

---

## 10. Recommended Visual Studio Project Settings Summary

| Category | Setting | Value |
|---|---|---|
| **General** | Platform Toolset | `v143` (VS 2022) or `v144` (VS 2025/2026) |
| **General** | Target Platform | `x64` only |
| **General** | Character Set | Use Unicode Character Set |
| **General** | Use of MFC | Use MFC in a Shared DLL |
| **C/C++ → Code Generation** | Runtime Library | **`/MD` for BOTH Release and Debug** (AutoCAD is a Release binary) |
| **C/C++ → Code Generation** | Exception Handling | `/EHsc` |
| **C/C++ → Code Generation** | Enable RTTI | Yes (`/GR`) |
| **C/C++ → Code Generation** | Security Check | Yes (`/GS`) |
| **C/C++ → Language** | Treat wchar_t as Built-in | Yes |
| **C/C++ → General** | Warning Level | `/W3` |
| **C/C++ → General** | Treat Warnings as Errors | Yes (`/WX`) |
| **C/C++ → Precompiled Headers** | Precompiled Header | Use (`stdafx.h`) |
| **Linker → General** | Incremental Linking | No |
| **Linker → Debugging** | Generate Debug Info | Yes |
| **Linker → Optimization** | References | Eliminate Unreferenced (`/OPT:REF`) |
| **Linker → Optimization** | COMDAT Folding | Remove Redundant (`/OPT:ICF`) |
| **Linker → System** | SubSystem | Windows |

---

*Generated from the ObjectARX 2027 SDK `.props` files in `ARX2027\inc\`.*
