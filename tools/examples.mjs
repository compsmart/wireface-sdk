// The examples: each package's examples/ pages, pointed at the SDK's bundles instead of the source they were written
// against. Every rewrite is plain text; anything still pointing into the source afterwards fails the build.
//
//   examples/3d/     from core's examples (and its config examples, in config/)
//   examples/2d/     from 2D's
//   examples/three/  from three.js's (its pages take three from node_modules: npm install first)
import { cpSync, copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const IMPORT_MAP = `<script type="importmap">
{ "imports": {
  "three": "../../node_modules/three/build/three.module.js",
  "three/addons/": "../../node_modules/three/examples/jsm/",
  "@wireface/sdk": "../../dist/wireface.js",
  "@wireface/sdk/2d": "../../dist/2d.js",
  "@wireface/sdk/2d/live": "../../dist/2d-live.js",
  "@wireface/sdk/three": "../../dist/three.js",
  "@wireface/sdk/three/characters": "../../dist/three-characters.js",
  "@wireface/sdk/three/kit": "../../dist/three-kit.js"
} }
</script>`;

const SETS = {
  '3d': {
    from: 'core/examples', config: 'core/config/examples', title: '3D',
    rewrite: [
      ["'../src/index.js'", "'../../dist/wireface.js'"],
      ['../config/examples/', './config/'],
      ['../assets/', '../../assets/'],
      ['href="../demo/"', 'href="https://wireface.dev/try/"'],
      ['Wireface core: examples', 'Wireface SDK: 3D examples'],
    ],
  },
  '2d': {
    exclude: ['detect.html', 'generate.html'], from: '2d/examples', config: '2d/config/examples', title: '2D',
    rewrite: [
      ["'../src/index.js'", "'../../dist/2d.js'"],
      ["'../src/live.js'", "'../../dist/2d-live.js'"],
      ["'../src/engine/teeth.js'", "'../../dist/2d.js'"],
      ['../config/examples/', './config/'],
      ['../config/face2d.schema.json', '../../face2d.schema.json'],
      ['../assets/voices/', '../../assets/2d/voices/'],
      ['../assets/characters/', '../../assets/2d/characters/'],
      ['../assets/brand/', '../../assets/brand/'],
      ['href="../demo/"', 'href="https://wireface.dev/2d/try/"'],
      ['Wireface 2D: examples', 'Wireface SDK: 2D examples'],
    ],
  },
  three: {
    exclude: ['attach-to-gltf.html', 'drawn-face.html', 'models/RobotFace.glb'], from: 'threejs/examples', title: 'three.js',
    rewrite: [
      [/<script type="importmap">[\s\S]*?<\/script>/, IMPORT_MAP],
      ["'@wireface/three/characters'", "'@wireface/sdk/three/characters'"],
      ["'@wireface/three'", "'@wireface/sdk/three'"],
      ["'../characters/kit.js'", "'@wireface/sdk/three/kit'"],
      ["'@wireface/core'", "'@wireface/sdk'"],
      ["'@wireface/2d/live'", "'@wireface/sdk/2d/live'"],
      ["'@wireface/2d'", "'@wireface/sdk/2d'"],
      ['href="../demo/"', 'href="https://wireface.dev/threejs/demo/"'],
      ['Wireface three.js: examples', 'Wireface SDK: three.js examples'],
      ['Wireface for three.js: examples', 'Wireface SDK: three.js examples'],
    ],
  },
};

/** Text that means a page still reaches into the source (or a repo that's gone). */
export const FORBIDDEN = ['../src/', '../characters/', '../demo/', '../config/', '../docs/', '../tools/', 'node_modules/@wireface',
  "'@wireface/core", "'@wireface/2d", "'@wireface/three", '"@wireface/core', '"@wireface/2d', '"@wireface/three',
  'github.com/compsmart/wireface-core', 'github.com/compsmart/wireface-2d', 'github.com/compsmart/wireface-threejs',
  'github.com/compsmart/wireface-desktop', 'github.com/compsmart/wireface-chatbot', 'github.com/compsmart/wireface-agent-call-simulator',
  'import.meta.resolve', '/creator/', 'pictureCharacter', 'autoAttach', 'ModelFace'];

const TEXT = /\.(html|js|mjs|css|json|md)$/;

function copy(from, to, rules, exclude = [], root = from) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    const path = join(from, name);
    if (exclude.includes(relative(root, path).replaceAll('\\', '/'))) continue;
    if (statSync(path).isDirectory()) { copy(path, join(to, name), rules, exclude, root); continue; }
    if (!TEXT.test(name)) { copyFileSync(path, join(to, name)); continue; }
    let text = readFileSync(path, 'utf8').replace(/\r\n/g, '\n').replaceAll('.wface', '.wireface.json');
    if (name === 'index.html' && exclude.length) {
      for (const page of exclude) text = text.replace(new RegExp(`<li>(?:(?!<li>)[^])*?href="${page.replaceAll('.', '\\.') }"[^]*?</li>`, 'g'), '');
      text = text.replace('</ul>', '<li><a href="../hosted/"><b>Hosted character rigging</b><span>Create a prepared 2D picture or 3D portrait, export it, then play it offline.</span></a></li></ul>');
      text = text.replace('The detect, generate and conversation examples need', 'The conversation example needs');
    }
    text = text.replace('(or put it in <code>.env</code>) ', '').replace('put <code>GEMINI_API_KEY=...</code> in\n    <code>.env</code>', 'set <code>GEMINI_API_KEY</code> in the backend environment');
    for (const [a, b] of rules) text = typeof a === 'string' ? text.split(a).join(b) : text.replace(new RegExp(a, 'g'), () => b);
    writeFileSync(join(to, name), text);
  }
}

function check(dir) {
  const bad = [];
  const walk = d => {
    for (const name of readdirSync(d)) {
      const path = join(d, name);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      if (!TEXT.test(name)) continue;
      readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
        for (const f of FORBIDDEN) if (line.includes(f)) bad.push(`examples/${relative(dir, path).replace(/\\/g, '/')}:${i + 1}: ${f}`);
      });
    }
  };
  walk(dir);
  if (bad.length) throw new Error(`examples still point into the source:\n  ${bad.join('\n  ')}`);
}

/** Writes the SDK's examples into `out` from the staged repos in `src`. */
export function buildExamples(src, out) {
  for (const [set, { from, config, rewrite, exclude }] of Object.entries(SETS)) {
    copy(join(src, from), join(out, set), rewrite, exclude);
    if (config) copy(join(src, config), join(out, set, 'config'), []);
  }
  copy(fileURLToPath(new URL('./templates/three/', import.meta.url)), join(out, 'three'), SETS.three.rewrite);
  writeFileSync(join(out, 'index.html'), INDEX);
  copy(fileURLToPath(new URL('./templates/playback/', import.meta.url)), join(out, 'playback'), []);
  copy(fileURLToPath(new URL('./templates/hosted/', import.meta.url)), join(out, 'hosted'), []);
  writeFileSync(join(out, 'hosted/live-setup.js'), readFileSync(join(src, '2d/src/live-setup.js'), 'utf8')
    .replace("'./core/expressions.js'", "'../../dist/2d.js'").replace('see server/api.mjs', 'see live-token.mjs'));
  check(out);
}

const INDEX = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wireface SDK: examples</title>
<link rel="icon" href="../assets/brand/mark.svg" type="image/svg+xml">
<link rel="stylesheet" href="3d/example.css">
<style>body { display: block; padding: 32px; max-width: 760px; margin: auto; } li { margin: 12px 0; } li p { margin-top: 2px; }</style>
<h1>Wireface SDK: examples</h1>
<p>Small pages, one feature each: view their source. Serve this folder over http(s) (<code>npm start</code> does).</p>
<ul>
  <li><a href="hosted/">Hosted 2D and three.js rigging</a><p>Progress, cancellation, export, reload and local audio.</p></li>
  <li><a href="3d/photo.html">Offline fixed-frame photo mapping</a></li>
  <li><a href="playback/">Portable character playback</a><p>Load exported .wireface.json files using only the runtime; local audio lip-sync included.</p></li>
  <li><a href="3d/">3D faces</a><p><code>@wireface/sdk</code>: a wireframe, sculpted or photo-skinned face on a canvas.</p></li>
  <li><a href="2d/">2D faces</a><p><code>@wireface/sdk/2d</code>: any picture of a face, brought to life.</p></li>
  <li><a href="three/">three.js</a><p><code>@wireface/sdk/three</code>: faces on the heads of three.js characters (run <code>npm install</code> first, for three).</p></li>
</ul>
`;
