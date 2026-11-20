---
name: aps-app-management
description: >
  Manage Autodesk Platform Services (APS) applications and their usage. Use when the user asks about
  developer hubs (creating one, moving apps into it, roles), enabling API products on an app, why
  a call says the client_id has no access to an API product, billable versus non-billable usage,
  included subscription usage, passthrough billing, suspended or uncharged usage, checking
  consumption, estimating monthly cost, registering apps, or rotating a client secret without
  downtime with the Application Management API.
metadata:
  author: Developer Advocates @ Autodesk
  version: "0.1"
  products: "APS, Application Management API"
  technologies: "REST, OAuth"
  industries: "AEC, Manufacturing, Media & Entertainment"
---

# APS application management

Everything about the app itself rather than the data it touches: where it lives (developer hub), which
APIs it may call, who pays for the calls, how much it consumed, and how to change its secret safely.

Rates, included quotas, and which APIs are paid change over time. Don't quote them from memory. Use the
`aps-reference` skill to read the current pricing and billing pages and the Application Management API
docs (source ID `applications_v2`), and say which page a number came from.

## Where to do what

| Task | Where |
| --- | --- |
| Register an app, enable APIs, add callback URLs, collaborators | APS portal, My Applications (or the app list inside a developer hub) |
| Create a developer hub, assign the APS subscription to a team | Autodesk Account (`manage.autodesk.com`), Products and Services, Hubs |
| See usage and token consumption | APS portal: the app's API usage tab; the hub's analytics page |
| Automate listing apps, usage reports, secret rotation | Application Management API v2 |

The API can read apps, collaborators, products, features, hubs, and usage, and can rotate secrets. It can't
create or delete apps or change the enabled APIs. Check the quick reference page of `applications_v2`
before telling a user otherwise (see "Known gaps").

## Developer hubs

A developer hub is the shared workspace that owns apps, members, and usage reporting for a team.

- A team admin creates it. The team needs an APS subscription (free or paid tier) assigned to it first;
  without one, the "APS Developer Hub" option doesn't appear.
- A hub is bound to one team, and that can't be changed later. A team can have several hubs (the product
  documentation currently says up to 5; confirm before relying on the number).
- Hub roles are **Hub admin** and **Developer**. Per-app roles are owner, editor, and viewer, and they can be
  given to external collaborators who aren't hub members.
- To migrate an existing app, a hub member opens My Applications, picks the app, and chooses "Move apps to
  Developer Hub". Moving doesn't change the app owner or the client ID.
- A member who owns apps can't be removed from a hub until ownership is transferred.
- Usage history: app-level reports stay with the app after a move. Hub-level reports keep past usage in the
  hub where it happened and count only new usage in the new hub.

Whether a given account must migrate, and by when, is a policy question that changes. Look it up with
`aps-reference` (search the APS blog for "developer hub") instead of asserting a deadline.

## Enabling API products

An app can only call the APIs enabled in its settings. Two errors mean the same thing:

- "The client_id specified does not have access to the api product"
- Authentication error `Auth-001`: the `client_id` isn't authorized to access the specified API

Fix: enable the API in the app's settings. For a Forma, ACC, or BIM 360 hub, API access also needs hub-side
provisioning, which is a different problem (see `aps-auth`, custom integrations).

To check from code, call `GET /applications/v2/clients/{id}`: `apiProductIds` lists what's enabled, and
`GET /applications/v2/products` maps IDs to names.

## Billing model (verify before quoting)

Concepts that stay stable, even when prices move:

- **Paid and free APIs.** Some APIs are metered and paid, others aren't. As of 2026-10, the Model Derivative,
  Automation, Reality Capture, Flow Graph Engine, Manufacturing Data Model, and AEC Data Model APIs are paid,
  and Data Management and Forma APIs were announced to move to paid later. Confirm against the current
  pricing page.
- **Who pays.** By default usage is charged to the team that owns the app. Eligible Autodesk subscriptions
  include some API usage. Apps owned by an enterprise token-flex team need the app assigned to that team
  (Team Assignment in the app's settings) so tokens are charged to it.
- **Running out of tokens.** Usage that happens after a team runs out of tokens is reported as *uncharged
  usage* on the app's API usage tab. Left uncleared, the team loses access to premium APIs until tokens are
  purchased, and restoring access can take a few business days. Calls may fail with authorization errors
  even though nothing in the code changed.
- **Passthrough billing.** An ISV can opt an app in so eligible usage is charged to the customer's APS
  capacity instead of the ISV. It needs 3-legged auth (pure 2-legged and server-to-server apps aren't
  supported in the initial release), customers must complete setup, and moving an existing client ID forward
  is one-way. Read the "Passthrough billing: a guide for ISVs" blog post (find it with `aps-reference`)
  before advising on it.

## Check consumption

1. **Portal first** for a human answer: the app's API usage tab (with the uncharged-usage view), its token
   usage tab, and the hub analytics page, all filterable by API and date range and downloadable.
2. **API for automation**: `GET /applications/v2/clients/{id}/usage/daily-totals?filter[date]=YYYY-MM-DD..YYYY-MM-DD`
   for one app, and the hub usage endpoint for a hub. Both need a 3-legged token with `application:client:read`
   and return `featureId` and `quantity` per day. `GET /applications/v2/features` explains the feature IDs.

## Estimate monthly cost

Don't guess a price. Follow this procedure:

1. Pull 14 to 30 days of `daily-totals` for the app (or ask the user for expected call volumes per API).
2. Map each `featureId` to an API and unit using the features endpoint.
3. Read the current rate and included usage for each feature from the pricing page (via `aps-reference`).
4. Multiply, subtract included usage, and scale to a month. Show the table with the date of the rates used.
5. State what the estimate leaves out (free APIs, uncharged usage, growth, and peak days).

## Rotate a client secret without downtime

The Application Management API supports prepare, commit, and cancel for secret rotation. You must be the
owner or an editor of the app.

Prerequisites: an EC key pair (RSA also works), the public key published as a JWKS at a URL, and that URL
saved as the app's JWKS URI in the app settings. Rotation calls are authenticated with a 2-legged token with the
`application:client:rotate_secret` scope, and the token request carries a client assertion (a JWT the app
signs with its private key) in the `assertion` parameter. Read the Secret Rotation page of `applications_v2`
for the exact request.

Procedure:

- [ ] Call **prepare**. You get a new secret that isn't active yet.
- [ ] Deploy the app so it can use both secrets: try the new secret first and fall back to the old one.
- [ ] Call **commit**. The new secret becomes active and the old one stops working.
- [ ] If anything goes wrong before commit, call **cancel** and the old secret stays in force.

The prepared secret has an expiry (`preparedSecretExpiresAt` on the app), so commit or cancel promptly.
Never log either secret.

## Gotchas

- **Application Management calls use 3-legged tokens for reads.** Listing apps, collaborators, hubs, and
  usage needs a user token with `application:client:read`. A 2-legged token doesn't work there, and only
  secret rotation uses 2-legged.
- **Errors come in two shapes.** Application Management errors have `title`, `detail`, and `logref`.
  Authentication errors have `developerMessage` and `errorCode`. Log the `logref` for support.
- **Usage dates are ranges.** The `filter[date]` value is `YYYY-MM-DD..YYYY-MM-DD`; any other format returns a
  validation error.
- **Duplicate provisioning.** Using one client ID as both a custom integration and an App Gallery install on
  the same hub is rejected. Remove one first.
- **Rate limit changes** go through the support form, and are reviewed case by case against real usage.

## Known gaps

Last verified: 2026-11-20. Confirm against the OpenAPI spec or GraphQL schema before telling a user something isn't possible.

- The Application Management API v2 can't create or delete apps, change callback URLs, or enable or disable
  API products. Those are portal-only.
- Passthrough billing doesn't support 2-legged-only apps in the initial release.
- Some application management and reporting features differ for passthrough apps.
