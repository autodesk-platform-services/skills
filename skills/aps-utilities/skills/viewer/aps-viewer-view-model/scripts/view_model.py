#!/usr/bin/env python3
"""Open a translated model in the APS Viewer via a local server (read-only).

The browser only ever receives a short-lived `viewables:read` token from /token;
the client secret stays in this process. With --three-legged the token is the signed-in
user's (scope `data:read viewables:read`), still served to localhost only. Listens on 127.0.0.1 only.

Examples:
  python view_model.py --bucket myapp-models --key house.rvt
  python view_model.py --object-id "urn:adsk.objects:os.object:b/k.ipt" --port 8200
  python view_model.py --urn dXJuOmFkc2s... --no-open
  python view_model.py --urn <version urn b64> --three-legged     # Fusion Team / ACC / BIM 360 files
"""
import argparse
import json
import sys
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import ApsError, b64url, die, get_2legged_token, get_3legged_token  # noqa: E402

VIEWER_SCOPE = "viewables:read"
USER_SCOPE = "data:read viewables:read"
VIEWER_VERSION = "7.*"

PAGE = """<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>APS Viewer</title>
  <link rel="stylesheet" href="https://developer.api.autodesk.com/modelderivative/v2/viewers/%(ver)s/style.min.css">
  <script src="https://developer.api.autodesk.com/modelderivative/v2/viewers/%(ver)s/viewer3D.min.js"></script>
  <style>html, body, #viewer { margin: 0; height: 100%%; }</style>
</head>
<body>
  <div id="viewer"></div>
  <script>
    async function getToken(callback) {
      const r = await (await fetch('/token')).json();
      callback(r.access_token, r.expires_in);
    }
    Autodesk.Viewing.Initializer(
      { env: 'AutodeskProduction2', api: 'streamingV2', getAccessToken: getToken },
      () => {
        const viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('viewer'));
        viewer.start();
        Autodesk.Viewing.Document.load('urn:%(urn)s',
          doc => viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry()),
          (code, msg) => console.error('load failed', code, msg));
      });
  </script>
</body>
</html>
"""


def resolve_urn(urn: Optional[str], object_id: Optional[str], bucket: Optional[str], key: Optional[str]) -> str:
    if urn:
        return urn
    if object_id:
        return b64url(object_id)
    if bucket and key:
        return b64url(f"urn:adsk.objects:os.object:{bucket}/{key}")
    raise ValueError("give --urn, --object-id, or --bucket and --key")


def make_handler(urn: str, three_legged: bool = False):
    page = (PAGE % {"ver": VIEWER_VERSION, "urn": urn}).encode()

    class Handler(BaseHTTPRequestHandler):
        def _send(self, code: int, ctype: str, body: bytes) -> None:
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self) -> None:
            if self.path == "/token":
                try:
                    t = get_3legged_token(USER_SCOPE) if three_legged else get_2legged_token(VIEWER_SCOPE)
                except ApsError as e:
                    self._send(502, "text/plain", str(e).encode())
                    return
                body = {"access_token": t.access_token, "expires_in": max(1, int(t.expires_at - time.time()))}
                self._send(200, "application/json", json.dumps(body).encode())
            elif self.path in ("/", "/index.html"):
                self._send(200, "text/html; charset=utf-8", page)
            else:
                self._send(404, "text/plain", b"not found")

        def log_message(self, *args) -> None:  # keep tokens/URLs out of the console
            pass

    return Handler


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--urn", help="base64url URN of the translated source")
    ap.add_argument("--object-id")
    ap.add_argument("--bucket")
    ap.add_argument("--key")
    ap.add_argument("--three-legged", action="store_true",
                    help="use the signed-in user's token (Fusion Team / ACC / BIM 360 sources); browser login if needed")
    ap.add_argument("--port", type=int, default=8123)
    ap.add_argument("--no-open", action="store_true", help="don't launch the browser")
    a = ap.parse_args()
    try:
        urn = resolve_urn(a.urn, a.object_id, a.bucket, a.key)
        (get_3legged_token(USER_SCOPE) if a.three_legged else get_2legged_token(VIEWER_SCOPE))  # fail fast
    except (ValueError, KeyError, ApsError) as e:
        die(str(e))
    url = f"http://127.0.0.1:{a.port}"
    server = HTTPServer(("127.0.0.1", a.port), make_handler(urn, a.three_legged))
    print(f"viewer at {url}  (Ctrl+C to stop)", flush=True)
    if not a.no_open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
