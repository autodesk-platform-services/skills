# Agent Skills Gallery

Source of the skill gallery for [autodesk-platform-services/skills](https://github.com/autodesk-platform-services/skills), published with GitHub Pages from this branch.

The gallery is a static site with no build step. At runtime it loads the list of skills from the `main` branch: the plugin marketplace (`.claude-plugin/marketplace.json`), each skill's `SKILL.md` frontmatter (including the `products`, `industries`, and `technologies` tags in `metadata`), and its `README.md` title. Adding or updating a skill on `main` updates the gallery automatically.

To preview it locally, serve this branch with any static server, since browsers don't load ES modules from `file://` URLs:

```bash
npx serve .
```
