#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  echo "Usage: bash new-forma-extension.sh <new-project-directory>" >&2
  exit 1
fi

command -v node >/dev/null || { echo "Node 20+ is required." >&2; exit 1; }
command -v npm >/dev/null || { echo "npm is required." >&2; exit 1; }
node -e 'if (Number(process.versions.node.split(".")[0]) < 20) { console.error("Node 20+ is required."); process.exit(1); }'

destination=$1
if [[ -e "$destination" || -L "$destination" ]]; then
  echo "Destination already exists; choose a new directory: $destination" >&2
  exit 1
fi
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
assets_dir="$script_dir/../assets"
for asset in README-template.md buttons.yaml; do
  [[ -f "$assets_dir/$asset" ]] || { echo "Missing bundled asset: $asset" >&2; exit 1; }
done

mkdir -p -- "$destination"
destination=$(cd -- "$destination" && pwd)
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
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Forma extension</title>
  </head>
  <body>
    <main>
      <h1>Forma extension</h1>
      <p id="status" role="status">Loading…</p>
      <button id="refresh" type="button">Refresh</button>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
EOF

cat > "$destination/src/main.ts" <<'EOF'
const statusElement = document.querySelector<HTMLParagraphElement>("#status")!;
const refresh = document.querySelector<HTMLButtonElement>("#refresh")!;
const params = new URLSearchParams(window.location.search);
const embedded = window.parent !== window;
const fixture = !embedded && params.get("fixture") === "1";
let generation = 0;

function message(text: string) {
  statusElement.textContent = text;
}

async function load() {
  const current = ++generation;
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
      message("Synthetic empty site. In Forma, draw a building or order Overture buildings, then refresh.");
    } else {
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
printf 'Created Forma extension in %s\n' "$destination"
printf 'Next: cd "%s" && npm install && npm run build && npm run dev\n' "$destination"
printf 'Fixture: http://localhost:5173/?fixture=1\n'
