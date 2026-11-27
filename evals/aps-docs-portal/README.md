# aps-docs-portal evals

Each case targets one of the skill's jobs and grades **accuracy** (LLM judge + exact-value/URL regexes) as well as **cost** (`max_turns`, and `tool_used` caps on TOC downloads, page downloads, and wasted fetches).

| Case | Purpose | Key checks |
|---|---|---|
| `01-spa-portal-url-input` | SPA awareness | Answers from a portal URL without fetching the SPA; IFC conversion methods |
| `02-glossary-offline` | Glossary | Answers from the glossary without Bash or WebFetch |
| `03-toc-list-issues-endpoints` | TOC structure, portal URLs | All 14 ACC Issues endpoints from the TOC alone, at most two TOC downloads |
| `04-html-response-enum` | HTML extraction | Work item status enum + `reportUrl` validity from a response table |
| `05-links-convert-cdn` | Portal URLs, cost | CDN → portal conversion where `url_path` differs from the file path, no page downloads |
| `06-neg-acad-dotnet` | Trigger precision | An Autodesk desktop-API near-miss must not fire the skill |

Ground-truth values (endpoint lists, enum values, URLs) were taken from the live docs on 2026-10-06. If a case starts failing in both arms, re-check the docs before changing the skill.

## Running

From the repo root, in a terminal outside Claude Code:

```bash
ANTHROPIC_API_KEY="..." claude plugin eval . --eval-dir evals/aps-docs-portal \
  --allow-tools "WebFetch(domain:developer.doc.config.autodesk.com)" "WebFetch(domain:developer.doc.autodesk.com)" "WebFetch(domain:aps.autodesk.com)" \
  "WebFetch" "WebSearch" "Bash(curl:*)" "Bash(jq:*)" "Bash(htmlq:*)" "Bash(python3:*)" "Bash(sort:*)" "Bash(awk:*)" "Bash(head:*)" "Bash(grep:*)" "Bash(sed:*)" "Bash(tr:*)" "Bash(wc:*)" "Bash(cut:*)"
```

The `aps.autodesk.com` grant is deliberate: it lets the agent fall into the "fetch the SPA shell" trap, which the `no-spa-*` graders in `01-spa-portal-url-input` then catch.
