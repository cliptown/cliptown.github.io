/**
 * Minimal static file server used by the Playwright suite.
 *
 * It mirrors how GitHub Pages serves this build so the browser tests exercise
 * the same URLs production does:
 *   - `/support`      -> `dist/support/index.html`   (trailingSlash: 'never')
 *   - `/`             -> `dist/index.html`
 *   - unknown routes  -> `dist/404.html` with a 404 status
 *
 * Usage: node tests/static-server.mjs <directory> <port>
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const [, , dirArg, portArg] = process.argv;

if (!dirArg || !portArg) {
  console.error('usage: node tests/static-server.mjs <directory> <port>');
  process.exit(1);
}

const rootDir = resolve(process.cwd(), dirArg);
const port = Number(portArg);

if (!existsSync(rootDir)) {
  console.error(`static-server: ${rootDir} does not exist. Run \`npm run build:e2e\` first.`);
  process.exit(1);
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

/** Resolve a URL pathname to a file inside rootDir, or null if it escapes/misses. */
function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const candidate = resolve(rootDir, `.${normalize(decoded)}`);

  // Directory traversal guard: never serve outside the build directory.
  if (candidate !== rootDir && !candidate.startsWith(rootDir + '/')) return null;

  for (const target of [candidate, join(candidate, 'index.html'), `${candidate}.html`]) {
    if (existsSync(target) && statSync(target).isFile()) return target;
  }
  return null;
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  const file = resolveFile(pathname);

  if (!file) {
    const notFound = join(rootDir, '404.html');
    if (existsSync(notFound)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      createReadStream(notFound).pipe(res);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }

  res.writeHead(200, {
    'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`static-server: serving ${rootDir} at http://127.0.0.1:${port}`);
});
