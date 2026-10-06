---
max_turns: 30
timeout_seconds: 600
allowed_tools: [Skill, Read, WebFetch, WebSearch, "Bash(curl:*)", "Bash(jq:*)", "Bash(htmlq:*)", "Bash(python3:*)", "Bash(sort:*)", "Bash(awk:*)", "Bash(head:*)", "Bash(grep:*)", "Bash(sed:*)", "Bash(tr:*)", "Bash(wc:*)", "WebFetch(domain:developer.doc.config.autodesk.com)", "WebFetch(domain:developer.doc.autodesk.com)"]
runs: 3
plugins: [../../../skills/aps-docs-portal]
---
Write a Node.js script that authenticates as an APS Secure Service Account and lists the projects in my ACC hub. I already created the service account and have its private key and key ID. Reply with the code inline.
