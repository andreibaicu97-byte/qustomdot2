// Minimal static file server (serves the folder this file lives in).
// Supports HTTP Range requests so <video> can stream/seek.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 5511;
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.json': 'application/json', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const filePath = path.join(ROOT, path.normalize(url).replace(/^(\.\.[/\\])+/, ''));

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }

    const type = TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;

    // Range request (video seeking / streaming)
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m && m[1] ? parseInt(m[1], 10) : 0;
      let end   = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
      if (isNaN(start)) start = 0;
      if (isNaN(end) || end >= stat.size) end = stat.size - 1;
      if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); res.end(); return; }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
