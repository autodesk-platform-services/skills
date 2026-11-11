#!/usr/bin/env node
// Scans a codebase for APS Viewer v7 code that breaks or needs review in v8, and prints the
// findings grouped by migration pattern (P1–P23, see references/patterns/).
//
// Usage: node audit.mjs [path ...] [--json]
//   path    files or folders to scan (default: current folder)
//   --json  print machine-readable output instead of the Markdown report

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';

const extensions = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx', '.vue', '.svelte', '.html', '.htm', '.json', '.razor', '.cshtml', '.pug', '.ejs', '.hbs', '.php', '.aspx', '.jsp', '.erb']);
const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt', '.angular', 'vendor', 'bower_components']);
const maxFileSize = 2 * 1024 * 1024;

const patterns = [
    { id: 'P1', file: 'loading-and-init.md', title: 'v7 or older viewer script/stylesheet URL (legacy forms, pinned versions), removed feature flags', regex: /viewers\/[67]\.[^/'"]*\/(viewer3D(\.min)?\.js|style(\.min)?\.css)|viewingservice\/v1|viewers\/(viewer3D|style)(\.min)?\.(js|css)|viewers\/\$\{|viewers\/['"`]\s*\+|\bviewerVersion\b|PublicFeatureFlags\.(SceneAPI|LargeModelExperience|WebGPU)\b|FeatureFlags\.set\(\s*['"](SceneAPI|LargeModelExperience|WebGPU)['"]/ },
    { id: 'P2', file: 'scene-content.md', title: 'viewer.overlays / viewer.layers / OverlayManager', regex: /viewer\.overlays|viewer\.layers\b|OverlayManager|overlays\.(addScene|addMesh|removeMesh|removeScene|clearScene)/ },
    { id: 'P3', file: 'scene-content.md', title: 'viewer.impl.scene / sceneAfter', regex: /impl\.(scene|sceneAfter)\b/ },
    { id: 'P4', file: 'scene-content.md', title: 'Autodesk.Viewing.SceneBuilder', regex: /Autodesk\.Viewing\.SceneBuilder|addNewModel|modelBuilder\./ },
    { id: 'P5', file: 'scene-content.md', title: 'three.js types', regex: /\bTHREE\.(\w+)/g, classify: true },
    { id: 'P5', file: 'scene-content.md', title: 'three.js types', regex: /\b(ThreeCSG|ThreeBSP|TransformControls|OrbitControls|TrackballControls|window\.THREE|globalThis\.THREE)\b/, kind: 'needs global THREE' },
    { id: 'P5', file: 'scene-content.md', title: 'three.js types', regex: /\/\/\/\s*<reference\s+types=["'](forge-viewer|three)["']/, kind: 'v7 typings reference' },
    { id: 'P6', file: 'materials-and-appearance.md', title: 'Custom shaders / material manager', regex: /ShaderMaterial|onBeforeCompile|matman\(\)/ },
    { id: 'P7-P9', file: 'loaded-models.md', title: 'Fragment-level access', regex: /getFragmentList|getFragmentProxy|enumNodeFragments|setFragOff|visibilityManager|updateAnimTransform/ },
    { id: 'P10', file: 'camera-and-picking.md', title: 'Camera mutation / three.js camera', regex: /getCamera\(\)\.(position|target|up)\s*\.set|\.lookAt\(|UnifiedCamera|impl\.camera|syncCamera|shotParams|transitionView|toOrthographic|toPerspective|getHitPoint/ },
    { id: 'P11', file: 'camera-and-picking.md', title: 'Raycasting / projection', regex: /Raycaster|rayIntersect|viewportToRay|impl\.hitTest|castRayViewport|clientToViewport|\.project\(/ },
    { id: 'P12', file: 'extensions-and-renderer.md', title: 'Autodesk.DataVisualization', regex: /Autodesk\.DataVisualization|DataVizCore|ModelStructureInfo|SpriteViewable|ViewableData/ },
    { id: 'P13', file: 'loaded-models.md', title: 'Memory-limited / LME toggles', regex: /MemoryLimited|LargeModelExperience/ },
    { id: 'P14', file: 'extensions-and-renderer.md', title: 'WebGL-specific code', regex: /glrenderer|getContext\(\s*['"]webgl|webglcontextlost|preserveDrawingBuffer|navigator\.xr|webglInitParams|useWebGL2|renderer:\s*['"]webgl['"]/ },
    { id: 'P15', file: 'loading-and-init.md', title: 'Non-secure origin', regex: /\bhttp:\/\/(?!localhost\b|127\.0\.0\.1\b|\[::1\])[\w.-]+|\bfile:\/\// },
    { id: 'P16', file: 'extensions-and-renderer.md', title: 'Retired or unverified extension', regex: /Autodesk\.Viewing\.WebVR|\bwebVR\b|Autodesk\.AEC\.LevelsExtension|FloorSelector|VisualClusters|StringExtractor|BoxSelection|Autodesk\.Viewing\.MarkupsGui|BIM360\.Extension\.PushPin|Autodesk\.(FullScreen|NPR|DWF|GoHome|ViewerSettings|BIM360\.GestureDocumentNavigation|Beeline|CAM360|DataPersistence|DOF|Fusion360\.Simulation|MemoryLimitedDebug|MSDF|OMV|PropertyQuery|PropertySearch|Scalaris|ScalarisSimulation|ReCap)\b/ },
    { id: 'P17', file: 'loaded-models.md', title: 'Internal, removed, or changed API', regex: /\w*[vV]iewer\w*\.impl\.|\bimpl\.(castRayViewport|clientToViewport|worldToClient|highlightObjectNode|clearHighlight|visibilityManager|layers|findModel|unloadModel|clickHandler|invalidate|sceneUpdated|matman|getFragmentProxy|getRenderProxy|intersectGround|glrenderer|camera|canvas|getCanvasBoundingClientRect|createOverlayScene|removeOverlayScene|addOverlay|removeOverlay|renderer|hitTest|viewportToRay|rayIntersect)\b|\.instanceTree\b|\w*[vV]iewer\w*\.(utilities|autocam)\b|viewers\[[^\]]+\]\.(utilities|autocam)\b|\bviewer\w*\.model\b|\.myData\b|\.getData\(\)\.(urn|globalOffset|loadOptions|modelSpaceBBox|getPDF)|loader\.svfUrn|[gs]etPlacementTransform|getSeedUrn|nodeAccess|dbIdToIndex|isNodeOff|aggregateIsolate|clickHandler|getPropertyDb\(\)\.get\w+|setGroundReflection|setScreenMode|showModelStructurePanel|NOP_VIEWER|Autodesk\.Viewing\.Private\b|\bav\.Private\b|\bviewer\w*\.prefs\b|setPropertiesOnSelect|viewer\w*\.searchText\b|getGeometryList|getInstanceTree\(|getProperties2?\(|getBulkProperties2?\(|getPropertySet\(|getExternalIdMapping\(|getLayerToNodeIdMapping\(|getObjectTree\(\s*(function|\(|\w+\s*=>|\w+\s*[,)])|\b(model|viewer)\w*\.search\(|(getInstances\(\)|instances\w*)\.getCount\(\)|setAggregateSelection\(/ },
    { id: 'P19', file: 'loaded-models.md', title: 'Bounding boxes from fragments/instances', regex: /getWorldBounds|getOriginalWorldBounds|getNodeBox|getBoundingBox\(|getFuzzyBox|fragList\.boxes|\.boxes\b/ },
    { id: 'P20', file: 'extensions-and-renderer.md', title: 'ES5-style extension or viewer subclass', regex: /(Autodesk\.Viewing|\bav)\.(\w+\.)*\w+\.call\(\s*this\b|Object\.create\(\s*(Autodesk\.Viewing|\bav)\.(\w+\.)*\w+\.prototype\s*\)|(Autodesk\.Viewing|\bav)\.(\w+\.)*\w+\.prototype\.\w+\.(call|apply)\(\s*this\b/ },
    { id: 'P21', file: 'loading-and-init.md', title: 'Legacy loading APIs, load/Initializer options, early window.Autodesk access', regex: /ViewingApplication|registerViewer|startWithDocumentNode|skipPropertyDb|extendStringsFetching|preserveView|useConsolidation|useADP|downloadAecModelData|getViewablePath|bubble\.json|\bisAEC\s*:|experimental\s*:\s*\[|\b(derivativeV2|streamingV2)['"]?\s*\+|(derivativeV2|streamingV2)_(EU|AUS)|\bsetUp\(|\btearDown\(|\{\s*Autodesk\s*\}\s*=\s*window|\baccessToken\s*:/ },
    { id: 'P22', file: 'extensions-and-renderer.md', title: 'UI subclasses and viewer DOM/CSS coupling', regex: /ViewerPropertyPanel|ViewerObjectContextMenu|TreeDelegate|registerContextMenuCallback|createTitleBar|initializeMoveHandlers|createFooter|createScrollContainer|\bdockRight\b|adsk-viewing-viewer|adsk-button|docking-panel-container|button\.container|viewer\.canvas\.(width|height)|clientContainer/ },
    { id: 'P23', file: 'loading-and-init.md', ref: 'SKILL.md (step 2, "Scripts to verify with their owners")', title: 'Non-APS script that may touch Autodesk.Viewing', regex: /<script[^>]+src\s*=\s*["'](?!https:\/\/developer\.api\.autodesk\.com)(https?:)?\/\/[^"']*(autodesk|forge|lmv)[^"']*["']|\b(Utilities|NestedViewerExtension|InformedDesignExtension|TransformControls|Potree)\.js\b/i },
];

const viewerConstruction = /new\s+(Autodesk\.Viewing|av)\.(GuiViewer3D|Viewer3D)\s*\(/;
const initializerCall = /(Autodesk\.Viewing|av)\.Initializer\s*\(/;
const initializerCalls = /(Autodesk\.Viewing|\bav)\.Initializer\s*\(/g;
// The legacy SVF endpoint; moving loaded parts is reported to break with it (see loading-and-init.md).
const legacyEnv = /\benv\s*:\s*['"]AutodeskProduction['"]/;
// Subclassing three.js types (ES5 or ES6) needs a rewrite, not a namespace rename.
const threeSubclass = /THREE\.\w+\.(call|apply)\(\s*this\b|Object\.create\(\s*THREE\.\w+\.prototype|extends\s+THREE\.\w+/;

// package.json dependencies that pull three.js or v7 viewer typings into the app.
const packageDeps = new Set(['three', '@types/three', 'forge-viewer', '@types/forge-viewer']);

// Groups three.js type names by the v8 pattern that replaces them.
function classifyThree(name) {
    if (/Material$/.test(name)) return 'material (P6)';
    if (/Geometry$|BufferAttribute$/.test(name)) return 'geometry (P5)';
    if (/^(Vector[234]|Matrix[34]|Quaternion|Box[23]|Euler|Plane|Sphere|Ray|Line3|Frustum|Math)$/.test(name)) return 'math (P5)';
    if (name === 'Color') return 'color (P5)';
    if (/Texture$/.test(name)) return 'texture (P5)';
    if (name === 'Raycaster') return 'raycasting (P11)';
    if (/Camera$/.test(name)) return 'camera (P10)';
    if (/Renderer$|RenderTarget$/.test(name)) return 'renderer (P14)';
    return 'object (P5)';
}

// Initializer(options, callback): the callback form is deprecated in favor of the returned promise.
// Balances brackets from the opening parenthesis, so multi-line and nested options are handled.
function initializerCallbackLines(text) {
    const lines = [];
    for (const match of text.matchAll(initializerCalls)) {
        let depth = 0;
        for (let i = match.index + match[0].length; i < text.length; i++) {
            const ch = text[i];
            if ('([{'.includes(ch)) depth++;
            else if (')]}'.includes(ch)) {
                if (depth-- === 0) break;
            } else if (ch === ',' && depth === 0) {
                if (/^\s*[^\s)]/.test(text.slice(i + 1))) {
                    lines.push(text.slice(0, match.index).split(/\r?\n/).length);
                }
                break;
            }
        }
    }
    return lines;
}

const skipped = [];

// Returns true if a skipped folder contains script files, so the report can say it wasn't scanned.
function hasScripts(path) {
    try {
        return readdirSync(path, { withFileTypes: true }).some(entry => entry.isDirectory()
            ? entry.name !== 'node_modules' && hasScripts(join(path, entry.name))
            : /\.(m?js|cjs|ts|tsx|jsx)$/.test(entry.name));
    } catch {
        return false;
    }
}

function* walk(path) {
    const stats = statSync(path);
    if (stats.isFile()) {
        yield path;
        return;
    }
    for (const entry of readdirSync(path, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!skipDirs.has(entry.name) && !entry.name.startsWith('.')) {
                yield* walk(join(path, entry.name));
            } else if (entry.name !== 'node_modules' && entry.name !== '.git' && hasScripts(join(path, entry.name))) {
                skipped.push(`${join(path, entry.name)}/ (folder skipped)`);
            }
        } else if (extensions.has(extname(entry.name)) && !/\.min\.(js|css)$/.test(entry.name) && entry.name !== 'package-lock.json') {
            yield join(path, entry.name);
        } else if (/\.min\.js$/.test(entry.name) && !/^viewer3D/.test(entry.name)) {
            skipped.push(`${join(path, entry.name)} (minified)`);
        }
    }
}

// Lists dependencies from package.json that conflict with v8 (P5).
function packageFindings(text, location) {
    let pkg;
    try {
        pkg = JSON.parse(text);
    } catch {
        return [];
    }
    const lines = text.split(/\r?\n/);
    const results = [];
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
        for (const name of Object.keys(pkg[section] ?? {})) {
            if (packageDeps.has(name)) {
                const index = lines.findIndex(line => line.includes(`"${name}"`));
                results.push({ file: location, line: index + 1, kind: `package (${section})`, text: `"${name}": "${pkg[section][name]}"` });
            }
        }
    }
    return results;
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const roots = args.filter(arg => arg !== '--json');
if (roots.length === 0) {
    roots.push('.');
}

const findings = new Map(patterns.map(pattern => [pattern.id, []]));
findings.set('P18', []);
let scanned = 0;

for (const root of roots) {
    // Report paths relative to the scanned folder (or the scanned file's folder).
    const base = statSync(root).isFile() ? dirname(resolve(root)) : resolve(root);
    for (const file of walk(root)) {
        if (statSync(file).size > maxFileSize) {
            skipped.push(`${file} (larger than 2 MB)`);
            continue;
        }
        scanned++;
        const text = readFileSync(file, 'utf8');
        const lines = text.split(/\r?\n/);
        const location = relative(base, resolve(file)) || basename(file);
        if (basename(file) === 'package.json') {
            findings.get('P5').push(...packageFindings(text, location));
            continue;
        }
        const hasInitializer = initializerCall.test(text);
        const initializerSites = [];
        for (const line of initializerCallbackLines(text)) {
            findings.get('P18').push({ file: location, line, kind: 'callback form, use await', text: lines[line - 1].trim() });
        }
        lines.forEach((line, index) => {
            for (const pattern of patterns) {
                if (pattern.classify) {
                    const subclass = threeSubclass.test(line);
                    for (const match of line.matchAll(pattern.regex)) {
                        findings.get(pattern.id).push({ file: location, line: index + 1, kind: subclass ? 'subclass, rewrite (P5, P20)' : classifyThree(match[1]), text: line.trim() });
                    }
                } else if (pattern.regex.test(line)) {
                    findings.get(pattern.id).push({ file: location, line: index + 1, kind: pattern.kind, text: line.trim() });
                }
            }
            if (viewerConstruction.test(line)) {
                findings.get('P18').push({ file: location, line: index + 1, kind: hasInitializer ? 'check ordering' : 'no Initializer in file', text: line.trim() });
            }
            if (legacyEnv.test(line)) {
                findings.get('P18').push({ file: location, line: index + 1, kind: 'legacy env, prefer AutodeskProduction2 + streamingV2', text: line.trim() });
            }
            if (initializerCall.test(line)) {
                initializerSites.push({ file: location, line: index + 1, text: line.trim() });
            }
        });
        // The Initializer must run once per page. Separate pages may each call it once, so only
        // repeated calls within one file are flagged.
        if (initializerSites.length > 1) {
            for (const site of initializerSites) {
                findings.get('P18').push({ ...site, kind: `${initializerSites.length} Initializer calls in file, run once per page` });
            }
        }
    }
}

const titles = Object.fromEntries(patterns.map(pattern => [pattern.id, `${pattern.title} → ${pattern.ref ?? `references/patterns/${pattern.file}`}`]));
titles.P18 = 'Viewer creation and Initializer → references/patterns/loading-and-init.md';

if (asJson) {
    console.log(JSON.stringify({ scanned, skipped, findings: Object.fromEntries(findings) }, null, 2));
    process.exit(0);
}

const order = (id) => Number(id.match(/\d+/)[0]);
let total = 0;
const out = [`# APS Viewer v8 audit`, '', `Scanned ${scanned} files.`, ''];
for (const [id, items] of [...findings].sort(([a], [b]) => order(a) - order(b))) {
    if (items.length === 0) {
        continue;
    }
    total += items.length;
    out.push(`## ${id}: ${titles[id]} (${items.length})`, '');
    for (const item of items) {
        const kind = item.kind ? ` [${item.kind}]` : '';
        out.push(`- ${item.file}:${item.line}${kind}: \`${item.text.slice(0, 160)}\``);
    }
    out.push('');
}
if (skipped.length > 0) {
    out.push(`## Not scanned (${skipped.length})`, '', 'Scan these separately if they contain app code (for example a vendored gizmo or a copied helper):', '');
    out.push(...skipped.map(path => {
        const shown = relative(process.cwd(), resolve(path));
        return `- ${shown.startsWith('..') ? resolve(path) : shown}`;
    }), '');
}
out.push(total === 0 ? 'No findings.' : `${total} findings in total.`);
console.log(out.join('\n'));
