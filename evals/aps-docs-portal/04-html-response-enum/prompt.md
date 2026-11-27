---
max_turns: 12
timeout_seconds: 300
allowed_tools: [Skill, Read, WebFetch, WebSearch, "Bash(curl:*)", "Bash(jq:*)", "Bash(htmlq:*)", "Bash(python3:*)", "Bash(sort:*)", "Bash(awk:*)", "Bash(head:*)", "Bash(grep:*)", "Bash(sed:*)", "Bash(tr:*)", "Bash(wc:*)", "Bash(cut:*)", "WebFetch(domain:developer.doc.config.autodesk.com)", "WebFetch(domain:developer.doc.autodesk.com)", "WebFetch(domain:aps.autodesk.com)"]
runs: 3
tags: [extraction, links]
plugins: [../../../skills/aps-docs-portal]
---
What status values can a Design Automation work item have, and how long is its reportUrl valid? Link the reference page.
