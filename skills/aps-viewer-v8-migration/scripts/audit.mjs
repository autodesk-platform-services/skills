#!/usr/bin/env node
// Scans a codebase for APS Viewer v7 code that breaks or needs review in v8, and prints the
// findings grouped by migration pattern (P1–P20, see references/patterns/).
//
// Usage: node audit.mjs [path ...] [--json]
//   path    files or folders to scan (default: current folder)
//   --json  print machine-readable output instead of the Markdown report

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';

const extensions = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx', '.vue', '.svelte', '.html', '.htm', '.json']);
const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt', '.angular', 'vendor', 'bower_components']);
const maxFileSize = 2 * 1024 * 1024;

const patterns = [
    { id: 'P1', file: 'loading-and-init.md', title: 'v7 viewer script/stylesheet URL, removed feature flags', regex: /viewers\/7\.[^/'"]*\/(viewer3D(\.min)?\.js|style(\.min)?\.css)|PublicFeatureFlags\.(SceneAPI|LargeModelExperience|WebGPU)\b|FeatureFlags\.set\(\s*['"](SceneAPI|LargeModelExperience|WebGPU)['"]/ },
    { id: 'P2', file: 'scene-content.md', title: 'viewer.overlays / viewer.layers / OverlayManager', regex: /viewer\.overlays|viewer\.layers\b|OverlayManager|overlays\.(addScene|addMesh|removeMesh|removeScene|clearScene)/ },
    { id: 'P3', file: 'scene-content.md', title: 'viewer.impl.scene / sceneAfter', regex: /impl\.(scene|sceneAfter)\b/ },
    { id: 'P4', file: 'scene-content.md', title: 'Autodesk.Viewing.SceneBuilder', regex: /Autodesk\.Viewing\.SceneBuilder|addNewModel|modelBuilder\./ },
    { id: 'P5', file: 'scene-content.md', title: 'three.js types', regex: /\bTHREE\.(\w+)/g, classify: true },
    { id: 'P6', file: 'materials-and-appearance.md', title: 'Custom shaders / material manager', regex: /ShaderMaterial|onBeforeCompile|matman\(\)/ },
    { id: 'P7-P9', file: 'loaded-models.md', title: 'Fragment-level access', regex: /getFragmentList|getFragmentProxy|enumNodeFragments|setFragOff|visibilityManager|updateAnimTransform/ },
    { id: 'P10', file: 'camera-and-picking.md', title: 'Camera mutation / three.js camera', regex: /getCamera\(\)\.(position|target|up)\s*\.set|\.lookAt\(|UnifiedCamera|impl\.camera|syncCamera/ },
    { id: 'P11', file: 'camera-and-picking.md', title: 'Raycasting / projection', regex: /Raycaster|rayIntersect|viewportToRay|impl\.hitTest|\.project\(/ },
    { id: 'P12', file: 'extensions-and-renderer.md', title: 'Autodesk.DataVisualization', regex: /Autodesk\.DataVisualization|DataVizCore|ModelStructureInfo|SpriteViewable|ViewableData/ },
    { id: 'P13', file: 'loaded-models.md', title: 'Memory-limited / LME toggles', regex: /MemoryLimited|LargeModelExperience/ },
    { id: 'P14', file: 'extensions-and-renderer.md', title: 'WebGL-specific code', regex: /glrenderer|getContext\(\s*['"]webgl|webglcontextlost|preserveDrawingBuffer|navigator\.xr|renderer:\s*['"]webgl['"]/ },
    { id: 'P15', file: 'loading-and-init.md', title: 'Non-secure origin', regex: /\bhttp:\/\/(?!localhost\b|127\.0\.0\.1\b|\[::1\])[\w.-]+|\bfile:\/\// },
    { id: 'P16', file: 'extensions-and-renderer.md', title: 'Retired extension', regex: /Autodesk\.(FullScreen|NPR|GoHome|ViewerSettings|BIM360\.GestureDocumentNavigation|Beeline|CAM360|DataPersistence|DOF|Fusion360\.Simulation|MemoryLimitedDebug|MSDF|OMV|PropertyQuery|PropertySearch|Scalaris|ScalarisSimulation|ReCap)\b/ },
    { id: 'P17', file: 'loaded-models.md', title: 'Internal, removed, or changed API', regex: /viewer\.impl\.|NOP_VIEWER|Autodesk\.Viewing\.Private\b|\bav\.Private\b|\bviewer\w*\.prefs\b|setPropertiesOnSelect|viewer\w*\.searchText\b|getGeometryList|getInstanceTree\(|getProperties2?\(|getBulkProperties2?\(|getPropertySet\(|getExternalIdMapping\(|getLayerToNodeIdMapping\(|getObjectTree\(\s*(function|\(|\w+\s*=>|\w+\s*[,)])|\b(model|viewer)\w*\.search\(|(getInstances\(\)|instances\w*)\.getCount\(\)|setAggregateSelection\(/ },
    { id: 'P19', file: 'loaded-models.md', title: 'Bounding boxes from fragments/instances', regex: /getWorldBounds|getOriginalWorldBounds|getNodeBox|getBoundingBox\(|getFuzzyBox|fragList\.boxes|\.boxes\b/ },
    { id: 'P20', file: 'extensions-and-renderer.md', title: 'ES5-style extension or viewer subclass', regex: /(Autodesk\.Viewing|\bav)\.(UI\.)?\w+\.call\(\s*this\b|Object\.create\(\s*(Autodesk\.Viewing|\bav)\.(UI\.)?\w+\.prototype\s*\)|(Autodesk\.Viewing|\bav)\.(UI\.)?\w+\.prototype\.\w+\.(call|apply)\(\s*this\b/ },
];

const viewerConstruction = /new\s+(Autodesk\.Viewing|av)\.(GuiViewer3D|Viewer3D)\s*\(/;
const initializerCall = /(Autodesk\.Viewing|av)\.Initializer\s*\(/;
// Initializer(options, callback): the callback form is deprecated in favor of the returned promise.
const initializerCallback = /(Autodesk\.Viewing|av)\.Initializer\s*\(\s*([\w.$]+|\{[^}]*\})\s*,\s*(function\b|\(|async\b|[\w$]+\s*(=>|\)))/;

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
            }
        } else if (extensions.has(extname(entry.name)) && !/\.min\.(js|css)$/.test(entry.name) && entry.name !== 'package-lock.json') {
            yield join(path, entry.name);
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
        lines.forEach((line, index) => {
            for (const pattern of patterns) {
                if (pattern.classify) {
                    for (const match of line.matchAll(pattern.regex)) {
                        findings.get(pattern.id).push({ file: location, line: index + 1, kind: classifyThree(match[1]), text: line.trim() });
                    }
                } else if (pattern.regex.test(line)) {
                    findings.get(pattern.id).push({ file: location, line: index + 1, text: line.trim() });
                }
            }
            if (viewerConstruction.test(line)) {
                findings.get('P18').push({ file: location, line: index + 1, kind: hasInitializer ? 'check ordering' : 'no Initializer in file', text: line.trim() });
            }
            if (initializerCallback.test(line)) {
                findings.get('P18').push({ file: location, line: index + 1, kind: 'callback form, use await', text: line.trim() });
            }
        });
    }
}

const titles = Object.fromEntries(patterns.map(pattern => [pattern.id, `${pattern.title} → references/patterns/${pattern.file}`]));
titles.P18 = 'Viewer creation and Initializer → references/patterns/loading-and-init.md';

if (asJson) {
    console.log(JSON.stringify({ scanned, findings: Object.fromEntries(findings) }, null, 2));
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
out.push(total === 0 ? 'No findings.' : `${total} findings in total.`);
console.log(out.join('\n'));
