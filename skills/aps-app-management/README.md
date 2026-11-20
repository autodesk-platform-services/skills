# APS Application Management Skill

Manage [Autodesk Platform Services](https://aps.autodesk.com) applications and their usage. The skill helps your agent explain developer hubs and app migration, fix "no access to the API product" errors, reason about billable and included usage and passthrough billing, check consumption through the portal or the Application Management API, estimate monthly cost from real usage, and rotate a client secret without downtime.

## Requirements

- An APS app (https://aps.autodesk.com/myapps)
- For usage and secret rotation calls: a user token with `application:client:read`, or a 2-legged token with `application:client:rotate_secret`
- Recommended: the [`aps-reference`](../aps-reference/) and [`aps-auth`](../aps-auth/) skills. This skill uses them to look up current pricing and docs, and to get tokens.

## Installation

Recommended (project-level):

```bash
npx skills add autodesk-platform-services/skills --project --skill aps-app-management
```

## Usage

Ask your agent, for example:

- "Do I need to migrate my app to a developer hub?"
- "Why was my API usage suspended?"
- "How much would my app cost per month at the usage I expect?"
- "How do I rotate a client secret without downtime?"
- "Why do I get 'The client_id specified does not have access to the api product'?"
