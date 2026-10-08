// The SDK's docs, built from the engine repos' user guides so the two stay in step:
//   core/docs/guide.md           -> docs/guide.md        3D faces
//   2d/docs/guide.md             -> docs/2d.md           2D faces
//   threejs/docs/guide.md        -> docs/three.md        three.js
//   threejs/docs/characters.md   -> docs/characters.md   the cast
// with the pictures they show copied to docs/images/3d/, 2d/ and three/.
//
// Rules adapt each guide to the SDK: its install steps and package names, links between the guides, and none of the
// engine's insides (source files, the repos' tools, tests and demos). Every rule must match what it expects, or the
// build stops naming the guide and the rule, so a changed guide gets looked at here rather than slipping through.
// The longer passages written for the SDK are in templates/docs/. Then the whole output is checked: nothing from
// FORBIDDEN, no source file named, every link, anchor and picture where it should be.
//
//   node tools/docs.mjs [src]    src holds core/, 2d/ and threejs/ (default: the folder above the SDK)
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SDK = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATES = join(SDK, 'tools', 'templates', 'docs');
const CDN = 'https://cdn.jsdelivr.net/gh/compsmart/wireface-sdk@v{{VERSION}}/dist';

/** Never in the SDK's docs (any case): the private repos, their tools, their sources and their old package names. */
export const FORBIDDEN = [
  // the repos the SDK is built from, which are private: only the SDK's own (wireface-sdk) may be linked or cloned
  'github.com/compsmart/wireface-core', 'github.com/compsmart/wireface-2d', 'github.com/compsmart/wireface-threejs',
  'github.com/compsmart/wireface-desktop', 'github.com/compsmart/wireface-chatbot', 'github.com/compsmart/wireface-agent-call-simulator',
  'git submodule', 'src/', '/engine/', 'tools/', 'sync-core', 'npm run',
  'npm test', 'service.py', 'import.meta.resolve', 'node_modules/@wireface/core', 'node_modules/@wireface/2d',
  '@wireface/core', '@wireface/2d', '@wireface/three', '../demo/',
];

// The only files the docs may name with a script's extension: the SDK's bundles, three.js and its parts, MediaPipe's
// bundle and a bundler's config.
const FILES = new Set(['wireface.js', '2d.js', '2d-live.js', 'three-characters.js', 'three-kit.js', 'three.js',
  'three.module.js', 'SkeletonUtils.js', 'vision_bundle.mjs', 'vite.config.js']);

// What else gives the engine away, or is left over from the repos.
const CHECKS = [
  [/\b[\w.-]+\.(?:m?js|py)\b/g, m => !FILES.has(m), 'names a source file'],
  [/thin-plate|jacobian|least squares|onBeforeCompile|stencil/gi, () => true, "describes the engine's workings"],
  [/\bcore\b/gi, () => true, 'calls the 3D face "core"'],
  [/\{\{\w+\}\}/g, () => true, 'has a template value left in it'],
];

// The repos' package names, and the SDK's for each. Anything else under @wireface/core, 2d or three stops the build.
const PACKAGES = {
  '@wireface/core': '@wireface/sdk',
  '@wireface/core/config': '@wireface/sdk/config',
  '@wireface/core/expressions': '@wireface/sdk',
  '@wireface/core/skins': '@wireface/sdk',
  '@wireface/core/speech': '@wireface/sdk',
  '@wireface/core/face.schema.json': '@wireface/sdk/face.schema.json',
  '@wireface/core/config/face.schema.json': '@wireface/sdk/face.schema.json',
  '@wireface/2d': '@wireface/sdk/2d',
  '@wireface/2d/speech': '@wireface/sdk/2d',
  '@wireface/2d/live': '@wireface/sdk/2d/live',
  '@wireface/2d/server': '@wireface/sdk/2d/server',
  '@wireface/2d/config': '@wireface/sdk/2d/config',
  '@wireface/2d/config/face2d.schema.json': '@wireface/sdk/face2d.schema.json',
  '@wireface/three': '@wireface/sdk/three',
  '@wireface/three/characters': '@wireface/sdk/three/characters',
  '@wireface/three/characters/kit.js': '@wireface/sdk/three/kit',
};

function sdkPackage(name) {
  if (Object.hasOwn(PACKAGES, name)) return PACKAGES[name];
  if (name.startsWith('@wireface/core/engine/')) return '@wireface/sdk';          // all exported from the top
  if (name.startsWith('@wireface/core/assets')) return name.replace('@wireface/core/', '@wireface/sdk/');
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Rules

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Exact text, except that any run of whitespace matches any other: rewrapping a guide breaks no rule. */
const loose = text => new RegExp(text.trim().split(/\s+/).map(escape).join('\\s+'), 'g');
const short = text => JSON.stringify(text.trim().replace(/\s+/g, ' ').slice(0, 60));
const img = (file, alt) => `<img src="images/${file}" alt="${alt}">`;

/** A guide being adapted. Each rule throws unless it matches as it expects to. */
class Doc {
  constructor(name, text) {
    this.name = name;
    this.text = text.replace(/\r\n/g, '\n');
  }

  fail(rule, why) {
    throw new Error(`docs: ${this.name}: ${rule}: ${why}`);
  }

  /** The one match of a pattern. */
  once(rule, re, from = 0) {
    const found = [...this.text.slice(from).matchAll(re)];
    if (found.length !== 1) this.fail(rule, found.length ? `found ${found.length} times, expected once` : 'not found');
    return { index: from + found[0].index, end: from + found[0].index + found[0][0].length };
  }

  /** The first line must be `from`; it becomes `to`, with `intro` under it. */
  title(from, to, intro) {
    const first = this.text.slice(0, this.text.indexOf('\n'));
    if (first !== from) this.fail(`title ${short(from)}`, `the guide starts ${short(first)}`);
    this.text = to + (intro ? `\n\n${intro}` : '') + this.text.slice(first.length);
  }

  /** Exact text, found `count` times, replaced. */
  swap(find, to, count = 1) {
    const re = loose(find);
    const n = (this.text.match(re) || []).length;
    if (n !== count) this.fail(`swap ${short(find)}`, n ? `found ${n} times, expected ${count}` : 'not found');
    this.text = this.text.replace(re, () => to);
  }

  /** Everything from `from` (found once) to the end of the first `to` after it, replaced. */
  between(from, to, text) {
    const rule = `replace ${short(from)} to ${short(to)}`;
    const start = this.once(rule, loose(from));
    const end = loose(to).exec(this.text.slice(start.index));
    if (!end) this.fail(rule, 'the end not found after the start');
    this.text = this.text.slice(0, start.index) + text + this.text.slice(start.index + end.index + end[0].length);
  }

  /** Every match of a regular expression through `fn`: at least `min` of them. */
  each(rule, re, fn, min = 1) {
    let n = 0;
    this.text = this.text.replace(re, (...m) => (n++, fn(...m)));
    if (n < min) this.fail(rule, `matched ${n} times, expected at least ${min}`);
  }

  /** The section under a heading line ('## 4. Skins', '### Bundlers'), to the next heading of its level or above. */
  section(heading) {
    const rule = `section ${short(heading)}`;
    const all = headings(this.text);
    const found = all.filter(h => h.line === heading);
    if (found.length !== 1) this.fail(rule, found.length ? `found ${found.length} times, expected once` : 'not found');
    const h = found[0];
    const next = all.find(o => o.start > h.start && o.level <= h.level);
    return { ...h, end: next ? next.start : this.text.length };
  }

  /** A section dropped, with its line in the table of contents. */
  drop(heading) {
    const s = this.section(heading);
    this.text = this.text.slice(0, s.start) + this.text.slice(s.end);
    if (s.level !== 2) return;
    const entry = new RegExp(`^[ \\t]*(?:[-*]|\\d+\\.)[ \\t]+\\[[^\\]\\n]*\\]\\(#${escape(s.slug)}\\)[ \\t]*\\n`, 'gm');
    const at = this.once(`contents entry for ${short(heading)}`, entry);
    this.text = this.text.slice(0, at.index) + this.text.slice(at.end);
  }

  /** A section's text replaced, its heading kept. */
  replace(heading, text) {
    const s = this.section(heading);
    this.text = `${this.text.slice(0, s.lineEnd)}\n\n${text}\n\n${this.text.slice(s.end)}`;
  }

  /** Text put straight under a heading. */
  after(heading, text) {
    const s = this.section(heading);
    this.text = `${this.text.slice(0, s.lineEnd)}\n\n${text}${this.text.slice(s.lineEnd)}`;
  }
}

/** Headings outside code blocks: { level, line, slug, start, lineEnd }. */
function headings(text) {
  const out = [];
  const seen = new Map();
  let fenced = false;
  let at = 0;
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    const m = !fenced && line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (m) {
      let slug = slugOf(m[2]);
      const n = seen.get(slug) || 0;
      seen.set(slug, n + 1);
      if (n) slug += `-${n}`;
      out.push({ level: m[1].length, line, title: m[2], slug, start: at, lineEnd: at + line.length });
    }
    at += line.length + 1;
  }
  return out;
}

/** GitHub's anchor for a heading. */
const slugOf = title => title.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/ /g, '-');

/** Named blocks of a template file, each of which must be used. */
function templates(file) {
  const blocks = new Map();
  const parts = readFileSync(join(TEMPLATES, file), 'utf8').replace(/\r\n/g, '\n').split(/^<!-- ([\w-]+) -->\n/m);
  for (let i = 1; i < parts.length; i += 2) blocks.set(parts[i], parts[i + 1].trim());
  const used = new Set();
  const t = name => {
    if (!blocks.has(name)) throw new Error(`docs: templates/docs/${file}: no block called ${name}`);
    used.add(name);
    return blocks.get(name);
  };
  t.done = () => {
    const unused = [...blocks.keys()].filter(k => !used.has(k));
    if (unused.length) throw new Error(`docs: templates/docs/${file}: blocks not used: ${unused.join(', ')}`);
  };
  return t;
}

// ---------------------------------------------------------------------------------------------------------------
// The guides

/** core/docs/guide.md -> guide.md */
function guide3d(doc, t) {
  doc.title('# Wireface core: user guide', '# Wireface SDK: 3D faces');
  doc.swap('one small page per topic.',
    'one small page per topic. The SDK also brings any picture of a face to life\n' +
    '([2D faces](2d.md)) and puts faces on three.js characters ([three.js](three.md)).');

  // Install: the SDK's ways in, in place of the repo's
  doc.between('Wireface core is plain ES modules', '`/engine/*`, `/assets/*` and `/face.schema.json`.', t('install'));
  doc.swap('`npm start` runs a tiny static server;',
    "`npm start` in the SDK's folder serves the examples at http://127.0.0.1:5173/examples/;");
  doc.swap('Core finds its files relative to its own modules', 'The face finds its files relative to its own bundle');
  doc.swap('where its assets are. This was tested with Vite, in both the dev server and the production build:',
    'where its assets are:');
  doc.swap('The same `assets` option applies to them.',
    "The same `assets` option applies to them. The 2D faces' files\n" +
    'are in the same folder, under `2d/`: see [2D faces](2d.md#bundlers).');
  doc.swap("import { createFace } from './wireface-core/src/index.js';",
    `import { createFace } from '${CDN}/wireface.js';`);

  // The playground is on the site, not in the SDK
  doc.swap('as `demo/` does.', 'as the [playground](https://wireface.dev/try/) does.');
  doc.swap('// a slider, as in the demo:', '// a slider, as in the playground:');
  doc.swap("pickers like the demo's.", "pickers like the playground's.");
  doc.swap("There are examples in `config/examples/`. The demo's Config panel",
    "There are examples in `examples/3d/config/`. The [playground](https://wireface.dev/try/)'s Config panel");

  // Clips from your own audio: the tool isn't in the SDK
  doc.replace('### Making clips', t('making-clips'));
  doc.swap('For the best lip sync, run your TTS output through `tools/lipsync` on the server, send the clip JSON ' +
    'with the audio, and `face.say()` it instead.',
  "For lip sync as close as a clip's, play a streaming TTS through [`StreamVoice`](#streamed-speech) instead.");

  doc.swap('"$schema": "https://raw.githubusercontent.com/compsmart/wireface-core/main/config/face.schema.json"',
    '"$schema": "https://wireface.dev/schema/face.schema.json"');

  // Under the hood: what happens, not where
  doc.between('The friendly API in',
    "| `mesh-data.js` | MediaPipe's canonical face mesh: positions, UVs, triangles |", t('under-the-hood'));
  doc.drop('## 13. Working on core');
}

/** 2d/docs/guide.md -> 2d.md */
function guide2d(doc, t) {
  doc.title('# Wireface 2D: user guide', '# Wireface SDK: 2D faces', t('intro'));

  // Install and bundlers
  doc.between('Wireface 2D is plain ES modules: copy the folder', "// or './wireface-2d/src/index.js' ```",
    t('install'));
  doc.swap('`npm start` runs a dev server with no dependencies;',
    "`npm start` in the SDK's folder runs a dev server with no dependencies, with the examples at\n" +
    'http://127.0.0.1:5173/examples/;');
  doc.between('The library finds its own files', "`createFace2d(canvas, { assets: '/wireface-2d/' })`.",
    t('bundlers'));
  doc.swap("import { createFace2d } from './wireface-2d/src/index.js';",
    `import { createFace2d } from '${CDN}/2d.js';`);

  // Characters: the SDK's folders; your own found at run time, not baked
  doc.swap('`assets/characters/characters.json` lists the ready-made ones:',
    '`assets/2d/characters/characters.json` lists the ready-made ones, whose faces were found ahead of time:');
  doc.between('To add it to a catalogue, put the picture in a folder', '`npm run bake -- <id> --from <folder>`.',
    t('own-catalogue'));
  doc.swap('(`ART_STYLES` in `src/styles.js`)', '(`ART_STYLES`)');

  // Finding faces, without the prompt's file or the maths
  doc.swap("the canonical face bent onto Gemini's points (thin-plate spline)",
    "the canonical face bent onto Gemini's points");
  doc.between('`src/detect/gemini.js` holds the prompt and the response schema.',
    'an impossible one (mouth above the eyes) is refused.', t('gemini-asked'));
  doc.swap('`DetectionOverlay` (`src/overlay.js`)', '`DetectionOverlay` (from `@wireface/sdk/2d`)');
  doc.between('To keep a correction for a catalogue character', 'moves both mouth corners 5 px in.', t('keep-fit'));

  // Teeth: the sheets are made with the repo's scripts, which the SDK hasn't got
  doc.swap("core's photographic `normal`", "the 3D face's photographic `normal`");
  doc.drop('### Your own teeth picture');

  doc.swap("These are Wireface Core's (its `animator.js`, unchanged):",
    "These are the [3D face](guide.md#6-expressions-moods-and-states)'s, unchanged:");
  doc.swap("as far as on core's 3D face,", 'as far as on the 3D face,');
  doc.between('* **Recorded lines**', 'expression cues, in seconds.', t('recorded-lines'));

  // Conversations and the server: createApi from the SDK; the Python service stays private
  doc.swap('`Conversation` (`src/live.js`)', '`Conversation` (from `@wireface/sdk/2d/live`)');
  doc.between('`server/api.mjs` does exactly this', 'builds the setup.',
    '`createApi` (section 10) does exactly this (taking the `persona` only with `customPersona: true`, as the dev\n' +
    'server does).');
  doc.swap('`server/api.mjs` (Node 18+, no dependencies) answers:',
    '`createApi` from `@wireface/sdk/2d/server` (Node 18+, no dependencies) answers:');
  doc.swap('| `root` | the package folder | where `assets/characters/characters.json` is.',
    "| `root` | the SDK's folder | where `assets/2d/characters/characters.json` is.");
  doc.drop('### In Python');
  doc.swap('and `origins` (`service.py` takes `WF2D_ORIGIN`), and `trustProxy: true` if a proxy in front sets',
    'and `origins`, and `trustProxy: true` if a proxy in front sets');
  doc.swap("the key can't use the Live model: set `GEMINI_LIVE_MODEL`",
    "the key can't use the Live model: set `GEMINI_LIVE_MODEL` for the dev server, or `createApi`'s `liveModel`");

  doc.swap('checked against `config/face2d.schema.json`:', 'checked against `face2d.schema.json`:');
  doc.swap('"$schema": "./node_modules/@wireface/2d/config/face2d.schema.json"',
    '"$schema": "https://wireface.dev/schema/face2d.schema.json"');
  doc.swap('`character: null` changes nothing.', `\`character: null\` changes nothing.\n\n${t('config-schema')}`);
  doc.swap("Code written for core's `createFace` works as it is.",
    "Code written for the 3D face's `createFace` works as it is.");

  doc.replace('## 14. Under the hood', t('under-the-hood'));
  doc.drop('## 16. Working on Wireface 2D');

  // The guide has no pictures of its own: these are the 2D README's
  doc.after('### Art styles', img('styles.jpg', 'Thirteen characters: photo, 3D animated, anime, cartoon, comic, ' +
    'painting, watercolour, sketch, pixel art, claymation, flat vector, creature, robot'));
  doc.after('## 4. Finding faces', img('detection.jpg',
    "Finding a watercolour face: Gemini's box and named points, then the dense landmarks and the fitted mesh"));
  doc.after('## 6. Teeth', img('teeth.jpg',
    'Gus with rendered teeth, photographic teeth, cartoon teeth, vampire teeth, and none'));
  doc.after('## 7. Expressions, moods and states', img('expressions.jpg',
    'Pip: neutral, happy, surprised, sad, frustrated'));
}

/** threejs/docs/guide.md -> three.md */
function guideThree(doc, t) {
  doc.title('# Wireface for three.js: user guide', '# Wireface SDK: three.js');
  doc.swap('and how to build characters of your own.',
    'and how to build characters of your own. For working code, see `examples/three/`; the\n' +
    '[Wireface Theatre](https://wireface.dev/threejs/demo/) puts the whole cast on one stage.');

  // Quick start: the SDK, and an import map for three
  doc.between('```sh npm install        # three, and',
    'npm test           # node --test: faces built and stepped in Node, no browser needed ```', t('install'));
  doc.swap('The smallest scene with a face', `${img('hello.jpg',
    "A simple capsule figure with Mei's face on its head, looking at the camera")}\n\nThe smallest scene with a face`);
  doc.between('Pages that import these modules need an import map, a bundler, or both.', "as the README's has.",
    t('import-map'));

  doc.swap("Wireface core's rig", "The 3D face's rig");
  doc.swap("showing Wireface core's glowing cyan hologram face", 'showing the 3D face as a glowing cyan hologram');
  doc.swap("(the engine's face: core's `Wireface` or 2D's `Wireface2D`)",
    "(the engine's own: a `Wireface` for 3D, a `Wireface2D` for 2D)");
  doc.after('### Rigged models (glTF)', img('gltf.jpg',
    'The RobotExpressive glTF model with a glowing hologram face on a dark plate where its eyes were'));

  // Speech: no clip tools; the API from the SDK's dev server
  doc.swap('Core has eight voices', 'The 3D face has eight voices');
  doc.between("- **Your own clips.** Make them with core's tools:", '-o mine.json` (any recording)',
    t('own-clips'));
  doc.swap("Core's `StreamVoice` plays", '`StreamVoice` plays');
  doc.between("`npm start` mounts Wireface 2D's API", "Wireface 2D's guide for serving it yourself.",
    t('live-api'));
  doc.swap("carries its own copy of core's animator; the shared one writes to both.",
    'has its own copy of the animator, and this one writes to both.');

  doc.after('## 7. Looks', img('styles.jpg',
    'The same face four ways: a photo skin, a sculpted head, a cel-shaded one, and a violet hologram'));
  doc.swap("All of core's settings work, validated by core",
    "All of the 3D face's settings work, checked the same way");

  // The cast and its kit come built, not as files to read
  doc.between('The cast in `characters/` is meant to be read:', "`characters/kit.js` holds what they're made of:",
    t('kit'));

  // Bundlers: one package, one assets folder
  doc.between('The library is plain ES modules that import `three`, `@wireface/core` and `@wireface/2d` by name.',
    'Two things need care, as they do for core:', t('bundlers'));
  doc.swap("Core's skins and voices, and 2D's characters, are found relative to their modules. A bundler moves " +
    'modules, so copy the assets into your static folder',
  "The skins, voices and 2D characters are found relative to the SDK's bundles. A bundler moves modules, so\n" +
    '   copy `node_modules/@wireface/sdk/assets` into your static folder');
  doc.swap("// core's assets/ copied to public/wireface/", "// the SDK's assets/ copied to public/wireface/");
  doc.swap("'2d': '/wireface-2d/voices/'", "'2d': '/wireface/2d/voices/'");
  doc.swap("assets: '/wireface-2d/', character: 'kit'", "assets: '/wireface/2d/', character: 'kit'");
  doc.swap('Keep the Wireface packages out of dependency pre-bundling', 'Keep the SDK out of dependency pre-bundling');
  doc.swap("exclude: ['@wireface/core', '@wireface/2d', '@wireface/three']", "exclude: ['@wireface/sdk']");
  doc.between('`voices()` uses `import.meta.resolve`', 'call `setVoiceFolders()` instead.', t('voices'));

  doc.swap("| `assets` | core's |", "| `assets` | the SDK's |");
  doc.swap('From core: `MOODS`', 'From the 3D face: `MOODS`');
  doc.replace('## 13. Under the hood', t('under-the-hood'));

  // What's left of core is the 3D face
  doc.each("core's -> the 3D face's", /\b([Cc])ore's\b/g,
    (m, c) => (c === 'C' ? "The 3D face's" : "the 3D face's"));
}

/** threejs/docs/characters.md -> characters.md */
function guideCast(doc, t, src) {
  doc.title('# The cast', '# The cast');
  doc.swap('Eleven ready-made characters, each in one short file in [`characters/`](../characters/), and each ' +
    'showing one way to put a face on a head.', t('intro'));
  doc.swap("as the demo's panel shows them", "as the Theatre's panel shows them");

  // Who's who: each character's id in place of a link to its source
  doc.each('cast files', /\(\[([\w-]+)\.js\]\(\.\.\/characters\/\1\.js\)\)/g,
    (m, file) => `(\`${castId(src, file)}\`)`);
  doc.swap("FaceMesh, core's `mei` skin", 'FaceMesh, `mei` skin');
  doc.swap("Core's own renderer on a hidden canvas", "The 3D face's own renderer on a hidden canvas");
  doc.swap("Their lines are core's and Wireface 2D's recorded clips",
    "Their lines are the 3D and 2D faces' recorded clips");
  doc.swap(", or make a clip with core's `tools/voice.py`.", '.');
  doc.between('Start from the closest member of the cast and change it', '[guide](guide.md#8-building-characters)).',
    t('start-from'));
}

/** A character's id, from its file in the cast. */
function castId(src, file) {
  const path = join(src, 'threejs', 'characters', `${file}.js`);
  const id = existsSync(path) && readFileSync(path, 'utf8').match(/\bid: '([\w-]+)'/);
  if (!id) throw new Error(`docs: threejs/docs/characters.md: cast files: no id in ${path}`);
  return id[1];
}

// Each guide: where it comes from and goes, its rules and templates, and the SDK's folders for its pictures and
// examples.
const GUIDES = [
  { from: 'core/docs/guide.md', to: 'guide.md', rules: guide3d, templates: '3d.md', repo: 'core', images: '3d',
    examples: '3d' },
  { from: '2d/docs/guide.md', to: '2d.md', rules: guide2d, templates: '2d.md', repo: '2d', images: '2d' },
  { from: 'threejs/docs/guide.md', to: 'three.md', rules: guideThree, templates: 'three.md', repo: 'threejs',
    images: 'three', examples: 'three' },
  { from: 'threejs/docs/characters.md', to: 'characters.md', rules: guideCast, templates: 'cast.md', repo: 'threejs',
    images: 'three' },
];
const REPOS = { '3d': 'core', '2d': '2d', three: 'threejs' };

// ---------------------------------------------------------------------------------------------------------------
// Rules for every guide

/** Package names: the repos' become the SDK's. */
function packages(doc) {
  const names = /@wireface\/(?:core|2d|three)(?:\/[\w.*-]+)*|(['"])(?:\.\.?\/)+characters\/kit\.js\1/g;
  doc.each('package names', names, (m, q) => {
    if (q) return `${q}@wireface/sdk/three/kit${q}`;
    const dot = m.endsWith('.') && !sdkPackage(m) ? '.' : '';
    const name = dot ? m.slice(0, -1) : m;
    return (sdkPackage(name) ?? doc.fail('package names', `no SDK entry point for ${name}`)) + dot;
  });
}

/** Examples: the guide's examples/ is examples/<engine>/ in the SDK (before the rules, whose own text has it right). */
function examples(doc, sub) {
  doc.each('examples paths', /(?<![\w./-])examples\/(?!(?:3d|2d|three)\/)/g, () => `examples/${sub}/`);
}

/** Every example page named must be one of the repos' examples. */
function examplesExist(doc, src) {
  for (const [, engine, file] of doc.text.matchAll(/examples\/(3d|2d|three)\/([\w-]+\.html)/g)) {
    if (!existsSync(join(src, REPOS[engine], 'examples', file))) {
      doc.fail('example pages', `no ${REPOS[engine]}/examples/${file}`);
    }
  }
}

/** Pictures: moved into images/<engine>/, and noted for copying. */
function pictures(doc, sub, dir) {
  const used = new Set();
  doc.each('pictures', /(src="|\]\()images\/([\w.-]+)(?=[")])/g, (m, before, file) => {
    if (!existsSync(join(dir, file))) doc.fail('pictures', `no ${file} in ${dir}`);
    used.add(file);
    return `${before}images/${sub}/${file}`;
  });
  return used;
}

/** Tidy: values filled in, long lines rewrapped, no runs of blank lines, no rule left at the end. */
function tidy(text, vars) {
  text = text.replace(/\{\{(VERSION|THREE)\}\}/g, (m, k) => vars[k]);
  return rewrap(text).replace(/\n{3,}/g, '\n\n').replace(/(?:\n+---)+\s*$/, '').trimEnd() + '\n';
}

const ITEM = /^(\s*)((?:[-*]|\d+\.)\s+)/;
const SET = /^\s*(?:```|[|#<>]|---)/;            // fences, tables, headings, HTML, quotes and rules: left as they are

/**
 * Paragraphs and list items with a line over `width` rewrapped, as the guides are; the rest keep the guide's own
 * wrapping. A word that would start a line as markup (a list marker, a heading) stays on the line before.
 */
function rewrap(text, width = 120) {
  const lines = text.split('\n');
  const out = [];
  let fenced = false;
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (fenced || !line.trim() || SET.test(line)) {
      out.push(line);
      i++;
      continue;
    }
    const item = line.match(ITEM);
    const first = item ? item[0] : line.match(/^\s*/)[0];
    const indent = item ? item[1] + ' '.repeat(item[2].length) : first;
    let j = i + 1;
    while (j < lines.length && lines[j].trim() && !SET.test(lines[j]) && !ITEM.test(lines[j])
      && lines[j].match(/^\s*/)[0].length === indent.length) j++;
    const unit = lines.slice(i, j);
    i = j;
    if (!unit.some(l => l.length > width)) {
      out.push(...unit);
      continue;
    }
    const words = [];
    for (const word of unit.map((l, k) => (k ? l : l.slice(first.length))).join(' ').trim().split(/\s+/)) {
      const last = words.at(-1);
      const count = c => (last.match(c) || []).length;
      const open = last && (count(/\[/g) > count(/\]/g) || count(/`/g) % 2);
      if (open) words[words.length - 1] += ` ${word}`;          // a link's text, or code, stays on one line
      else words.push(word);
    }
    let current = first + words.shift();
    for (const word of words) {
      const markup = /^(?:[-*+>|#<]|\d+[.)]$)/.test(word);
      if (current.length + 1 + word.length > width && !markup) {
        out.push(current);
        current = indent + word;
      } else current += ` ${word}`;
    }
    out.push(current);
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------------------------
// Checks on the output

/** Text with code (fenced and inline) blanked out, lines kept where they were. */
const prose = text => text.replace(/^\s*```[\s\S]*?^\s*```/gm, m => m.replace(/[^\n]/g, ' '))
  .replace(/`[^`\n]*`/g, m => ' '.repeat(m.length));

const lineAt = (text, index) => text.slice(0, index).split('\n').length;

function check(docs) {
  const problems = [];
  const at = (doc, index, what) => problems.push(`${doc.to}:${lineAt(doc.text, index)}: ${what}`);
  const anchors = new Map(docs.map(d => [d.to, new Set(headings(d.text).map(h => h.slug))]));

  for (const doc of docs) {
    const lower = doc.text.toLowerCase();
    for (const word of FORBIDDEN) {
      for (let i = lower.indexOf(word.toLowerCase()); i >= 0; i = lower.indexOf(word.toLowerCase(), i + 1)) {
        at(doc, i, `"${word}" must not be in the SDK's docs`);
      }
    }
    for (const [re, bad, why] of CHECKS) {
      for (const m of doc.text.matchAll(re)) if (bad(m[0])) at(doc, m.index, `${why}: ${m[0]}`);
    }

    // Links: within the docs, to the SDK's README, or to the web
    const text = prose(doc.text);
    for (const m of text.matchAll(/\]\(([^)\s]+)\)|<(?:a|img)\s[^>]*?(?:href|src)="([^"]+)"/g)) {
      const link = m[1] || m[2];
      if (/^https?:\/\//.test(link) || link.startsWith('images/') || link === '../README.md') continue;
      const [file, hash] = link.split('#');
      const target = file || doc.to;
      if (!anchors.has(target)) at(doc, m.index, `a link to something the SDK's docs haven't got: ${link}`);
      else if (hash !== undefined && !anchors.get(target).has(hash)) at(doc, m.index, `no heading for ${link}`);
    }

    // The contents: every section in it, numbered in order
    const sections = headings(doc.text).filter(h => h.level === 2);
    const entries = doc.text.matchAll(/^[ \t]*(?:[-*]|\d+\.)[ \t]+\[[^\]\n]+\]\(#([\w-]+)\)[ \t]*$/gm);
    const contents = new Set([...entries].map(m => m[1]));
    if (contents.size) {
      for (const h of sections) if (!contents.has(h.slug)) at(doc, h.start, `not in the contents: ${h.line}`);
    }
    sections.filter(h => /^\d+\. /.test(h.title)).forEach((h, i) => {
      if (!h.title.startsWith(`${i + 1}. `)) at(doc, h.start, `numbered out of order: ${h.line}`);
    });
  }
  if (problems.length) throw new Error(`docs: the output isn't fit for the SDK:\n  ${problems.join('\n  ')}`);
}

// ---------------------------------------------------------------------------------------------------------------

/** The SDK's version, and the three.js it's built with, for install lines and import maps. */
function versions() {
  const pkg = JSON.parse(readFileSync(join(SDK, 'package.json'), 'utf8'));
  const three = (pkg.devDependencies?.three || '').replace(/^[^\d]*/, '');
  if (!pkg.version || !three) throw new Error('docs: package.json needs a version and three in devDependencies');
  return { VERSION: pkg.version, THREE: three };
}

/**
 * Build the docs from the guides in `src` (a folder holding core/, 2d/ and threejs/) into `out`. Nothing is written
 * unless every rule and check passes. Returns the files written, relative to `out`.
 */
export function buildDocs(src, out) {
  const vars = versions();
  const docs = GUIDES.map(g => {
    const doc = new Doc(g.from, readFileSync(join(src, g.from), 'utf8'));
    const t = templates(g.templates);
    if (g.examples) examples(doc, g.examples);
    g.rules(doc, t, src);
    t.done();
    packages(doc);
    examplesExist(doc, src);
    const dir = join(src, g.repo, 'docs', 'images');
    const images = [...pictures(doc, g.images, dir)].map(file => [join(dir, file), join('images', g.images, file)]);
    return { ...g, text: tidy(doc.text, vars), images };
  });
  check(docs);

  const written = [];
  mkdirSync(out, { recursive: true });
  for (const doc of docs) {
    writeFileSync(join(out, doc.to), doc.text);
    written.push(doc.to);
    for (const [from, to] of doc.images) {
      mkdirSync(dirname(join(out, to)), { recursive: true });
      copyFileSync(from, join(out, to));
      if (!written.includes(to)) written.push(to);
    }
  }
  return written.map(f => f.replace(/\\/g, '/'));
}

const script = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href;
if (script && script.toLowerCase() === import.meta.url.toLowerCase()) {
  const src = resolve(process.argv[2] || join(SDK, '..'));
  const out = join(SDK, 'docs');
  try {
    // docs/ isn't emptied first: the build does that, and puts the README's own pictures in it too
    const files = buildDocs(src, out);
    console.log(`docs: ${files.length} files in ${out}\n  ${files.join('\n  ')}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
