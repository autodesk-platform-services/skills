# Custom integrations and hub provisioning

Read this when an app authenticates successfully but can't see a customer's hub, project, or data, or when
planning onboarding for an app that runs against someone else's Forma, ACC, or BIM 360 account.

## The rule

A valid token isn't enough. For Forma, ACC, and BIM 360 data, **the hub (account) must have granted the app
access**. Without that, the Data Management `GET /hubs` call won't return the hub, even though the token is
fine. This is per customer account: an app that works on your hub still needs the same step on every other
customer's hub.

Two ways to grant access:

- **Custom integration**: a hub admin adds the app's client ID by hand.
- **App gallery install**: the app is published, and the admin installs it.

## Adding a custom integration (hub admin)

1. Sign in to the hub and open **Hub Admin** (for BIM 360: Account Admin, then Settings).
2. Select **Custom Integrations**, then **Add custom integration**.
3. Enter the app's **APS client ID** (it must match the app's registered client ID exactly), a name (this doesn't
   need to match the app name), and optionally a description.
4. Save. The integration appears in the list.

For a third-party app, the developer sends the customer's admin the client ID and the steps. For an SSA, the admin
also adds the robot email as a project member (see `impersonation-and-ssa-migration.md`).

## Diagnose "I can't see the hub or project"

Check in this order:

1. **Token type.** Hubs and projects through Data Management need the right type for the endpoint (see the Authentication
   Context row). 2-legged returns only hubs that granted the app access; 3-legged also depends on the user.
2. **Provisioning.** Was the client ID added to this hub's custom integrations (or installed from the gallery)?
   This is the usual cause when it works for one customer and not another.
3. **User access (3-legged).** The user must have access to the project. At minimum, they must be able to
   open the project's files (Docs, Files) for the project to appear in Data Management lists.
4. **API enabled for the app** in the app's own settings (see `aps-app-management`).
5. **Scopes** include what the call needs, for example `data:read` or `account:read`.
6. **Region.** Hubs live in a region. See `aps-api-essentials`.
7. **Duplicate provisioning.** The same client ID can't be both a custom integration and an app gallery install on one
   hub. Remove one before adding the other.

## Other common causes in this area

- Login works locally and fails in production: the callback URL isn't registered exactly as the app uses it.
- "Invalid redirect uri" after a company domain change: update the callback URL in the app settings. Check that user
  permissions weren't affected too.
- "You don't have access to this API": the API isn't enabled for the app, or the token lacks the scope.
- A customer asks to block an app from sensitive projects: SSA and custom integrations support client ID access controls
  at the hub. Look up the current options in the product docs.
