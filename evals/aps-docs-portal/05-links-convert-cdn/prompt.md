---
max_turns: 8
timeout_seconds: 300
allowed_tools: [Skill, Read, WebFetch, WebSearch, "Bash(curl:*)", "Bash(jq:*)", "Bash(htmlq:*)", "Bash(python3:*)", "Bash(sort:*)", "Bash(awk:*)", "Bash(head:*)", "Bash(grep:*)", "Bash(sed:*)", "Bash(tr:*)", "Bash(wc:*)", "Bash(cut:*)", "WebFetch(domain:developer.doc.config.autodesk.com)", "WebFetch(domain:developer.doc.autodesk.com)", "WebFetch(domain:aps.autodesk.com)"]
runs: 3
tags: [links, cost]
plugins: [../../../skills/aps-docs-portal]
---
Turn these doc CDN URLs into aps.autodesk.com portal links:
- https://developer.doc.autodesk.com/bPlouYTd/acs-acs-api-documentation-main-52/acc/v1/reference/http/issues/issues-POST.html
- https://developer.doc.autodesk.com/bPlouYTd/A360-platform-viewing-docs-master-1064/model-derivative/v2/overview/supported-translations/supported-translation.html
