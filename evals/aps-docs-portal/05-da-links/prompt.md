---
max_turns: 30
timeout_seconds: 600
allowed_tools: [Skill, Read, WebFetch, WebSearch, "Bash(curl:*)", "Bash(jq:*)", "Bash(htmlq:*)", "Bash(python3:*)", "Bash(sort:*)", "Bash(awk:*)", "Bash(head:*)", "Bash(grep:*)", "Bash(sed:*)", "Bash(tr:*)", "Bash(wc:*)", "WebFetch(domain:developer.doc.config.autodesk.com)", "WebFetch(domain:developer.doc.autodesk.com)"]
runs: 3
plugins: [../../../skills/aps-docs-portal]
---
Send me the reference doc link for the Design Automation endpoint that lists activities, plus the one for creating a work item.
