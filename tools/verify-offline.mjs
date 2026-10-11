// Offline creation/playback and renderer replacement checks against distributed files.
import assert from 'node:assert/strict';
import { readFile, mkdir, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const root = resolve(process.env.WIREFACE_TEST_SDK || fileURLToPath(new URL('..', import.meta.url)));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.m4a': 'audio/mp4' };
const external = [], problems = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
try {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'wireface.test') { external.push(url.href); return route.abort(); }
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body style="background:#102035;color:white"><h1>Wireface offline verification</h1><canvas id="local" style="width:360px;height:400px"></canvas><canvas id="two" style="width:360px;height:400px"></canvas><canvas id="three" style="width:360px;height:400px"></canvas></body></html>' });
    const path = resolve(root, '.' + url.pathname);
    if (!path.startsWith(root + sep)) return route.abort();
    try {
      let body = await readFile(path);
      if (/\.[cm]?js$/.test(path)) body = Buffer.from(body.toString().replace(/from\s*(["'])three\1/g, 'from "/node_modules/three/build/three.module.js"'));
      return route.fulfill({ contentType: types[extname(path)] || 'application/octet-stream', body });
    } catch { return route.fulfill({ status: 404, body: 'missing' }); }
  });
  const page = await context.newPage();
  page.on('pageerror', e => problems.push(String(e)));
  await page.goto('http://wireface.test/');
  const result = await page.evaluate(async () => {
    const core = await import('/dist/wireface.js'), two = await import('/dist/2d.js');
    const three = await import('/dist/three.js'), THREE = await import('/node_modules/three/build/three.module.js');
    const check = (condition, label) => { if (!condition) throw new Error(label); };
    const picture = await (await fetch('/assets/skins/sarah.jpg')).blob();
    const skin = await core.skinFromPhoto(picture);
    const face = core.createFace(document.querySelector('#local'), { follow: false });
    const canonicalBase = Array.from(face.view.rig.base);
    await face.useSkin(skin); face.set({ skin_amount: 1 }); face.express('happy');
    check(canonicalBase.every((v, i) => v === face.view.rig.base[i]), 'Local photo mapping changed mesh geometry');
    const prepared = await core.loadCharacter(await (await fetch('/assets/skins/sarah.wireface.json')).blob());
    const saved = await core.exportCharacter(prepared);
    const rig = await core.loadCharacter(saved);
    const flat = await core.loadCharacter(await (await fetch('/assets/2d/characters/sora.wireface.json')).blob());
    const flatSaved = await two.exportCharacter(flat);
    const face2d = two.createFace2d(document.querySelector('#two'));
    await face2d.useCharacter(await two.loadCharacter(flatSaved), { transition: 0 }); face2d.express('happy');
    const mesh = new three.FaceMesh(); await mesh.useCharacter(rig, { transition: 0 }); mesh.express('surprised');
    const scene = new THREE.Scene(); scene.add(mesh, new THREE.AmbientLight(0xffffff, 2));
    const camera = new THREE.PerspectiveCamera(35, .9, .01, 10); camera.position.z = 1.3;
    const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#three'), alpha: true }); renderer.setSize(360,400,false);
    renderer.setAnimationLoop(() => renderer.render(scene,camera));
    const prior = mesh.rig, bad = structuredClone(rig); bad.rig.base[0] = NaN;
    let rejected = false; try { await mesh.useCharacter(bad); } catch { rejected = true; }
    check(rejected && prior === mesh.rig, 'Invalid character replaced three.js rig');
    const prior2 = face2d.view.character, bad2 = structuredClone(flat); bad2.transfer.J = [];
    try { await face2d.useCharacter(bad2); } catch {}
    check(face2d.view.character === prior2, 'Invalid character replaced 2D rig');
    // Expired/revoked credentials are deliberately irrelevant: no client is constructed.
    localStorage.setItem('wireface-token', 'expired-or-revoked');
    const audio = new AudioContext(); await audio.resume();
    const data = await (await fetch('/assets/voices/sarah.m4a')).arrayBuffer();
    const source = audio.createBufferSource(); source.buffer = await audio.decodeAudioData(data);
    source.connect(audio.destination); const stop = face.listenTo(audio, source); const stop2 = face2d.listenTo(audio, source); const stop3 = mesh.listenTo(audio, source);
    source.start(); await new Promise(r => setTimeout(r, 1300));
    check(face.view.animator.mouth.energy > 0, 'Audio did not drive local lip sync');
    source.stop(); stop(); stop2(); stop3();
    window.offlineFaces = { face, face2d, mesh, renderer };
    return { localLandmarks: skin.landmarks.length, unchangedCanonicalMesh: true, portable3dBytes: saved.size,
      portable2dBytes: flatSaved.size, expressions: true, localLipSync: true, invalidReplacementRejected: true };
  });
  await mkdir(resolve(root, 'shots'), { recursive: true });
  await page.screenshot({ path: resolve(root, 'shots/offline.png') });
  assert.deepEqual(external, [], 'Unexpected external requests'); assert.deepEqual(problems, []);
  console.log('PASS offline mapping and portable playback', JSON.stringify(result));
} finally { await browser.close(); }
