#!/usr/bin/env node
// Scans a codebase for APS Viewer v7 code that breaks or needs review in v8, and prints the
// findings grouped by migration pattern (P1–P18, see references/patterns/).
//
// Usage: node audit.mjs [path ...] [--json]
//   path    files or folders to scan (default: current folder)
//   --json  print machine-readable output instead of the Markdown report

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const extensions = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx', '.vue', '.svelte', '.html', '.htm', '.json']);
const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt', '.angular', 'vendor', 'bower_components']);
const maxFileSize = 2 * 1024 * 1024;

const patterns = [
    { id: 'P1', file: 'loading-and-init.md', title: 'v7 viewer script/stylesheet URL', regex: /viewers\/7\.[^/'"]*\/(viewer3D\.min\.js|style\.min\.css)/ },
    { id: 'P2', file: 'scene-content.md', title: 'viewer.overlays / OverlayManager', regex: /viewer\.overlays|OverlayManager|overlays\.(addScene|addMesh|removeMesh|removeScene|clearScene)/ },
    { id: 'P3', file: 'scene-content.md', title: 'viewer.impl.scene / sceneAfter', regex: /impl\.(scene|sceneAfter)\b/ },
    { id: 'P4', file: 'scene-content.md', title: 'Autodesk.Viewing.SceneBuilder', regex: /Autodesk\.Viewing\.SceneBuilder|addNewModel|modelBuilder\./ },
    { id: 'P5', file: 'scene-content.md', title: 'three.js types', regex: /\bTHREE\.(\w+)/g, classify: true },
    { id: 'P6', file: 'materials-and-appearance.md', title: 'Custom shaders / material manager', regex: /ShaderMaterial|onBeforeCompile|matman\(\)/ },
    { id: 'P7-P9', file: 'loaded-models.md', title: 'Fragment-level access', regex: /getFragmentList|getFragmentProxy|enumNodeFragments|setFragOff|visibilityManager|updateAnimTransform/ },
    { id: 'P10', file: 'camera-and-picking.md', title: 'Camera mutation / three.js camera', regex: /getCamera\(\)\.(position|target|up)\s*\.set|\.lookAt\(|UnifiedCamera|impl\.camera|syncCamera/ },
    { id: 'P11', file: 'camera-and-picking.md', title: 'Raycasting / projection', regex: /Raycaster|rayIntersect|viewportToRay|impl\.hitTest|\.project\(/ },
    { id: 'P12', file: 'extensions-and-renderer.md', title: 'Autodesk.DataVisualization', regex: /Autodesk\.DataVisualization|DataVizCore|ModelStructureInfo|SpriteViewable|ViewableData/ },
    { id: 'P13', file: 'loaded-models.md', title: 'Memory-limited / LME toggles', regex: /MemoryLimited|LargeModelExperience|getInstanceTree\(/ },
    { id: 'P14', file: 'extensions-and-renderer.md', title: 'WebGL-specific code', regex: /glrenderer|getContext\(\s*['"]webgl|webglcontextlost|preserveDrawingBuffer|navigator\.xr/ },
    { id: 'P15', file: 'loading-and-init.md', title: 'Non-secure origin', regex: /\bhttp:\/\/(?!localhost\b|127\.0\.0\.1\b|\[::1\])[\w.-]+|\bfile:\/\// },
    { id: 'P16', file: 'extensions-and-renderer.md', title: 'Retired extension', regex: /Autodesk\.(FullScreen|NPR|BIM360\.GestureDocumentNavigation|Beeline|CAM360|DataPersistence|DOF|Fusion360\.Simulation|MemoryLimitedDebug|MSDF|OMV|PropertyQuery|PropertySearch|Scalaris|ScalarisSimulation|ReCap)\b/ },
    { id: 'P19', file: 'loaded-models.md', title: 'Bounding boxes from fragments/instances', regex: /getWorldBounds|getOriginalWorldBounds|getNodeBox|getBoundingBox\(|getFuzzyBox|fragList\.boxes|\.boxes\b/ },
    { id: 'P17', file: 'loaded-models.md', title: 'Internal or removed API', regex: /viewer\.impl\.|NOP_VIEWER|getGeometryList|getInstanceTree\(|getProperties2?\(|getBulkProperties2?\(|getPropertySet\(|getExternalIdMapping\(|getLayerToNodeIdMapping\(|\b(model|viewer)\w*\.search\(/ },
];

const viewerConstruction = /new\s+(Autodesk\.Viewing|av)\.(GuiViewer3D|Viewer3D)\s*\(/;
const initializerCall = /(Autodesk\.Viewing|av)\.Initializer\s*\(/;

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
    for (const file of walk(root)) {
        if (statSync(file).size > maxFileSize) {
            continue;
        }
        scanned++;
        const text = readFileSync(file, 'utf8');
        const lines = text.split(/\r?\n/);
        const location = relative(statSync(root).isFile() ? process.cwd() : root, file) || file;
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
                findings.get('P18').push({ file: location, line: index + 1, kind: initializerCall.test(text) ? 'check ordering' : 'no Initializer in file', text: line.trim() });
            }
        });
    }
}

const titles = Object.fromEntries(patterns.map(pattern => [pattern.id, `${pattern.title} → references/patterns/${pattern.file}`]));
titles.P18 = 'Viewer created without Initializer → references/patterns/loading-and-init.md';

if (asJson) {
    console.log(JSON.stringify({ scanned, findings: Object.fromEntries(findings) }, null, 2));
    process.exit(0);
}

let total = 0;
const out = [`# APS Viewer v8 audit`, '', `Scanned ${scanned} files.`, ''];
for (const [id, items] of findings) {
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
