// Builds the Wireface SDK from the engine's source: the repos core, 2d and threejs, checked out next to this one.
// For maintainers only; everyone else uses what's already in dist/, assets/, docs/ and examples/.
//
//   node tools/build.mjs                  from ../core, ../2d and ../threejs, as committed on main and pushed
//   node tools/build.mjs --src <folder>   from checkouts in another folder
//   node tools/build.mjs --dirty          from whatever each repo has committed on its current branch (to try things)
//   node tools/build.mjs --working-tree   include tracked and untracked development changes
//   node tools/build.mjs --no-docs        leave docs/ as it is
//
// Releases read committed files from git. --working-tree explicitly opts into local development changes.
// esbuild bundles each entry into dist/ as minified ES modules that share chunks: a page using the 3D face and
// three.js loads the engine once. Everything lands flat in dist/, so the URLs the code makes relative to itself (the
// assets folder, the teeth pictures, the microphone worklet) come out the same from every chunk.
import { build, transform } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { bakeCatalogues } from './bake-characters.mjs';
import { pathToFileURL } from 'node:url';
import { buildExamples } from './examples.mjs';

const SDK = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const SRC = resolve(args.includes('--src') ? args[args.indexOf('--src') + 1] : join(SDK, '..'));
const WORKTREE = args.includes('--working-tree');
const DIRTY = args.includes('--dirty') || WORKTREE;
const NO_DOCS = args.includes('--no-docs');            // leave docs/ as it is
const REPOS = ['core', '2d', 'threejs', 'morphs'];
const NOTICE = '/*! Wireface | Required Notice: Copyright 2026 Compsmart (https://wireface.dev) | Free for personal and '
  + 'commercial use under the Wireface SDK Licence; https://wireface.dev/license/ */';

/** Each entry of the package (dist/<name>.js) and the module it re-exports, in the staged source. */
const ENTRIES = {
  wireface: "export * from '../core/src/index.js';",
  config: "export * from '../core/src/config.js';",
  rigging: "export * from '../sdk/src/rigging.js';",
  '2d': "export * from '../2d/src/index.js';\n"
    + "export { teethAsset } from '../2d/src/engine/teeth.js';",
  '2d-live': "export * from '../2d/src/live.js';",
  '2d-config': "export * from '../2d/src/config.js';",
  three: "export * from '../threejs/src/index.js';",
  'three-characters': "export * from '../threejs/characters/index.js';",
  'three-kit': "export * from '../threejs/characters/kit.js';",
};
const SERVER = {};

/**
 * Where the SDK's layout differs from the repos', the code is changed on the way in. Each change must match exactly
 * once, so a change to the source that moves one of these fails the build instead of shipping a broken path.
 */
const PATCHES = [
  // 2D's assets go in assets/2d/ (both packages have a voices/cast.json)
  ['2d/src/characters.js', "new URL('../assets/', import.meta.url)", "new URL('../assets/2d/', import.meta.url)"],
  // 2D's photographic teeth are core's, which land in dist/teeth/ like its own drawn ones
  ['2d/src/engine/teeth.js', '`../core/engine/teeth/${id}.png`', '`./teeth/${id}.png`'],
  // the voices folders, found from this module rather than through the packages (which a bundle doesn't have)
  ['threejs/src/index.js', "const pkg = engine === '2d' ? '@wireface/2d' : '@wireface/core';\n  return new URL('../assets/voices/', import.meta.resolve(pkg)).href;",
    "return new URL(engine === '2d' ? '../assets/2d/voices/' : '../assets/voices/', import.meta.url).href;"],
];

/** The README's pictures (the guides copy their own). */
const README_IMAGES = [
  ['core/docs/images/hero.webp', '3d/hero.webp'], ['core/docs/images/styles.jpg', '3d/styles.jpg'],
  ['2d/docs/images/talking.webp', '2d/talking.webp'], ['2d/docs/images/styles.jpg', '2d/styles.jpg'],
  ['threejs/docs/images/cast.jpg', 'three/cast.jpg'],
];

const die = message => { console.error(`build: ${message}`); process.exit(1); };
const git = (repo, ...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', maxBuffer: 1 << 26 }).trim();

/** Each repo's committed files, written into `dir`/<repo>/ exactly as git has them. */
function stage(dir) {
  for (const name of REPOS) {
    const repo = join(SRC, name);
    if (!existsSync(join(repo, '.git'))) die(`no repo at ${repo}`);
    const branch = git(repo, 'branch', '--show-current'), head = git(repo, 'rev-parse', 'HEAD');
    let pushed = '';
    if (!DIRTY) try { pushed = git(repo, 'rev-parse', 'origin/main'); } catch {}
    if (!DIRTY && (branch !== 'main' || head !== pushed)) {
      die(`${name} is on ${branch || 'a detached HEAD'} at ${head.slice(0, 7)}, not main as pushed (${pushed.slice(0, 7) || 'none'}). `
        + 'Use --dirty to build it anyway.');
    }
    const changed = git(repo, 'status', '--porcelain', '--untracked-files=no');
    console.log(`  ${name.padEnd(8)} ${head.slice(0, 7)} on ${branch}${WORKTREE ? '  (working-tree preview)' : changed ? '  (uncommitted changes left out)' : ''}`);
    if (WORKTREE) {
      const paths = git(repo, 'ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean);
      for (const file of paths) {
        const from = join(repo, file);
        if (!existsSync(from) || !statSync(from).isFile()) continue;
        const to = resolve(dir, name, file);
        if (!to.startsWith(resolve(dir) + sep)) die('Unsafe staging path');
        mkdirSync(dirname(to), { recursive: true });
        copyFileSync(from, to);
      }
      continue;
    }
    const files = git(repo, 'ls-tree', '-r', '-z', 'HEAD').split('\0').filter(Boolean).map(line => {
      const [meta, path] = line.split('\t');
      const [mode, type, sha] = meta.split(' ');
      return { mode, type, sha, path };
    }).filter(f => f.type === 'blob' && f.mode !== '120000');
    const out = execFileSync('git', ['-C', repo, 'cat-file', '--batch'], { input: files.map(f => f.sha).join('\n') + '\n', maxBuffer: 1 << 30 });
    let at = 0;
    for (const f of files) {
      const eol = out.indexOf(10, at);
      const size = Number(out.toString('latin1', at, eol).split(' ')[2]);
      const path = join(dir, name, f.path);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, out.subarray(eol + 1, eol + 1 + size));
      at = eol + 1 + size + 1;
    }
  }
}

function patch(dir) {
  for (const [file, from, to] of PATCHES) {
    const path = join(dir, file), text = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
    const n = text.split(from).length - 1;
    if (n !== 1) die(`${file}: expected one ${JSON.stringify(from.split('\n')[0])}, found ${n}`);
    writeFileSync(path, text.replace(from, () => to));
  }
}

/** 2D carries a copy of core's modules, byte for byte; the SDK uses core's own, so there's one engine. */
function checkCopy(dir) {
  const copy = join(dir, '2d', 'src', 'core');
  const walk = d => readdirSync(d).flatMap(n => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  for (const file of walk(copy).filter(f => /\.(js|png)$/.test(f))) {        // its README is its own
    const own = join(dir, 'core', 'src', relative(copy, file));
    if (!existsSync(own) || (file.endsWith('.js') ? readFileSync(own, 'utf8').replace(/\r\n/g, '\n') !== readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : !readFileSync(own).equals(readFileSync(file)))) die(`2d/src/core/${relative(copy, file)} differs from core's: sync 2d first`);
  }
}

/** @wireface/core and @wireface/2d come from the staged source, and 2D's copy of core is core itself. */
function engine(dir) {
  const copy = join(dir, '2d', 'src', 'core') + sep;
  const core = { '': 'index.js', '/config': 'config.js', '/expressions': 'expressions.js', '/skins': 'skins.js', '/speech': 'speech.js', '/character': 'character.js' };
  return {
    name: 'wireface-engine',
    setup(b) {
      b.onResolve({ filter: /^@wireface\/(core|2d)(\/.*)?$/ }, a => {
        const [, pkg, sub = ''] = a.path.match(/^@wireface\/(core|2d)(\/.*)?$/);
        if (pkg === '2d' && !sub) return { path: join(dir, '2d', 'src', 'index.js') };
        if (pkg === 'core' && sub.startsWith('/engine/')) return { path: join(dir, 'core', 'src', sub.slice(1)) };
        if (pkg === 'core' && core[sub]) return { path: join(dir, 'core', 'src', core[sub]) };
        return { errors: [{ text: `no ${a.path} in the SDK build: add it to tools/build.mjs` }] };
      });
      b.onResolve({ filter: /^\.\.?\// }, a => {
        const path = resolve(a.resolveDir, a.path);
        if (path.startsWith(copy)) return { path: join(dir, 'core', 'src', path.slice(copy.length)) };
        return undefined;
      });
    },
  };
}

function copyDir(from, to, filter = () => true) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    const path = join(from, name);
    if (statSync(path).isDirectory()) copyDir(path, join(to, name), filter);
    else if (filter(name)) copyFileSync(path, join(to, name));
  }
}

const kb = n => `${(n / 1024).toFixed(1).padStart(7)} KB`;

async function main() {
  console.log(`Building the Wireface SDK from ${SRC}`);
  // a fixed folder (git ignores it): the chunks' names hash their content and paths, so they stay put between builds
  const dir = join(SDK, '.build');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir);
  try {
    stage(dir);
    copyDir(join(SDK, 'src'), join(dir, 'sdk/src'));
    // Preserve experimental private integrations in their source repo, exclude construction from shipped SDK.
    const threeIndex = join(dir, 'threejs/src/index.js');
    writeFileSync(threeIndex, readFileSync(threeIndex, 'utf8').split('\n').filter(line => !/pictureCharacter|autoAttach|ModelFace, findFeatures/.test(line)).join('\n'));
    const screen = join(dir, 'threejs/src/face-screen.js');
    writeFileSync(screen, readFileSync(screen, 'utf8').replace("import { isPicture, pictureCharacter } from './picture.js';", '').replace("if (this.engine === '2d' && isPicture(character)) character = await pictureCharacter(character);", '')); 
    checkCopy(dir);
    patch(dir);
    mkdirSync(join(dir, 'entries'));
    for (const [name, code] of Object.entries({ ...ENTRIES, ...SERVER })) writeFileSync(join(dir, 'entries', `${name}.js`), `${code}\n`);

    const dist = join(SDK, 'dist');
    for (const out of ['dist', 'assets', 'examples', ...(NO_DOCS ? [] : ['docs'])]) rmSync(join(SDK, out), { recursive: true, force: true });
    const shared = { bundle: true, format: 'esm', minify: true, sourcemap: false, legalComments: 'none', charset: 'utf8',
      banner: { js: NOTICE }, metafile: true, logLevel: 'warning', absWorkingDir: SDK, plugins: [engine(dir)] };
    const browser = await build({
      ...shared, entryPoints: Object.fromEntries(Object.keys(ENTRIES).map(n => [n, join(dir, 'entries', `${n}.js`)])),
      outdir: dist, splitting: true, platform: 'browser', target: 'es2022', external: ['three', 'three/*'],
      entryNames: '[name]', chunkNames: '[name]-[hash]',
    });
    const creatorDist = join(dir, 'private');
    const creator = await build({ ...shared, entryPoints: { creator: join(dir, 'morphs/src/creator.js') },
      outdir: creatorDist, splitting: false, platform: 'browser', target: 'es2022' });

    // the microphone's AudioWorklet is loaded by URL (dist/audio/), not imported
    const worklet = await transform(readFileSync(join(dir, '2d', 'src', 'audio', 'mic-worklet.js'), 'utf8'),
      { minify: true, legalComments: 'none', banner: NOTICE, target: 'es2022' });
    mkdirSync(join(dist, 'audio'));
    writeFileSync(join(dist, 'audio', 'mic-worklet.js'), worklet.code);

    // the teeth pictures, next to the chunks that ask for ./teeth/<id>.png: core's photographic ones and 2D's drawn ones
    mkdirSync(join(dist, 'teeth'));
    for (const from of [join(dir, 'core', 'src', 'engine', 'teeth'), join(dir, '2d', 'src', 'engine', 'teeth')]) {
      for (const name of readdirSync(from).filter(n => n.endsWith('.png'))) {
        if (existsSync(join(dist, 'teeth', name))) die(`two teeth pictures called ${name}`);
        copyFileSync(join(from, name), join(dist, 'teeth', name));
      }
    }

    // the skins, characters and voices (and the brand marks for the examples' tabs)
    const assets = join(SDK, 'assets');
    for (const name of ['skins', 'voices', 'brand', 'mediapipe']) copyDir(join(dir, 'core', 'assets', name), join(assets, name));
    for (const name of ['characters', 'voices']) copyDir(join(dir, '2d', 'assets', name), join(assets, '2d', name));

    // the config schemas, with the ids they're published under
    for (const [from, to] of [['core/config/face.schema.json', 'face.schema.json'], ['2d/config/face2d.schema.json', 'face2d.schema.json']]) {
      const schema = JSON.parse(readFileSync(join(dir, from), 'utf8'));
      schema.$id = `https://wireface.dev/schema/${to}`;
      writeFileSync(join(SDK, to), `${JSON.stringify(schema, null, 2)}\n`);
    }

    await bakeCatalogues(assets, await import(pathToFileURL(join(creatorDist, 'creator.js')).href));
    const forbidden = /(?:morphs\/src|rig-build|\/detect\/|prepare-transfer|registration|creation-characters|overlay\.js|generate\.js)/;
    const leaked = Object.keys(browser.metafile.inputs).filter(p => forbidden.test(p.replace(/\\/g, '/')));
    if (leaked.length) die('Private construction code leaked into SDK: ' + leaked.join(', '));
    writeFileSync(join(SDK, 'build-manifest.json'), JSON.stringify({ workingTree: WORKTREE, revisions: Object.fromEntries(REPOS.map(name => [name, git(join(SRC, name), 'rev-parse', 'HEAD')])), runtime: browser.metafile, privateBaker: creator.metafile }, null, 2));

    const source = join(SDK, '.source');
    rmSync(source, { recursive: true, force: true });
    for (const input of Object.keys(browser.metafile.inputs)) {
      const from = resolve(SDK, input), rel = relative(dir, from);
      if (rel.startsWith('..') || !from.startsWith(dir + sep)) die('Unexpected source outside stage: ' + input);
      const to = join(source, rel); mkdirSync(dirname(to), { recursive: true }); copyFileSync(from, to);
    }
    mkdirSync(join(source, '2d/src/audio'), { recursive: true });
    copyFileSync(join(dir, '2d/src/audio/mic-worklet.js'), join(source, '2d/src/audio/mic-worklet.js'));
    copyFileSync(join(SDK, 'tools/source-build.mjs'), join(source, 'build.mjs'));
    writeFileSync(join(source, 'package.json'), JSON.stringify({ ...JSON.parse(readFileSync(join(SDK, 'package.json'), 'utf8')), private: true, scripts: { build: 'node build.mjs', start: 'node examples/hosted/backend.mjs' }, devDependencies: { esbuild: '^0.28.2' } }, null, 2));
    writeFileSync(join(source, 'SOURCE-README.md'), '# SDK and integration source\n\nRun `npm install` and `npm run build` in this folder. Install `three` to run its integration examples, then `npm start`. The package exports and TypeScript declarations match the compiled SDK. Source is marked private to prevent accidental registry publication.\n\nThe editable core, 2d, threejs and sdk folders contain the runtime, renderers, local photo mapping and hosted client. The baked canonical rig and prepared catalogue characters are data. Hosted detection, fitting, morphing and rig construction are excluded. See LICENSE.md and HOSTED-RIGGING-TERMS.md.\n');

    buildExamples(dir, join(SDK, 'examples'));
    if (!NO_DOCS) (await import('./docs.mjs')).buildDocs(dir, join(SDK, 'docs'));
    for (const [from, to] of README_IMAGES) {
      mkdirSync(dirname(join(SDK, 'docs', 'images', to)), { recursive: true });
      copyFileSync(join(dir, from), join(SDK, 'docs', 'images', to));
    }

    // what each entry costs a page: its own file plus every chunk it imports
    const outputs = { ...browser.metafile.outputs };
    const size = file => { const b = readFileSync(join(SDK, file)); return [b.length, gzipSync(b).length]; };
    console.log('\n  entry               own file           with its chunks (gzip)');
    for (const [file, out] of Object.entries(outputs)) {
      if (!out.entryPoint || !(basename(file, '.js') in ENTRIES || basename(file, '.js') in SERVER)) continue;   // not a lazy chunk
      const seen = new Set();
      const visit = f => { if (seen.has(f)) return; seen.add(f); for (const i of outputs[f]?.imports || []) if (!i.external && i.kind === 'import-statement') visit(i.path); };
      visit(file);
      const [own, ownGz] = size(file);
      const all = [...seen].map(size).reduce((a, [r, g]) => [a[0] + r, a[1] + g], [0, 0]);
      console.log(`  ${basename(file).padEnd(20)}${kb(own)} ${kb(ownGz)}  ${kb(all[0])} ${kb(all[1])}`);
    }
    console.log(`\nWrote dist/, assets/, examples/${NO_DOCS ? '' : ', docs/'} and the schemas in ${SDK}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

await main();
