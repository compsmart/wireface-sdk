// The development server for the examples, and (when a Gemini key is set) the API the 2D ones use to find faces, start
// conversations and draw new characters. No dependencies: `npm start` (or node tools/serve.mjs).
//
// The key is read from the environment, or from a .env file next to package.json (git ignores it). It stays in this
// process: the browser only ever talks to /api/*, never to Google with the key. PORT=8080 npm start for another port.
// It answers only to 127.0.0.1, localhost or [::1] at its own port (so no other site can reach it through DNS), and
// never serves a file or folder whose name starts with a dot (.env, .git).
import { createServer } from 'node:http';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApi } from '../dist/2d-server.js';

const ROOT = realpathSync.native(resolve(fileURLToPath(new URL('..', import.meta.url))));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.mp4': 'video/mp4', '.wasm': 'application/wasm', '.task': 'application/octet-stream',
  '.md': 'text/markdown; charset=utf-8',
};

/** KEY=value lines from .env, without overriding what the environment already has. */
function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (value && !(m[1] in process.env)) process.env[m[1]] = value;
  }
}
loadEnv(join(ROOT, '.env'));

const PORT = Number(process.env.PORT) || 5173;
const HOSTS = ['127.0.0.1', 'localhost', '[::1]'].map(h => `${h}:${PORT}`);
const api = createApi({
  key: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  detectModels: process.env.GEMINI_DETECT_MODELS?.split(',').map(s => s.trim()).filter(Boolean),
  liveModel: process.env.GEMINI_LIVE_MODEL,
  imageModel: process.env.GEMINI_IMAGE_MODEL,
  root: ROOT,
  hosts: HOSTS,
  origins: HOSTS.map(h => `http://${h}`),
  customPersona: true,                // the key is yours, so the examples may send a persona for your own pictures
});
const forbidden = () => Object.assign(new Error('forbidden'), { code: 'EACCES' });

/** The file a URL path names: only inside ROOT, and never through a name that starts with a dot. */
async function local(asked) {
  if (asked.split(/[\\/]/).some(part => part.startsWith('.'))) throw forbidden();      // .env, .ENV, .git, ..
  const path = await realpath(join(ROOT, asked));                // the long name: on Windows, GIT~1 is .git
  const inside = relative(ROOT, path);
  if (isAbsolute(inside) || inside.split(sep).some(part => part.startsWith('.'))) throw forbidden();
  return path;
}

createServer(async (req, res) => {
  try {
    if (!HOSTS.includes(String(req.headers.host).toLowerCase())) throw forbidden();
    if (await api.handle(req, res)) return;
    const url = new URL(req.url, 'http://x'), asked = decodeURIComponent(url.pathname);
    let path = await local(asked);
    if ((await stat(path)).isDirectory()) {
      if (!asked.endsWith('/')) {                                   // /examples -> /examples/, so its relative links work
        res.writeHead(301, { Location: `/${url.pathname.replace(/^\/+/, '')}/${url.search}` });
        return res.end();
      }
      path = join(path, 'index.html');
    }
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch (e) {
    if (res.headersSent) return res.end();
    res.writeHead(e.code === 'EACCES' ? 403 : 404, { 'Content-Type': 'text/plain' });
    res.end(e.code === 'EACCES' ? 'forbidden' : 'not found');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Wireface SDK on http://127.0.0.1:${PORT}/`);
  console.log(`  examples  http://127.0.0.1:${PORT}/examples/`);
  console.log(api.enabled
    ? '  api       on: /api/detect (Gemini Pro), /api/live/token, /api/generate (the key stays in this process)'
    : '  api       off: set GEMINI_API_KEY (or put it in .env) for Gemini detection, conversations and new characters');
});
