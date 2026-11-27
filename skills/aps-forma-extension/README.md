# APS Forma Extension Skill

The skill scaffolds and develops embedded extensions for Forma Site Design with TypeScript, Vite, and the Forma Embedded View SDK.
It covers proposal geometry, synchronization between compact and floating panels, and temporary overlays.
The scaffold starts with a read-only building-path count and supports standalone testing with synthetic data before live checks in Forma.

## Requirements

- Node.js 20 or later, npm, and Bash to generate and run the starter.
- A Forma Site Design license, a hub with Design access, and an editable project for live testing.

## Installation

The [skills](https://www.npmjs.com/package/skills) utility installs the skill in the current project:

```bash
npx skills add autodesk-platform-services/skills --project --skill aps-forma-extension
```

## Setup

1. From the installed skill directory, generate and start the starter:

   ```bash
   bash scripts/new-forma-extension.sh my-forma-extension
   cd my-forma-extension
   npm install
   npm run build
   npm run dev
   ```

2. Open `http://localhost:5173/?fixture=1` to check the starter with synthetic data outside Forma.
3. In the Forma project, open **Extension menu → Add extension → Settings → Create extension**. Select **Myself only** for personal development and add the project ID under **Who are allowed**.
4. Set the embedded view URL to `http://localhost:5173/` and select `RIGHT_MENU_ANALYSIS_PANEL`. Add the generated `buttons.yaml` under **Integration → Buttons** for the floating view.
5. Save and add the extension to the allowlisted project. Check that the summary and Refresh use data from the live proposal.

The [registration reference](references/setup-and-configuration.md) covers the full form and access requirements for shared extensions.

## Usage

Example prompts:

- "Scaffold a Forma Site Design extension with a building count in the right analysis panel and detailed results in a floating panel."
- "Read building footprints from the current proposal and show temporary overlays for buildings that exceed the height limit."
- "Verify the standalone fixture, then list the checks that require a live Forma project."

[Forma Zoning Check](https://github.com/sharafutdinovdi/forma-zoning-check) is a worked example with zoning verdicts, a permitted envelope, and CSV reporting.
