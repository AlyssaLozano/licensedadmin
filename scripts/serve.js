/* Static preview server. The site itself needs no server once published, but a
   browser will not fetch the CSV from a file:// page, so previewing locally
   does. Port comes from --port or PORT so a preview harness can pick one. */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function portFromArgs() {
  const flag = process.argv.indexOf('--port');
  const value = flag !== -1 ? process.argv[flag + 1] : process.env.PORT;
  return Number(value) || 4173;
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const target = path.join(ROOT, url === '/' ? 'index.html' : url);

  /* Never serve outside the project, whatever the request path claims. */
  if (!path.resolve(target).startsWith(path.resolve(ROOT))) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(target, (err, body) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  });
});

const port = portFromArgs();
server.listen(port, () => {
  console.log('Licensed Admin preview on http://localhost:' + port);
});
