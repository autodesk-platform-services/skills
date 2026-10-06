---
type: llm
focus: last_message
weight: 1
---
Score PASS only if ALL of these hold:
1. The code fetches the JWKS from a URL (e.g. `PyJWKClient`, `requests` + JSON, or `jose`).
2. It selects the signing key by the token's `kid` header.
3. It verifies the signature restricting algorithms to RS256 (e.g. `algorithms=["RS256"]`).
4. It validates expiration and at least one of audience/issuer (or exposes them as parameters that are passed to the decoder).
5. The answer is a generic Python answer — it does not drift into Autodesk/APS documentation.
