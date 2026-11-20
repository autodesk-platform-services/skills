# x-user-id impersonation and migrating to SSA

Read this when code sends an `x-user-id` header with a 2-legged token, or when a backend job needs user-context
APIs and someone suggests a stored login or refresh token.

## What x-user-id does

Some APIs (Data Management, for example) accept an `x-user-id` header on a **2-legged** request. In a 2-legged
context the app can reach the data of every user the account administrator authorized for it through the
custom integration. The header narrows a call to act **as one specific user** (the user's Autodesk ID).

Consequences:

- The call runs with that user's permissions and is attributed to that user.
- It only works on endpoints that document the header. Many Forma and BIM 360 endpoints are 3-legged only,
  and `x-user-id` doesn't make them accessible with a 2-legged token.
- The app depends on an existing human account. If the person leaves, loses access, or changes role, the job breaks.
- Before relying on it for new work, check the endpoint's reference page for the header and the current
  deprecation notices (use `aps-reference`). Don't assume it is supported everywhere.

## Why SSA is the better replacement

A Secure Service Account (SSA) is a non-human identity. The app signs a JWT with a private key and exchanges it for a
**3-legged** (user-context) token, with no sign-in box, one-time password, or CAPTCHA, and no refresh token to lose.
It suits CI/CD, integrations, and scheduled jobs. For a task that runs while no user is present, SSA is the
recommended choice. A normal 3-legged token is better when a user is in front of the app and can sign in again if a
refresh fails.

SSA gives the customer's admin familiar controls: the robot is added to projects and given roles like a user, and
its activity is traceable in the product's activity log. It also works with apps distributed through the app
gallery.

## Migration checklist

Do these in order. Steps 1 to 3 are done by the app developer; 4 to 6 by the customer's hub admin.

- [ ] 1. Create (or reuse) a **Server-to-Server** app and note the client ID and secret.
- [ ] 2. Create the service account (robot) for that client ID with the SSA API or the SSA manager tool, then create
      a key. Save the robot email, key ID, service ID, and private key. The email contains the client ID.
      See `ssa.md`.
- [ ] 3. Switch the code from `2-legged + x-user-id` to the SSA token exchange (`ssa-nodejs.md`, `ssa-python.md`, or
      `ssa-dotnet.md`) and remove the header.
- [ ] 4. The hub admin adds the client ID under **Custom Integrations** (see `custom-integrations.md`).
- [ ] 5. The hub admin adds the **robot email as a member** of each project the job needs.
- [ ] 6. Give the robot the permissions the job needs, like a user: folder permissions, issue permission settings, and
      subscriptions to the Build modules it uses (RFIs, Forms, and so on).

Then test every call that previously relied on the user's permissions: they now use the robot's.

## Differences to plan for

| Topic | x-user-id (2-legged) | SSA (3-legged, robot) |
| --- | --- | --- |
| Identity | An existing person | A dedicated robot account |
| Permissions | The person's | What was granted to the robot on each project |
| New projects | Visible if the person is a member | Robot must be added to each project |
| Attribution | The person | The robot |
| Token lifetime | 2-legged token | 3-legged access token; sign a new JWT to renew (no refresh token) |
| Customer onboarding | Custom integration | Custom integration plus adding the robot to projects |

Revit Cloud Worksharing models need an appropriate collaboration license for the SSA user and view and download
permission on the model's folder. Check the SSA docs for the current requirement.

## Known limits

Some of the original SSA features announced as coming (for example, SSA access to account admin APIs) were delayed.
Check the SSA docs "about" page for what's supported before promising a migration for a specific API.
