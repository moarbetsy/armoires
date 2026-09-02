#!/usr/bin/env python3
"""Local static server for Lighthouse testing.

Mirrors what a real static host (e.g. GitHub Pages) does automatically:
  * gzip-compresses text responses (HTML/CSS/JS/JSON/SVG)
  * sends long-lived Cache-Control headers for fingerprinted/static assets

The committed site itself needs no build to serve; this is only a testing aid.

Usage: python3 tools/serve.py [port] [directory]
"""
import gzip
import io
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8087
DIRECTORY = sys.argv[2] if len(sys.argv) > 2 else os.getcwd()

TEXT_TYPES = (
    "text/html", "text/css", "application/javascript", "text/javascript",
    "application/json", "image/svg+xml", "text/plain",
)
CACHE_EXT = (".css", ".js", ".woff2", ".avif", ".webp", ".png", ".jpg", ".jpeg", ".svg", ".ico")


class Handler(SimpleHTTPRequestHandler):
    # HTTP/1.1 enables keep-alive so multiple assets reuse one TCP connection,
    # matching how real static hosts behave (GitHub Pages serves HTTP/2).
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        path = self.path.split("?")[0]
        if path.endswith(CACHE_EXT):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        elif path.endswith(".html") or path.endswith("/"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_head(self):
        # Recompute headers so Content-Length/Content-Encoding match gzip output.
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
        ctype = self.guess_type(path)
        accepts_gzip = "gzip" in self.headers.get("Accept-Encoding", "")
        is_text = any(ctype.startswith(t) for t in TEXT_TYPES)
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None
        try:
            if accepts_gzip and is_text:
                data = f.read()
                buf = io.BytesIO()
                with gzip.GzipFile(fileobj=buf, mode="wb", compresslevel=9) as gz:
                    gz.write(data)
                body = buf.getvalue()
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Encoding", "gzip")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                return io.BytesIO(body)
            else:
                fs = os.fstat(f.fileno())
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(fs.st_size))
                self.end_headers()
                return f
        except Exception:
            f.close()
            raise


if __name__ == "__main__":
    os.chdir(DIRECTORY)
    print(f"Serving {DIRECTORY} at http://localhost:{PORT} (gzip + cache headers)")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
