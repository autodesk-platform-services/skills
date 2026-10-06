---
type: llm
focus: last_message
weight: 1
---
The question is broad. Score PASS if EITHER branch holds:
A) Clarifying branch: the reply asks 1-3 focused clarifying questions that are relevant to ACC data access (e.g. which data — files/issues/RFIs/cost/models; what kind of app — script, server, integration; user vs. server auth). It may include a brief orientation. It must not ask about unrelated topics.
B) Answer branch: the reply gives an overview that (1) names the ACC APIs (Autodesk Construction Cloud APIs under `acc/v1`) and Data Management for hubs/projects/folders/files, (2) explains that access needs an APS app provisioned/added as a custom integration in the ACC account, and that user-scoped APIs (e.g. Issues, RFIs) need user context — 3-legged OAuth, SSA, or 2-legged with an `x-user-id` header (offering plain 2-legged for account-level/admin/Data Management/Data Connector pulls is acceptable; FAIL only if it claims a plain 2-legged token works for user-scoped APIs with no caveat), and (3) gives at least one concrete next step (e.g. GET hubs, then projects).
In both branches, FAIL if the reply names an API, endpoint, or SDK that does not exist, or recommends deprecated packages (`forge-apis`, `Autodesk.Forge`) or `/authentication/v1/` endpoints.
