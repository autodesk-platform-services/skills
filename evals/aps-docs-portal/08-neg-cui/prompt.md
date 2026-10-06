---
max_turns: 10
timeout_seconds: 180
allowed_tools: [Skill, Read, WebFetch, WebSearch, "Bash(curl:*)", "Bash(jq:*)", "Bash(htmlq:*)", "Bash(python3:*)", "Bash(sort:*)", "Bash(awk:*)", "Bash(head:*)", "Bash(grep:*)", "Bash(sed:*)", "Bash(tr:*)", "Bash(wc:*)", "WebFetch(domain:developer.doc.config.autodesk.com)", "WebFetch(domain:developer.doc.autodesk.com)"]
runs: 3
plugins: [../../../skills/aps-docs-portal]
---
How do I add a custom button to the AutoCAD ribbon using the CUI editor?
