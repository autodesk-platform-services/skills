---
type: llm
focus: last_message
weight: 3
---
The ACC Issues API reference has exactly these 14 endpoints (relative to /construction/issues/v1/projects/{projectId}/):
GET users/me; GET issue-types; GET issue-attribute-definitions; GET issue-attribute-mappings; GET issue-root-cause-categories;
GET issues; POST issues; GET issues/:issueId; PATCH issues/:issueId; GET issues/:issueId/comments (GET comments); POST comments;
POST attachments; DELETE attachments/:issueId/items/:attachmentId (DELETE items/:attachmentId); GET attachments/:issueId/items.
Score PASS only if the reply lists all 14 (method + resource; exact path wording may vary) and adds no endpoint that is not in this list (e.g. no BIM 360 `issues/v2/containers` endpoints, no DELETE issues).
