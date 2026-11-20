# APS API Essentials Skill

Cross-API conventions for [Autodesk Platform Services](https://aps.autodesk.com). The skill helps your agent get past the problems that every APS developer hits regardless of API: URN encoding and ID formats, regions, rate limits and `Retry-After`, pagination, 202 and async patterns, GraphQL cursors and cost, a step-by-step error triage path, and choosing between an SDK and raw REST. It also ships small operator scripts for common factual questions.

## Requirements

- Node.js 18 or later to run the scripts (no packages to install)
- An APS app with a client ID and secret for the scripts that call the API
- Recommended: the [`aps-reference`](../aps-reference/), [`aps-auth`](../aps-auth/), and [`aps-app-management`](../aps-app-management/) skills

## Installation

Recommended (project-level):

```bash
npx skills add autodesk-platform-services/skills --project --skill aps-api-essentials
```

## Scripts

Set `APS_CLIENT_ID` and `APS_CLIENT_SECRET` (or `APS_TOKEN`), then run, for example:

```bash
node skills/aps-api-essentials/scripts/count-bucket-objects.mjs my-bucket --size
node skills/aps-api-essentials/scripts/translation-status.mjs urn:adsk.objects:os.object:my-bucket/model.rvt --region EMEA
node skills/aps-api-essentials/scripts/list-webhooks.mjs --region US --status inactive
```

Each script prints its usage with `--help`.

## Usage

Ask your agent, for example:

- "Why am I getting 429 API request capacity exceeded?"
- "How do I encode a URN correctly?"
- "Why does my pagination cursor stop working after a few minutes?"
- "How do I paginate GraphQL results with cursors?"
- "Should I use the official .NET SDK or call the REST API directly?"
- "How many files are in my bucket?"
