# APS Authentication Skill

Authenticate with [Autodesk Platform Services](https://aps.autodesk.com). The skill helps your agent choose between 2-legged OAuth, 3-legged OAuth (authorization code or PKCE), and Secure Service Accounts (SSA), and write token helpers that cache tokens, refresh them before they expire, and keep the client secret on the server. Helpers are included for Node.js/TypeScript, Python, and .NET/C#. It also covers replacing `x-user-id` impersonation with SSA, provisioning an app on a customer's hub (custom integrations), tokens for the browser Viewer, and token and sign-in troubleshooting.

## Requirements

- An APS app with a client ID and secret (https://aps.autodesk.com/myapps)
- For SSA: a service account and private key, provisioned to the hubs it needs
- Recommended: the [`aps-reference`](../aps-reference/) skill, which this skill uses to look up scopes and endpoint details

## Installation

Recommended (project-level):

```bash
npx skills add autodesk-platform-services/skills --project --skill aps-auth
```

## Usage

Ask your agent, for example:

- "Should I use 2-legged, 3-legged, PKCE, or SSA for a nightly backend job?"
- "Add 3-legged sign-in with token refresh to my Express app."
- "Get an SSA token in Python so my script can read ACC project files."
- "My SSA token request fails with 'The assertion is invalid'."
- "How do I replace x-user-id impersonation with a Secure Service Account?"
- "Why can a user see the hub on one customer's account but not another?"
- "How do I give the Viewer a token that can only read viewables?"
