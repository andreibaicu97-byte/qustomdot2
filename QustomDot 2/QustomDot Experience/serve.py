#!/usr/bin/env python3
"""HTTP server with Range request support (required for video seeking)
   and a POST /overlays endpoint that persists overlay edits to overlays.json."""
import os, sys, json
from http.server import HTTPServer, SimpleHTTPRequestHandler

class RangeHandler(SimpleHTTPRequestHandler):

    # ── GET: serve files with Range / 206 support ──────────────────────────
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404)
            return None

        size = os.path.getsize(path)
        ctype = self.guess_type(path)
        rng = self.headers.get('Range')

        if rng:
            try:
                unit, spec = rng.split('=')
                r = spec.split('-')
                start = int(r[0]) if r[0] else size - int(r[1])
                end   = int(r[1]) if r[1] else size - 1
                end   = min(end, size - 1)
                length = end - start + 1
                f.seek(start)
                self.send_response(206)
                self.send_header('Content-Range',  f'bytes {start}-{end}/{size}')
                self.send_header('Content-Length', str(length))
                self._range = (start, end)
            except Exception:
                f.close()
                self.send_error(416)
                return None
        else:
            self.send_response(200)
            self.send_header('Content-Length', str(size))
            self._range = None

        self.send_header('Content-Type',   ctype)
        self.send_header('Accept-Ranges',  'bytes')
        self.send_header('Cache-Control',  'no-cache')
        self.end_headers()
        return f

    def copyfile(self, src, dst):
        if getattr(self, '_range', None):
            start, end = self._range
            remaining = end - start + 1
            buf = 65536
            while remaining > 0:
                chunk = src.read(min(buf, remaining))
                if not chunk:
                    break
                dst.write(chunk)
                remaining -= len(chunk)
        else:
            super().copyfile(src, dst)

    # ── POST /overlays: save overlay data to overlays.json ─────────────────
    def do_POST(self):
        if self.path != '/overlays':
            self.send_error(404)
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            body   = self.rfile.read(length)
            # Validate JSON before writing
            json.loads(body)
            out_path = os.path.join(os.getcwd(), 'overlays.json')
            with open(out_path, 'wb') as f:
                f.write(body)
            self.send_response(204)
            self.end_headers()
        except Exception as e:
            self.send_error(500, str(e))

    def log_message(self, fmt, *args):
        pass  # silence request logs

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3457
    print(f'  QustomDot Experience → http://localhost:{port}')
    HTTPServer(('', port), RangeHandler).serve_forever()
