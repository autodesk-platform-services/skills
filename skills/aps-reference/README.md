# APS Reference Skill

Navigate the [APS documentation portal](https://aps.autodesk.com/developer/documentation) — find the right API docs, decode glossary terms, index table-of-contents JSON trees, extract content from static HTML pages, and build valid aps.autodesk.com portal links. Covers ACC, BIM 360, Model Derivative, Data Management, Viewer, Design Automation, Authentication, Webhooks, and all related APS APIs.

It also helps the agent find the other authoritative sources: OpenAPI specs, GraphQL schemas, official SDKs and samples on GitHub, the APS blog, changelogs, and deprecation notices. It decodes product renames (Forge to APS, Design Automation to Automation API, ACC to Forma) and gives a checklist for judging whether an older Forge-era answer still applies.

## Requirements

- `curl`, `jq`, and `htmlq`

## Installation

Recommended (project-level):

```bash
npx skills add autodesk-platform-services/skills --project --skill aps-reference
```

## Usage

Ask your agent, for example:

- "Where's the OpenAPI spec for the Data Management API?"
- "Where do I find the GraphQL schema for the Manufacturing Data Model?"
- "Is there a code sample for uploading files in Python?"
- "Is Design Automation the same as the Automation API?"
- "I found a Forge answer from 2021. Is it still valid?"
