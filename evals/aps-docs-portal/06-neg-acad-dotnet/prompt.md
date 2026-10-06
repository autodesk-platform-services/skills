---
max_turns: 6
timeout_seconds: 180
allowed_tools: [Skill, Read, WebFetch, WebSearch, "Bash(curl:*)", "Bash(jq:*)", "Bash(htmlq:*)", "Bash(python3:*)", "Bash(sort:*)", "Bash(awk:*)", "Bash(head:*)", "Bash(grep:*)", "Bash(sed:*)", "Bash(tr:*)", "Bash(wc:*)", "Bash(cut:*)", "WebFetch(domain:developer.doc.config.autodesk.com)", "WebFetch(domain:developer.doc.autodesk.com)", "WebFetch(domain:aps.autodesk.com)"]
runs: 3
tags: [negative]
plugins: [../../../skills/aps-docs-portal]
---
In the AutoCAD .NET API, how do I prompt the user to pick an entity and get its ObjectId? Show C# code.
