# CUIX File Architecture

## Layer 1 — Container (OPC / ZIP)

CUIX is an **Open Packaging Convention** archive — same container standard as `.docx`, `.xlsx`. Every file inside is a "part". Two OPC metadata files govern the package:

```
MyPlugin.cuix  (ZIP)
│
├── [Content_Types].xml     ← MIME type registry for all extensions in the package
└── _rels/
    └── .rels               ← Relationship manifest: who owns what, what type each part is
```

`_rels/.rels` has two relationship types:

| Type | Target | Purpose |
|---|---|---|
| `CUI` | `/*.cui` | AutoCAD loads these as customization parts |
| `Image` | `/*.bmp` | CUIx Image Manager discovers embedded bitmaps via this |

Without a `Type="Image"` rel, the BMP is a dead file in the ZIP.

---

## Layer 2 — Package Manifest

```
Menu_Package_Info.xml
```

Lists every part (CUI files + images) with a modification timestamp. AutoCAD uses this for change detection and incremental reload. Every embedded file needs a `PartData` entry here.

---

## Layer 3 — CUI Parts

```
┌─────────────────────────────────────────────────────────────────┐
│                        CUIX Package                             │
│                                                                 │
│  ┌──────────────┐   ┌─────────────────────────────────────┐    │
│  │  Header.cui  │   │           MenuGroup.cui             │    │
│  │              │   │  ┌─────────────────────────────┐    │    │
│  │ FileVersion  │   │  │  MenuMacro  UID="MM_0001"   │    │    │
│  │ PartialMenu  │   │  │  ├── Command: ^C^CMYCMD      │    │    │
│  │   refs       │   │  │  ├── SmallImage: MyBtn.bmp   │    │    │
│  │ ToolTip      │   │  │  └── LargeImage: MyBtn.bmp   │    │    │
│  │   sources    │   │  └─────────────────────────────┘    │    │
│  └──────────────┘   │  ┌─────────────────────────────┐    │    │
│                     │  │  MenuMacro  UID="MM_0002"   │    │    │
│                     │  │  ...                         │    │    │
│                     │  └─────────────────────────────┘    │    │
│                     └─────────────────────────────────────┘    │
│                                    ▲                            │
│                    All UI parts reference MenuMacro by UID      │
│                                    │                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    UI Surface Parts                       │  │
│  │                                                           │  │
│  │  RibbonRoot.cui          ToolbarRoot.cui                  │  │
│  │  ├─ RibbonTabSource      ├─ Toolbar                       │  │
│  │  │  └─ RibbonPanel       │  └─ ToolbarButton              │  │
│  │  │     └─ RibbonRow         MenuMacroID="MM_0001" ───┐    │  │
│  │  │        └─ RibbonCmd                               │    │  │
│  │  │           MenuMacroID="MM_0001" ──────────────────┘    │  │
│  │  │                                                         │  │
│  │  PopMenuRoot.cui         QuickAccessToolbarRoot.cui        │  │
│  │  AcceleratorRoot.cui     WorkspaceRoot.cui                 │  │
│  │  MouseButtonRoot.cui     DoubleClickRoot.cui               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Legacy / Aux Parts                       │  │
│  │                                                           │  │
│  │  ImageMenuRoot.cui       ScreenMenuRoot.cui               │  │
│  │  TabletMenuRoot.cui      DigitizerButtonRoot.cui          │  │
│  │  QuickPropertiesRoot.cui RolloverTooltipRoot.cui          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Embedded Images                          │  │
│  │                                                           │  │
│  │  MyButton.bmp   (16×16 or 32×32, 24-bit BMP)             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 4 — The Indirection Chain

UI elements never directly contain command strings or image data. Everything routes through `MenuGroup.cui`:

```
RibbonCommandButton
  MenuMacroID="MM_0001"
        │
        ▼
  MenuMacro UID="MM_0001"   (in MenuGroup.cui)
  ├── Command: ^C^CMYCMD     ← what executes
  ├── Name: "My Command"     ← tooltip/label source
  ├── SmallImage: "Btn.bmp"  ← 16×16 icon
  └── LargeImage: "Btn.bmp"  ← 32×32 icon
              │
              ▼
        _rels/.rels
        Type="Image" Target="/Btn.bmp"
              │
              ▼
         Btn.bmp   (ZIP entry)
```

One `MenuMacro` can be referenced by ribbon button + toolbar button + QAT button + accelerator simultaneously. Change the command or image in one place → all surfaces update.

---

## CUI Part Reference Sheet

| File | Root Element | Owns |
|---|---|---|
| `Header.cui` | `<CustSection>` | File version, partial CUIX references, tooltip XAML sources |
| `MenuGroup.cui` | `<MenuGroup>` | **All command definitions** — the central registry |
| `RibbonRoot.cui` | `<RibbonRoot>` | Tabs → Panels → Rows → Buttons |
| `ToolbarRoot.cui` | `<ToolbarRoot>` | Classic floating toolbars |
| `PopMenuRoot.cui` | `<PopMenuRoot>` | Right-click context menus |
| `AcceleratorRoot.cui` | `<AcceleratorRoot>` | Keyboard shortcuts |
| `MouseButtonRoot.cui` | `<MouseButtonRoot>` | Mouse button overrides |
| `DoubleClickRoot.cui` | `<DoubleClickRoot>` | Double-click actions per object type |
| `QuickAccessToolbarRoot.cui` | `<QuickAccessToolbarRoot>` | QAT buttons |
| `WorkspaceRoot.cui` | `<WorkspaceRoot>` | Which toolbars/ribbons are visible per workspace |
| `QuickPropertiesRoot.cui` | `<QuickPropertiesRoot>` | Quick Properties panel config |
| `RolloverTooltipRoot.cui` | `<RolloverTooltipRoot>` | Rollover tooltip content per object |
| `ImageMenuRoot.cui` | `<ImageMenuRoot>` | Legacy slide-library image menus |
| `ScreenMenuRoot.cui` | `<ScreenMenuRoot>` | Legacy screen (cursor) menu |
| `TabletMenuRoot.cui` | `<TabletMenuRoot>` | Digitizer tablet menu grid |
| `DigitizerButtonRoot.cui` | `<DigitizerButtonRoot>` | Digitizer puck button assignments |

---

## Image Resolution Chain (custom CUIX only)

```
SmallImage Name="Btn.bmp"
        │
        │  AutoCAD checks _rels/.rels
        ▼
<Relationship Type="Image" Target="/Btn.bmp" Id="R...">
        │
        │  Resolves to ZIP entry
        ▼
/Btn.bmp  (raw BMP bytes in ZIP root)
        │
        │  Content type validated against
        ▼
<Default Extension="bmp" ContentType="image/bmp">  ([Content_Types].xml)
```

`acad.cuix` skips this entire chain — its `RCDATA_16_*` names are Win32 resource IDs resolved
directly from AutoCAD's loaded DLLs at runtime, never touching the ZIP.

---

## Partial vs Main CUIX

| | Main (`acad.cuix`) | Partial (`myplugin.cuix`) |
|---|---|---|
| Loaded by | AutoCAD automatically | `CUILOAD` / `PackageContents.xml` |
| Scope | Full workspace definition | Additive — merges into main |
| `Header.cui` references | Lists other partial CUIXes | Empty / minimal |
| Images | Win32 RCDATA resources | Embedded BMP in ZIP with `Type="Image"` rel |
| `WorkspaceRoot.cui` | Full workspace config | Usually empty stub |

---

## Adding Images — Four Required Steps

| Step | File | Change |
|---|---|---|
| 1 | ZIP root | Add `MyButton.bmp` at root (no subfolder) |
| 2 | `[Content_Types].xml` | `<Default Extension="bmp" ContentType="image/bmp" />` |
| 3 | `_rels/.rels` | `<Relationship Type="Image" Target="/MyButton.bmp" Id="R{unique16hex}" />` |
| 4 | `Menu_Package_Info.xml` | `<PartData PartData_Name="/MyButton.bmp" PartData_Modified="..." />` |

Step 3 is the critical one — without `Type="Image"`, the CUIx Image Manager cannot see the file.

---

## Reference Project

`D:\Dev\32520\src\CuixBuilder\` — console app that generates a minimal valid CUIX from scratch
with one ribbon tab, one panel, one button, and one embedded BMP. No AutoCAD SDK required.

Working real-world reference with embedded BMPs: `D:\Dev\32337\src\One_CAD_Tools\...\OneCadTools100.cuix`
