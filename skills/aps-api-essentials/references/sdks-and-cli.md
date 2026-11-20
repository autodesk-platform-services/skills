# SDKs, raw REST, and shells

Read this when choosing between an official SDK and raw REST calls, when SDK behavior disagrees with the
documented API, or when a curl command misbehaves.

## Choose: SDK or raw REST

Default to the **official SDK** for the language when one exists and covers the endpoints you need. It handles
request shapes, enums, and typed responses. The official SDKs are open source in the `autodesk-platform-services`
GitHub organization (Node.js/TypeScript `aps-sdk-node`, .NET `aps-sdk-net`; use `aps-reference` to find
the current repositories and status, because a Java SDK has been in beta and others may follow).

Use **raw REST** when:

- The SDK doesn't cover the endpoint yet, or it lags a recently added field or parameter.
- You need a header, query parameter, or behavior the SDK doesn't expose.
- You're debugging, or writing a one-off script, where one `fetch` is simpler than a dependency.
- The language has no official SDK.

You can mix them: use the SDK for most calls, and a raw call for the gap, sharing one token provider.

Whichever you use, keep these in your own code: token caching, 429 handling, pagination loops, and region
handling. An SDK doesn't always do them for you.

The OpenAPI specs that the SDKs are generated from are in the `aps-sdk-openapi` repository and are the ground
truth for request and response shapes.

## When the SDK and REST disagree

Symptom: the SDK call fails or returns different data, but the same call with curl works (or the reverse).

1. Capture the raw request the SDK sends (enable HTTP logging, or run through a local proxy).
2. Reproduce it with curl and compare URL, region header, query string, content type, and body.
3. Compare with the REST reference page and the OpenAPI spec for that endpoint.
4. Check the SDK version against its release notes and open issues. Upgrading often fixes it.
5. If the SDK is wrong, use raw REST for that call and file an issue in the SDK repository.

Common causes: an older SDK sending a deprecated field, a default region, an enum missing a newer value, a
model that drops unknown response fields, or a different token scope.

## Shell quirks

- **Quote the whole URL.** An unquoted `&` ends the command in bash, zsh, and PowerShell.
- **Use `curl -g`** (or percent-encode `[` and `]`) for JSON:API parameters like `page[limit]=100`,
  otherwise curl reports "bad range in URL".
- **PowerShell**: `curl` is an alias for `Invoke-WebRequest`. Call `curl.exe`, or use `Invoke-RestMethod`.
  Escape quotes differently in JSON bodies, or read the body from a file with `--data @body.json`.
- **Windows cmd**: use double quotes only, and escape inner quotes with `\"`.
- **Line endings and BOM**: a UTF-8 BOM or CRLF in a saved private key or JSON file can break parsing. Save as
  UTF-8 without BOM.
- **Base64**: macOS and Linux `base64` differ on wrapping and flags. Prefer a language one-liner for URN
  encoding (see `ids-and-urns.md`).
- **Secrets in history**: pass tokens through environment variables, not literally on the command line.
- **Binary downloads**: use `-o file` (or `--output`) and don't pipe binary data to the terminal.

Example, with the quoting that works in bash and zsh:

```bash
curl -sg -H "Authorization: Bearer $APS_TOKEN" \
  "https://developer.api.autodesk.com/oss/v2/buckets/my-bucket/objects?limit=100"
```
