---
max_turns: 12
timeout_seconds: 300
allowed_tools: [Skill, Read, WebFetch, WebSearch, "Bash(curl:*)", "Bash(jq:*)", "Bash(htmlq:*)", "Bash(python3:*)", "Bash(sort:*)", "Bash(awk:*)", "Bash(head:*)", "Bash(grep:*)", "Bash(sed:*)", "Bash(tr:*)", "Bash(wc:*)", "Bash(cut:*)", "WebFetch(domain:developer.doc.config.autodesk.com)", "WebFetch(domain:developer.doc.autodesk.com)", "WebFetch(domain:aps.autodesk.com)"]
runs: 3
tags: [spa, extraction]
plugins: [../../../skills/aps-docs-portal]
---
Read https://aps.autodesk.com/en/docs/model-derivative/v2/developers_guide/supported-translations/ifc-file-translations/ and tell me which IFC conversion methods Model Derivative offers, which one is used by default, and which one Autodesk recommends.
