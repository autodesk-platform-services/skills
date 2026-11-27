#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  echo "Usage: bash new-forma-extension.sh <new-project-directory>" >&2
  exit 1
fi

command -v node >/dev/null || { echo "Node 20+ is required." >&2; exit 1; }
command -v npm >/dev/null || { echo "npm is required." >&2; exit 1; }
node -e 'if (Number(process.versions.node.split(".")[0]) < 20) { console.error("Node 20+ is required."); process.exit(1); }'

target=$1
if [[ -L "$target" || ( -e "$target" && ! -d "$target" ) ]]; then
  echo "Destination must be a directory, not a file or symlink: $target" >&2
  exit 1
fi
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
assets_dir="$script_dir/../assets"
for asset in README-template.md buttons.yaml; do
  [[ -f "$assets_dir/$asset" ]] || { echo "Missing bundled asset: $asset" >&2; exit 1; }
done

destination=$(mktemp -d "${TMPDIR:-/tmp}/forma-extension.XXXXXX")
trap 'rm -rf -- "$destination"' EXIT
mkdir -- "$destination/src"

cat > "$destination/package.json" <<'EOF'
{
  "name": "forma-extension",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": { "forma-embedded-view-sdk": "0.96.0" },
  "devDependencies": { "typescript": "5.9.3", "vite": "6.4.3" }
}
EOF

cat > "$destination/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
EOF

cat > "$destination/vite.config.ts" <<'EOF'
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5173, strictPort: true },
});
EOF

cat > "$destination/.gitignore" <<'EOF'
node_modules/
dist/
EOF

cat > "$destination/index.html" <<'EOF'
<!doctype html>
<html lang="en-US">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://app.autodeskforma.eu/design-system/v2/forma/styles/base.css" />
    <script type="module" src="https://app.autodeskforma.eu/design-system/v2/weave/components/tab/weave-tab.js"></script>
    <script type="module" src="https://app.autodeskforma.eu/design-system/v2/weave/components/button/weave-button.js"></script>
    <style>
      :root { font-size: 10px; --space-1: 4px; --space-2: 8px; --space-3: 16px; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--background-color-surface-100); color: var(--text-color-medium-default); font: var(--12-regular); }
      main { width: 100%; max-width: 440px; padding: 0 var(--space-3) var(--space-3); }
      header { min-height: 48px; display: flex; align-items: center; }
      h1 { margin: 0; font: var(--12-bold); }
      weave-tabs { display: block; width: 100%; }
      weave-tab { width: auto; }
      .tab-content { width: 100%; padding: var(--space-3) 0; vertical-align: top; }
      .tab-content[aria-hidden="true"], [hidden] { display: none !important; }
      .metric, .field { min-height: 36px; display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
      .metric-value { text-align: right; font: var(--12-medium); font-variant-numeric: tabular-nums; }
      label { font: var(--11-medium); }
      input { width: 50%; min-width: 0; height: 24px; padding: 0 var(--space-2); border: 1px solid var(--border-color-input-box); background: var(--background-color-input-box); color: inherit; font: var(--12-regular); }
      .helper { margin: var(--space-1) 0 0; color: var(--text-color-light); font: var(--11-regular); }
      #status { min-height: 64px; margin: var(--space-3) 0; overflow-wrap: anywhere; }
      .primary { display: block; width: 100%; margin-top: var(--space-3); }
      input:focus-visible, weave-button::part(button):focus-visible { outline: 2px solid var(--text-color-accent); outline-offset: 2px; }
    </style>
    <title>Forma extension</title>
  </head>
  <body>
    <main>
      <header><h1>Forma extension</h1></header>
      <weave-tabs init="0" gap="8" variant="underlined">
        <weave-tab label="Summary" variant="underlined" hpadding="8"></weave-tab>
        <weave-tab label="Controls" variant="underlined" hpadding="8"></weave-tab>
        <section class="tab-content" slot="content" aria-label="Summary" aria-hidden="false">
          <div class="metric"><span>Building paths</span><span id="building-count" class="metric-value">—</span></div>
        </section>
        <section class="tab-content" slot="content" aria-label="Controls" aria-hidden="true">
          <div class="field"><label for="example-limit">Example limit</label><input id="example-limit" type="text" inputmode="decimal" value="6.972" aria-describedby="number-help" /></div>
          <p id="number-help" class="helper">Decimal input example; does not filter the building count.</p>
        </section>
      </weave-tabs>
      <weave-button id="refresh" class="primary" variant="solid" density="high">Refresh</weave-button>
      <p id="status" role="status">Loading…</p>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
EOF

cat > "$destination/src/main.ts" <<'EOF'
const statusElement = document.querySelector<HTMLParagraphElement>("#status")!;
const refresh = document.querySelector<HTMLElement>("#refresh")!;
const buildingCount = document.querySelector<HTMLElement>("#building-count")!;
const exampleLimit = document.querySelector<HTMLInputElement>("#example-limit")!;
const params = new URLSearchParams(window.location.search);
const embedded = window.parent !== window;
const fixture = !embedded && params.get("fixture") === "1";
let generation = 0;

// Keep editable values ungrouped so a comma can only mean a decimal separator.
function formatDecimal(value: number): string {
  return new Intl.NumberFormat("en-US", { useGrouping: false, maximumFractionDigits: 15 }).format(value);
}

function parseDecimal(raw: string): number | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  return /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value) ? Number(value.replace(",", ".")) : NaN;
}

exampleLimit.addEventListener("input", () => exampleLimit.setCustomValidity(""));
exampleLimit.addEventListener("change", () => {
  const value = parseDecimal(exampleLimit.value);
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    exampleLimit.setCustomValidity("Enter a non-negative number using . or , for decimals, without grouping separators.");
    exampleLimit.reportValidity();
    return;
  }
  exampleLimit.setCustomValidity("");
  exampleLimit.value = value === undefined ? "" : formatDecimal(value);
});

// Observed CDN tabs animate inside an open shadow root, beyond page CSS.
// No added motion; suppress their native transition when reduced motion is set.
void customElements.whenDefined("weave-tab").then(() => {
  document.querySelectorAll("weave-tab").forEach(tab => {
    const style = document.createElement("style");
    style.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }";
    tab.shadowRoot?.append(style);
  });
});

function message(text: string) {
  statusElement.textContent = text;
}

async function load() {
  const current = ++generation;
  buildingCount.textContent = "—";
  if (!embedded && !fixture) {
    message("Open this extension inside Forma, or add ?fixture=1 for a synthetic preview.");
    refresh.hidden = true;
    return;
  }
  message("Loading buildings…");
  if (fixture) {
    const state = params.get("state");
    if (state === "loading") return;
    if (state === "error") {
      message("Synthetic error: building data is unavailable. Select Refresh to retry.");
    } else if (state === "empty") {
      buildingCount.textContent = "0";
      message("Synthetic empty site. In Forma, draw a building or order Overture buildings, then refresh.");
    } else {
      buildingCount.textContent = "2";
      message("Synthetic preview: 2 building paths. Open in Forma to read the current proposal.");
    }
    return;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const read = async () => {
      const { Forma } = await import("forma-embedded-view-sdk/auto");
      await Forma.proposal.awaitProposalPersisted();
      const [rootUrn, proposalId] = await Promise.all([
        Forma.proposal.getRootUrn(), Forma.proposal.getId(),
      ]);
      const paths = await Forma.geometry.getPathsByCategory({ category: "building", urn: rootUrn });
      if (await Forma.proposal.getRootUrn() !== rootUrn ||
          await Forma.proposal.getId() !== proposalId) {
        throw new Error("Proposal changed while loading");
      }
      return paths;
    };
    const paths = await Promise.race([
      read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Forma did not respond within 8 seconds")), 8000);
      }),
    ]);
    if (current !== generation) return;
    buildingCount.textContent = new Intl.NumberFormat("en-US").format(paths.length);
    message(paths.length
      ? `${paths.length} building paths in this proposal, including context. Select Refresh after edits.`
      : "No buildings found. Draw a building or order Overture buildings in Contextual data, then refresh.");
  } catch (error) {
    if (current !== generation) return;
    const detail = error instanceof Error ? error.message : String(error);
    message(`${detail}. Check that this view is open in Forma, then select Refresh.`);
  } finally {
    clearTimeout(timer);
  }
}

refresh.addEventListener("click", () => {
  params.delete("state");
  void load();
});
void load();
EOF

cp -- "$assets_dir/README-template.md" "$destination/README.md"
cp -- "$assets_dir/buttons.yaml" "$destination/buttons.yaml"
if [[ -d "$target" ]]; then
  for file in package.json tsconfig.json vite.config.ts .gitignore index.html src/main.ts README.md buttons.yaml; do
    if [[ ! -f "$target/$file" ]] || ! cmp -s -- "$destination/$file" "$target/$file"; then
      echo "Destination contains differing or missing scaffold files; leaving it unchanged: $target" >&2
      exit 1
    fi
  done
  printf 'Scaffold already matches; left unchanged: %s\n' "$target"
  exit 0
fi
mkdir -p -- "$(dirname -- "$target")"
mv -- "$destination" "$target"
trap - EXIT
destination=$(cd -- "$target" && pwd)
printf 'Created Forma extension in %s\n' "$destination"
printf 'Next: cd "%s" && npm install && npm run build && npm run dev\n' "$destination"
printf 'Fixture: http://localhost:5173/?fixture=1\n'
