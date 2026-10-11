// Integration and visual evidence against site/dist. All external requests are blocked or explicitly mocked.
import assert from 'node:assert/strict';
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const DIST = join(ROOT, 'site', 'dist');
const OUT = join(ROOT, 'sdk', 'shots', 'engine');
const BASE = 'http://wireface.test';
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css',
  '.json': 'application/json', '.wasm': 'application/wasm', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.m4a': 'audio/mp4' };
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const unexpected = [], mocked = [], errors = [], requests = [];
let submitted;
const context = await browser.newContext({ viewport: { width: 1280, height: 850 }, reducedMotion: 'reduce' });
await context.route('**/*', async route => {
  const req = route.request(), url = new URL(req.url()); requests.push(req.url());
  if (url.hostname === 'formsubmit.co') {
    submitted = req.postDataJSON();
    return route.fulfill({ json: { success: true } });
  }
  if (url.hostname === 'fonts.googleapis.com' || url.href === 'https://chat.wireface.dev/widget.js') {
    mocked.push(url.href); return route.fulfill({ contentType: url.hostname === 'fonts.googleapis.com' ? 'text/css' : 'text/javascript', body: '' });
  }
  if (url.origin !== BASE) { unexpected.push(req.url()); return route.abort(); }
  if (url.pathname.startsWith('/api/')) {
    return route.fulfill({ json: url.pathname.includes('account') ? null : { gemini: false, checkout: false, code: 'contact_sales' } });
  }
  if (url.pathname === '/__test.html') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>Engine checks</title><body style="margin:0;background:#101726;color:white;font:16px sans-serif"><main></main>' });
  let path = resolve(DIST, '.' + decodeURIComponent(url.pathname));
  if (path !== DIST && !path.startsWith(DIST + sep)) return route.fulfill({ status: 403 });
  try {
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
    return route.fulfill({ contentType: mime[extname(path)] || 'application/octet-stream', body: await readFile(path) });
  } catch { errors.push(`404 ${url.pathname}`); return route.fulfill({ status: 404, body: 'missing' }); }
});
context.on('page', p => p.on('pageerror', e => errors.push(e.stack || String(e))));
try {
  const page = await context.newPage();
  await page.goto(BASE + '/__test.html');
  const result = await page.evaluate(async () => {
    const sdk = await import('/assets/sdk/dist/wireface.js');
    const two = await import('/assets/sdk/dist/2d.js');
    const three = await import('/assets/sdk/dist/three.js');
    const eq = (a, b, why) => { if (a !== b) throw new Error(why); };
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'width:380px;height:430px'; document.querySelector('main').append(canvas);
    const face = sdk.createFace(canvas, { follow: false });
    const sarah = await sdk.loadCharacter('/assets/sdk/assets/skins/sarah.wireface.json');
    const ruth = await sdk.loadCharacter('/assets/sdk/assets/skins/ruth.wireface.json');
    await face.useCharacter(sarah, { transition: 0 });
    const old = face.view.rig;
    const invalid = structuredClone(sarah); invalid.rig.base = new Float32Array(1);
    await face.useCharacter(invalid).then(() => { throw new Error('Accepted invalid character'); }, () => {});
    eq(face.view.rig, old, 'Invalid rig replaced the previous face');
    const badImage = { ...sarah, texture: 'data:image/png;base64,AAAA' };
    await face.useCharacter(badImage).then(() => { throw new Error('Accepted invalid texture'); }, () => {});
    eq(face.view.rig, old, 'Invalid texture replaced the previous face');
    await Promise.all([face.useCharacter(sarah, { transition: 0.2 }), face.useCharacter(ruth, { transition: 0.2 })]);
    eq(face.character.name, ruth.name, 'Latest 3D character did not win');
    await wait(350); eq(face.view.rig, face.character.rig, 'Transition did not finish');
    const gl = canvas.getContext('webgl2'), lose = gl.getExtension('WEBGL_lose_context');
    lose.loseContext(); await wait(120); lose.restoreContext(); await wait(550);
    eq(face.view.lost, false, 'WebGL context did not recover');
    eq(face.view.rig, face.character.rig, 'Recovered wrong rig');
    if (!face.view.renderer.photoTex) throw new Error('Photo missing after context recovery');
    const local = await sdk.skinFromPhoto('/assets/sdk/assets/skins/sarah.jpg');
    await face.useSkin(local, { transition: 0 });
    const file = await sdk.exportCharacter(sarah), reloaded = await sdk.loadCharacter(file);
    await face.useCharacter(reloaded, { transition: 0 });
    eq(reloaded.rig.base[100], sarah.rig.base[100], 'Export changed geometry');
    const c2 = canvas.cloneNode(); document.querySelector('main').append(c2);
    const picture = two.createFace2d(c2, { follow: false });
    const sora = await two.loadCharacter('/assets/sdk/assets/2d/characters/sora.wireface.json');
    const ava = await two.loadCharacter('/assets/sdk/assets/2d/characters/ava.wireface.json');
    await picture.useCharacter(sora, { transition: 0 });
    const previous2 = picture.view.character;
    const invalid2 = structuredClone(sora); invalid2.transfer.J = [];
    await picture.useCharacter(invalid2).then(() => { throw new Error('Accepted invalid transfer'); }, () => {});
    eq(picture.view.character, previous2, 'Invalid transfer replaced face');
    const pending2 = picture.useCharacter(ava, { transition: 0.4 }); await wait(40);
    await picture.useCharacter(invalid2).catch(() => {}); await pending2; await wait(250);
    eq(picture.view.character, previous2, 'Superseded 2D load replaced face');
    if (picture.view.vanish > 0.01) throw new Error('Superseded 2D load hid previous face');
    const lose2 = c2.getContext('webgl2').getExtension('WEBGL_lose_context');
    lose2.loseContext(); await wait(120); lose2.restoreContext(); await wait(450);
    eq(picture.view.lost, false, '2D context did not recover');
    eq(picture.view.transfer.rest[10], sora.transfer.rest[10], '2D restoration lost prepared transfer');
    const mesh = three.createFaceMesh({ autoUpdate: false });
    await mesh.useCharacter(sarah, { transition: 0 });
    const priorMesh = mesh.rig;
    const pending3 = mesh.useCharacter(ruth, { transition: 0.3 }); await wait(40);
    await mesh.useCharacter(invalid).catch(() => {}); await pending3; await wait(800);
    eq(mesh.rig, priorMesh, 'Superseded three.js load replaced face');
    if (mesh.vanish > 0.01) throw new Error('Superseded three.js load hid previous face');
    await mesh.useCharacter(ruth, { transition: 0 });
    eq(mesh.driver.rig, mesh.rig, 'three.js driver rig stale');
    eq(mesh.eyes.R.position.y, mesh.rig.eyes.R.center[1], 'three.js eyes stale');
    eq(mesh.faceGeometry.attributes.aLips.array[100], mesh.rig.masks.lips[100], 'three.js masks stale');
    const cloned = mesh.clone(); await cloned.ready;
    eq(cloned.character.name, ruth.name, 'Clone lost the installed character');
    eq(cloned.rig.base[100], mesh.rig.base[100], 'Clone lost the fitted rig');
    cloned.dispose(); await mesh.useSkin(null);
    eq(mesh.character, null, 'Clearing a photo retained the character');
    mesh.dispose(); face.destroy(); picture.destroy();
    document.querySelector('main').replaceChildren();
    return { offlineCreation: true, characterBytes: file.size, invalidInputs: true, rapidChanges: true, contextRecovery: true };
  });
  console.log('PASS character integration', JSON.stringify(result));
  await page.close();
  if (process.argv.includes('--integration-only')) { await browser.close(); process.exit(0); }
  const playback = await context.newPage();
  const before = requests.length;
  await playback.goto(BASE + '/examples/playback/');
  await playback.locator('#status').filter({ hasText: 'local playback' }).waitFor();
  assert.ok(!requests.slice(before).some(u => u.includes('/creator/') || u.includes('mediapipe')), 'Playback imported creation code');
  await playback.locator('#character').setInputFiles(join(DIST, 'assets/sdk/assets/2d/characters/sora.wireface.json'));
  await playback.locator('#status').filter({ hasText: '2d' }).waitFor();
  await playback.screenshot({ path: join(OUT, 'playback-2d.png') }); await playback.close();
  console.log('PASS runtime-only example, including 3D to 2D file switch');
  // Keep all catalogue faces visible as a visual contact sheet, then drive smiles, speech and head turns.
  const gallery = await context.newPage(); await gallery.goto(BASE + '/__test.html');
  await gallery.evaluate(async () => {
    const { createFace, catalogue } = await import('/assets/sdk/dist/wireface.js');
    const main = document.querySelector('main'); main.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:8px';
    window.faces = [];
    for (const entry of await catalogue('/assets/sdk/assets/')) {
      const box = document.createElement('section'), label = document.createElement('p'), canvas = document.createElement('canvas');
      label.textContent = entry.name; canvas.style.cssText = 'width:280px;height:300px'; box.append(label, canvas); main.append(box);
      const face = createFace(canvas, { follow: false, config: { motion: 0 } });
      await face.useCharacter(entry.id, { transition: 0 }); window.faces.push(face);
    }
  });
  await gallery.waitForTimeout(800); await gallery.screenshot({ path: join(OUT, 'portraits-neutral.png'), fullPage: true });
  await gallery.evaluate(() => window.faces.forEach(f => { f.express('happy', 6); f.view.setPointer(180, -60); }));
  await gallery.waitForTimeout(900); await gallery.screenshot({ path: join(OUT, 'portraits-smile.png'), fullPage: true });
  await gallery.evaluate(async () => { await Promise.all(window.faces.map(async f => { const clip = await f.clip('sarah'); f.say(clip); })); });
  await gallery.waitForTimeout(700); await gallery.screenshot({ path: join(OUT, 'portraits-speech.png'), fullPage: true });
  await gallery.evaluate(() => window.faces.forEach(f => { f.hush(); f.state('asleep'); }));
  await gallery.waitForTimeout(500); await gallery.screenshot({ path: join(OUT, 'portraits-closed-lids.png'), fullPage: true });
  await gallery.close(); console.log('PASS all 11 portrait assets render');
  const art = await context.newPage(); await art.goto(BASE + '/__test.html');
  await art.evaluate(async () => {
    const { createFace2d, catalogue } = await import('/assets/sdk/dist/2d.js');
    const main = document.querySelector('main'); main.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:8px';
    for (const entry of await catalogue('/assets/sdk/assets/2d/')) {
      const box = document.createElement('section'), label = document.createElement('p'), canvas = document.createElement('canvas');
      label.textContent = entry.name; canvas.style.cssText = 'width:280px;height:300px'; box.append(label, canvas); main.append(box);
      const face = createFace2d(canvas, { follow: false, config: { motion: 0 } });
      await face.useCharacter(entry.id, { transition: 0 }); face.express('happy', 10);
    }
  });
  await art.waitForTimeout(700); await art.screenshot({ path: join(OUT, 'stylised-smiles.png'), fullPage: true });
  await art.close(); console.log('PASS all 13 stylised assets render');
  const pages = ['/', '/try/', '/2d/', '/2d/try/', '/threejs/', '/embed/', '/license/', '/docs/engine/', '/contact/?topic=licence', '/account/', '/admin/', '/acceptable-use/', '/privacy/'];
  for (const mobile of [false, true]) for (const path of pages) {
    const p = await context.newPage(); await p.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1280, height: 850 });
    await p.goto(BASE + path); await p.waitForTimeout(path.includes('try') || path === '/' ? 1600 : 150);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
    assert.equal(overflow, false, `Horizontal overflow: ${path} ${mobile ? 'mobile' : 'desktop'}`);
    if (path.startsWith('/contact')) {
      assert.equal(await p.locator('[name=topic]').inputValue(), 'Commercial licence');
      if (!mobile) {
        for (const [name, value] of Object.entries({ name: 'Test person', email: 'qa@example.invalid', organisation: 'Test Ltd', intended_use: 'Paid application', deployment: 'Offline devices', message: 'Mock submission only' })) await p.locator(`[name=${name}]`).fill(value);
        await p.locator('button[type=submit]').click(); await p.locator('#form-status[data-kind=ok]').waitFor();
        assert.equal(submitted.organisation, 'Test Ltd'); assert.equal(submitted.topic, 'Commercial licence');
      }
    }
    if (path === '/try/') {
      if (!mobile) {
        await p.locator('#compare-fit').click();
        await p.locator('#compare-fit[aria-pressed=true]').waitFor();
        await p.locator('#faces input[type=file]').setInputFiles(join(DIST, 'assets/sdk/assets/skins/sarah.jpg'));
        await p.locator('#faces .upload[aria-pressed=true]').waitFor();
        await p.locator('#reload-character').setInputFiles(join(DIST, 'assets/sdk/assets/skins/sarah.wireface.json'));
        await p.waitForTimeout(500);
        const download = p.waitForEvent('download'); await p.locator('#download-character').click();
        assert.ok((await download).suggestedFilename().endsWith('.wireface.json'));
        await p.locator('#local-audio').setInputFiles(join(DIST, 'assets/sdk/assets/voices/sarah.m4a'));
      }
      await p.locator('#tab-look').focus(); await p.keyboard.press('ArrowRight');
      assert.equal(await p.locator('[role=tab][aria-selected=true]').count(), 1);
    }
    await p.screenshot({ path: join(OUT, (mobile ? 'mobile-' : 'desktop-') + (path.split('?')[0].replaceAll('/', '-') || 'home') + '.png'), fullPage: true });
    await p.close(); console.log('PASS site', mobile ? 'mobile' : 'desktop', path);
  }
  assert.deepEqual(unexpected, [], 'Unexpected external requests');
  assert.deepEqual(errors, [], 'Browser errors');
  await writeFile(join(OUT, 'verification.json'), JSON.stringify({ ...result, externalRequests: unexpected, mockedWebsiteServices: [...new Set(mocked)], errors, screenshots: OUT, date: new Date().toISOString() }, null, 2));
  console.log('PASS offline engine, website, contact mock; evidence in', OUT);
} finally { await browser.close(); }
