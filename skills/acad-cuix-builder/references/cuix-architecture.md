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

## Extended Tooltips (XAML)

Extended tooltips show animated GIFs and rich text on hover. Requires two things:

### 1. Standalone XAML file (in bundle Contents/Win64/)

```xml
<ResourceDictionary
  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
  xmlns:src="clr-namespace:Autodesk.Windows;assembly=AdWindows">

  <src:RibbonToolTip x:Key="RBN_BTN_000_000"
      Title="Zoom to selected objects"
      HelpTopic="zoomsel"
      HelpSource="C:\absolute\path\to\DraftingTools.chm"
      IsHelpEnabled="True">
    <src:RibbonToolTip.ExpandedContent>
      <StackPanel>
        <TextBlock Background="AntiqueWhite" TextWrapping="Wrap">Description text here</TextBlock>
        <Image Source="zoomsel.gif" Width="Auto" Height="Auto" />
      </StackPanel>
    </src:RibbonToolTip.ExpandedContent>
  </src:RibbonToolTip>

</ResourceDictionary>
```

**Key rules:**
- `x:Key` must match button `BtnUid` (e.g. `RBN_BTN_000_000`)
- `Image Source` = filename only — AutoCAD resolves via SupportPath (bundle Contents/Win64/)
- `HelpSource` = **absolute** deployed path to CHM
- `HelpTopic` = anchor name only (e.g. `zoomsel`, NOT `zoomsel.htm`)

### 2. MenuGroup.cui ToolTip element

```xml
<ToolTip HelpTopic="zoomsel"
         HelpSource="C:\absolute\path\to\DraftingTools.chm">
  <ExtendedContent
    UriSource="C:\absolute\path\to\DraftingTools_ToolTips.xaml"
    SourceKey="RBN_BTN_000_000" />
</ToolTip>
```

**Key rules:**
- `UriSource` = **absolute** deployed path to XAML — relative/filename-only paths are ignored
- `SourceKey` = same `x:Key` as in XAML ResourceDictionary
- `HelpTopic` = anchor name (no `.htm`)
- `HelpSource` = absolute path to CHM

### GIF specs
- Size: 300×187px recommended
- Max: 30KB, ≤58 frames
- Format: animated GIF
- Placement: bundle `Contents/Win64/` alongside XAML

---

## F1 Help — PackageContents.xml + CHM

F1 help is wired via `PackageContents.xml`. Tested working in AutoCAD 2027.

### PackageContents.xml structure

```xml
<ApplicationPackage
    HelpFile="./Contents/Win64/DraftingTools.chm">

  <RuntimeRequirements SupportPath="./Contents/Win64" ... />

  <Components>
    <ComponentEntry ModuleName="./Contents/Win64/DraftingTools.lsp" ...>
      <Commands GroupName="DRAFTINGTOOLS">
        <Command Local="ZOOMSEL" Global="ZOOMSEL" HelpTopic="zoomsel" />
        <Command Local="LAYISO"  Global="LAYISO"  HelpTopic="layiso"  />
      </Commands>
    </ComponentEntry>
  </Components>
</ApplicationPackage>
```

**Key rules:**
- `HelpFile` = relative path to CHM from bundle root
- `HelpTopic` = anchor name only (no `.htm` extension)
- `SupportPath` = adds bundle folder to AutoCAD's support file search path

### CHM structure (.hhp project)

```ini
[OPTIONS]
Compiled file=DraftingTools.chm
Default topic=zoomsel.htm

[FILES]
zoomsel.htm
layiso.htm

[MAP]
#define zoomsel 1000
#define layiso  1001

[ALIAS]
zoomsel=1000
layiso=1001
```

Each HTM file needs `<a id="zoomsel"></a>` anchor. Compile with `hhc.exe` (HTML Help Workshop).

### F1 resolution chain

```
User presses F1 on ribbon button
        │
        ▼
MenuGroup.cui ToolTip HelpTopic="zoomsel" + HelpSource="...DraftingTools.chm"
        │
        ▼
PackageContents.xml <Command HelpTopic="zoomsel"> + HelpFile="./Contents/Win64/DraftingTools.chm"
        │
        ▼
DraftingTools.chm — [ALIAS] zoomsel → 1000 → zoomsel.htm
        │
        ▼
zoomsel.htm displayed in AutoCAD Help viewer
```

---

## Bundle Folder Structure

```
DraftingTools.bundle/
├── PackageContents.xml
└── Contents/
    └── Win64/
        ├── DraftingTools.cuix          ← ribbon definition
        ├── DraftingTools_ToolTips.xaml ← extended tooltip XAML
        ├── DraftingTools.chm           ← F1 help
        ├── DraftingTools.lsp           ← LISP commands
        ├── zoomsel.bmp                 ← ribbon button icon (16×16)
        ├── layiso.bmp
        ├── zoomsel.gif                 ← tooltip animation
        └── layiso.gif
```

AutoCAD auto-loads the bundle from `%APPDATA%\Autodesk\ApplicationPlugins\` on startup — no `CUILOAD` needed.

---

## Reference Project

`https://github.com/ADN-DevTech/acad-cuix-builder` — console app that generates a complete valid bundle from a JSON config. No AutoCAD SDK required.
