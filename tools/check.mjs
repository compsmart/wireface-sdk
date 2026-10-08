// Opens every example in Chrome, against the bundles in dist/: each page must load without a console error or
// warning, a failed request or a missing file, and each one is photographed into shots/ (git ignores it).
//
//   npm run check                      all of them
//   npm run check -- 3d/hello.html     one (a path under examples/)
//
// Uses playwright-core with the Chrome you already have (CHROME_PATH for another). The files are served straight from
// disk to the browser, with no server in between; /api/* answers as the dev server does without a Gemini key. WebGL
// runs on SwiftShader, so it's slow but needs no GPU: each page gets a few seconds to settle.
import { mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BASE = 'http://wireface.test/';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.m4a': 'audio/mp4', '.glb': 'model/gltf-binary',
};
const only = process.argv.slice(2).filter(a => !a.startsWith('-'));

let chromium;
try { ({ chromium } = await import('playwright-core')); } catch { console.error('playwright-core is missing: run npm install'); process.exit(1); }
const browser = await chromium.launch({
  headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});

async function serve(route) {
  const url = new URL(route.request().url());
  if (url.pathname.startsWith('/api/')) {
    const status = url.pathname === '/api/status';
    return route.fulfill({ status: status ? 200 : 503, contentType: 'application/json',
      body: JSON.stringify(status ? { gemini: false } : { error: 'no Gemini key on this server' }) });
  }
  let path = join(ROOT, decodeURIComponent(url.pathname));
  if (!path.startsWith(ROOT + sep)) return route.fulfill({ status: 403, body: 'forbidden' });
  try {
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
    return route.fulfill({ status: 200, contentType: TYPES[extname(path)] || 'application/octet-stream', body: await readFile(path) });
  } catch {
    return route.fulfill({ status: 404, body: 'not found' });
  }
}

const sets = ['3d', '2d', 'three'];
const pages = only.length ? only : ['', ...sets.map(s => `${s}/`),
  ...(await Promise.all(sets.map(async s => (await readdir(join(ROOT, 'examples', s))).filter(f => f.endsWith('.html') && f !== 'index.html').map(f => `${s}/${f}`)))).flat()];
await mkdir(join(ROOT, 'shots'), { recursive: true });
let failed = 0;

try {
  for (const path of pages) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
    await page.route(`${BASE}**`, serve);
    const problems = [];
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`); });
    page.on('pageerror', e => problems.push(String(e)));
    page.on('requestfailed', r => problems.push(`failed: ${r.url()}`));
    page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/api/')) problems.push(`${r.status()}: ${r.url()}`); });
    const t0 = Date.now();
    await page.goto(`${BASE}examples/${path}`, { waitUntil: 'load' });
    await page.waitForTimeout(path.endsWith('.html') ? 6000 : 1000);
    const name = `${(path || 'index').replace(/[/.]+/g, '_').replace(/_html$|_$/g, '') || 'index'}.png`;
    const shot = await page.screenshot({ path: join(ROOT, 'shots', name) });
    if (path.endsWith('.html') && shot.length < 15000) problems.push(`the page looks blank (${shot.length} bytes)`);
    console.log(`${problems.length ? 'FAIL' : 'ok  '} examples/${path} (${((Date.now() - t0) / 1000).toFixed(1)} s) -> shots/${name}`);
    for (const p of problems) console.log(`       ${p}`);
    if (problems.length) failed++;
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `${failed} page(s) with problems` : 'every example loaded cleanly');
process.exit(failed ? 1 : 0);
