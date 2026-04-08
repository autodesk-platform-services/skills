# Auth: 3-Legged OAuth — Node.js / TypeScript

## `src/auth.ts`

```typescript
import { ServerOptions } from "./server.js";

const TOKEN_URL = "https://developer.api.autodesk.com/authentication/v2/token";
const AUTH_URL = "https://developer.api.autodesk.com/authentication/v2/authorize";
const SCOPES = "data:read bucket:read";

interface Session { accessToken: string; refreshToken?: string; expiresAt: number }
export const sessions = new Map<string, Session>();

export function buildAuthUrl(options: ServerOptions, sessionId: string): string {
  return `${AUTH_URL}?` + new URLSearchParams({
    response_type: "code",
    client_id: options.clientId,
    redirect_uri: options.callbackUrl!,
    scope: SCOPES,
    state: sessionId,
  });
}

export async function exchangeCode(options: ServerOptions, code: string): Promise<any> {
  const creds = Buffer.from(`${options.clientId}:${options.clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${creds}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: options.callbackUrl!,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function refreshSession(options: ServerOptions, session: Session): Promise<string | null> {
  if (Date.now() < session.expiresAt - 60_000) return session.accessToken;
  if (!session.refreshToken) return null;
  const creds = Buffer.from(`${options.clientId}:${options.clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${creds}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: session.refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  session.accessToken = data.access_token;
  session.refreshToken = data.refresh_token ?? session.refreshToken;
  session.expiresAt = Date.now() + data.expires_in * 1000;
  return session.accessToken;
}

export async function getSessionToken(options: ServerOptions, sessionId: string): Promise<string | null> {
  const session = sessions.get(sessionId);
  if (!session) return null;
  return refreshSession(options, session);
}
```

## `src/index.ts` additions

Add the OAuth callback route and use a stateful MCP endpoint. Extend
`ServerOptions` in `server.ts` with `callbackUrl: string`.

```typescript
import { randomUUID } from "crypto";
import { sessions, exchangeCode, buildAuthUrl } from "./auth.js";

// OAuth callback
app.get("/callback", async (req, res) => {
  const { code, state: sessionId } = req.query as Record<string, string>;
  if (!code || !sessionId) { res.status(400).send("Missing parameters"); return; }
  const data = await exchangeCode(options, code);
  sessions.set(sessionId, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  res.send("<h2>Authentication successful! You can close this window.</h2>");
});

// Stateful MCP endpoint
const sessionTransports = new Map<string, StreamableHTTPServerTransport>();

app.all("/mcp", async (req, res) => {
  const existingId = req.headers["mcp-session-id"] as string | undefined;
  if (existingId && sessionTransports.has(existingId)) {
    await sessionTransports.get(existingId)!.handleRequest(req, res, req.body);
    return;
  }
  const server = createMcpServer(options);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  transport.onSessionInitialized = (id) => sessionTransports.set(id, transport);
  res.on("close", () => {
    if (transport.sessionId) sessionTransports.delete(transport.sessionId);
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
```

## `ServerOptions` extension

```typescript
// src/server.ts
export interface ServerOptions {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}
```

## Tool usage

```typescript
// In a tool callback — pass sessionId from the MCP request context
import { getSessionToken, buildAuthUrl } from "../auth.js";

callback: async ({ bucketKey }, { sessionId }) => {
  const token = await getSessionToken(options, sessionId);
  if (!token) {
    return {
      content: [{ type: "text", text: "Authentication required." }],
      structuredContent: {
        auth_required: true,
        auth_url: buildAuthUrl(options, sessionId),
        message: "Open auth_url in a browser to sign in, then call this tool again.",
      },
    };
  }
  // ... proceed with token
}
```
