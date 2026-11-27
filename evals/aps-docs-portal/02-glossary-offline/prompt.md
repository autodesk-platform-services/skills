---
max_turns: 4
timeout_seconds: 120
allowed_tools: [Skill, Read, WebFetch, WebSearch, "Bash(curl:*)", "Bash(jq:*)", "Bash(htmlq:*)", "Bash(python3:*)", "Bash(sort:*)", "Bash(awk:*)", "Bash(head:*)", "Bash(grep:*)", "Bash(sed:*)", "Bash(tr:*)", "Bash(wc:*)", "Bash(cut:*)", "WebFetch(domain:developer.doc.config.autodesk.com)", "WebFetch(domain:developer.doc.autodesk.com)", "WebFetch(domain:aps.autodesk.com)"]
runs: 3
tags: [glossary, cost]
plugins: [../../../skills/aps-docs-portal]
---
In APS terms, is translating a Navisworks .nwd file to SVF2 a simple or a complex Model Derivative job? Also, what do OSS and SSA stand for?
