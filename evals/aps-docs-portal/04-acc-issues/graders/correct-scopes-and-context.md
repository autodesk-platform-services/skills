---
type: llm
focus: last_message
weight: 1
---
Score PASS only if ALL of these hold:
1. Listing issues is stated to require the `data:read` scope.
2. Creating issues is stated to require the `data:write` scope. (Mentioning additional optional scopes is fine as long as these are clearly identified as the required ones.)
3. The answer says a user context is required: a three-legged token (Authorization Code) or a Secure Service Account (SSA) token; a plain 2-legged client-credentials token alone will not work.
4. The listing endpoint is given as GET `https://developer.api.autodesk.com/construction/issues/v1/projects/{projectId}/issues` (noting the project ID has no `b.` prefix is a bonus, not required).
FAIL if any item is missing or contradicted.
