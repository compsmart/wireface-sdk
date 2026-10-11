// Local runnable backend example. Production apps must add their own user authentication and abuse controls.
// Permanent keys stay in this process. Run: WIREFACE_SDK_KEY=... node examples/hosted/backend.mjs
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRiggingClient } from '../../dist/rigging.js';
import { createLiveHandler } from './live-token.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const port = Number(process.env.PORT || 5173), origin = `http://localhost:${port}`;
const liveKey = process.env.GEMINI_API_KEY || '';
const live = createLiveHandler({ root: new URL('../../', import.meta.url), key: liveKey, model: process.env.GEMINI_LIVE_MODEL });
const client = process.env.WIREFACE_SDK_KEY ? createRiggingClient({ apiKey: process.env.WIREFACE_SDK_KEY,
  ...(process.env.WIREFACE_RIGGING_URL ? { baseUrl: process.env.WIREFACE_RIGGING_URL } : {}) }) : null;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.wasm': 'application/wasm', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.m4a': 'audio/mp4' };
createServer(async (req, res) => {
  const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  try {
    if (req.headers.host !== `localhost:${port}`) return json(403, { error: 'Use ' + origin });
    const path = new URL(req.url, origin).pathname;
    if (path === '/api/status' && req.method === 'GET') return json(200, { gemini: !!liveKey });
    if (path === '/api/live/token') {
      if (req.method !== 'POST' || req.headers.origin !== origin) return json(403, { error: 'Origin or method not allowed' });
      return await live(req, json);
    }
    if (path === '/api/wireface-token') {
      if (req.method !== 'POST' || req.headers.origin !== origin) return json(403, { error: 'Origin or method not allowed' });
      if (!client) return json(503, { error: 'Set WIREFACE_SDK_KEY in the backend environment.' });
      return json(200, await client.createToken({ scope: ['rig:2d', 'rig:3d'], origin }));
    }
    if (req.method !== 'GET') return json(405, { error: 'GET required' });
    const asked = decodeURIComponent(path === '/' ? '/examples/' : path);
    if (!/^\/(examples|dist|assets|node_modules\/three)\//.test(asked) || asked.split(/[\\/]/).some(p => p.startsWith('.')))
      return json(403, { error: 'Forbidden' });
    let file = await realpath(resolve(root, '.' + asked));
    const rel = relative(root, file);
    if (isAbsolute(rel) || rel.startsWith('..')) return json(403, { error: 'Forbidden' });
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(await readFile(file));
  } catch (error) { json(error.code === 'ENOENT' ? 404 : 502, { error: error.code === 'ENOENT' ? 'Not found' : 'Request failed. Check backend configuration.' }); }
}).listen(port, '127.0.0.1', () => console.log(`Wireface examples: ${origin}`));
