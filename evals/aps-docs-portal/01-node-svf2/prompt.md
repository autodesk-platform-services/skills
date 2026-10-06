---
max_turns: 30
timeout_seconds: 600
allowed_tools: [Skill, Read, WebFetch, WebSearch, "Bash(curl:*)", "Bash(jq:*)", "Bash(htmlq:*)", "Bash(python3:*)", "Bash(sort:*)", "Bash(awk:*)", "Bash(head:*)", "Bash(grep:*)", "Bash(sed:*)", "Bash(tr:*)", "Bash(wc:*)", "WebFetch(domain:developer.doc.config.autodesk.com)", "WebFetch(domain:developer.doc.autodesk.com)"]
runs: 3
plugins: [../../../skills/aps-docs-portal]
---
Write a Node.js script that gets a 2-legged token and kicks off an SVF2 translation for a file I've already uploaded (I have its URN). Reply with the code inline.
