// The package as it ships: every entry and type file the exports map names is there, every bundle starts with the
// Required Notice and has no source map, every file the code asks for relative to itself exists, the assets the
// catalogues list are all present, and the examples and docs point only at the SDK.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const NOTICE = '/*! Wireface | Required Notice: Copyright 2026 Compsmart (https://wireface.dev)';
const walk = dir => readdirSync(dir).flatMap(n => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
const json = path => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));

test('every target in the exports map exists', () => {
  for (const [key, target] of Object.entries(pkg.exports)) {
    const files = typeof target === 'string' ? [target] : Object.values(target);
    for (const file of files) {
      const path = join(ROOT, file.replace('/*', ''));
      assert.ok(existsSync(path), `${key}: ${file} is missing`);
    }
  }
});

test('every bundle starts with the Required Notice, and none has a source map', () => {
  const js = walk(join(ROOT, 'dist')).filter(f => f.endsWith('.js'));
  assert.ok(js.length > 9);
  for (const file of js) {
    const text = readFileSync(file, 'utf8');
    assert.ok(text.startsWith(NOTICE), `${relative(ROOT, file)} has no Required Notice`);
    assert.ok(!text.includes('sourceMappingURL'), `${relative(ROOT, file)} points at a source map`);
  }
  assert.deepEqual(walk(join(ROOT, 'dist')).filter(f => f.endsWith('.map')), []);
});

test('everything the bundles ask for relative to themselves is shipped', () => {
  for (const file of walk(join(ROOT, 'dist')).filter(f => f.endsWith('.js'))) {
    const text = readFileSync(file, 'utf8');
    for (const [, url] of text.matchAll(/new URL\("([^"]+)",import\.meta\.url\)/g)) {
      assert.ok(existsSync(join(dirname(file), url)), `${relative(ROOT, file)} asks for ${url}`);
    }
    for (const [, a, b] of text.matchAll(/new URL\([^,]*\?"([^"]+)":"([^"]+)",import\.meta\.url\)/g)) {
      for (const url of [a, b]) assert.ok(existsSync(join(dirname(file), url)), `${relative(ROOT, file)} asks for ${url}`);
    }
    for (const [, dir] of text.matchAll(/new URL\(`\.\/([a-z]+)\/\$\{\w+\}\.png`,import\.meta\.url\)/g)) {
      assert.ok(existsSync(join(dirname(file), dir)), `${relative(ROOT, file)} asks for ./${dir}/`);
    }
  }
  assert.ok(existsSync(join(ROOT, 'dist', 'audio', 'mic-worklet.js')));
  assert.ok(!readFileSync(join(ROOT, 'dist', 'three.js'), 'utf8').includes('import.meta.resolve'));
});

test('every teeth style has its picture', async () => {
  const { TEETH_STYLES } = await import('../dist/config.js');
  const { TEETH_STYLES: STYLES_2D } = await import('../dist/2d.js');
  const ids = [...TEETH_STYLES, ...STYLES_2D.map(([id]) => id)];
  for (const id of ids) assert.ok(existsSync(join(ROOT, 'dist', 'teeth', `${id}.png`)), `no teeth picture for ${id}`);
});

test('the catalogues and their files are all there', () => {
  for (const s of json('assets/skins/skins.json')) {
    for (const f of [`${s.id}.jpg`, `${s.id}-thumb.jpg`, `${s.id}.json`]) assert.ok(existsSync(join(ROOT, 'assets/skins', f)), f);
  }
  for (const c of json('assets/2d/characters/characters.json')) {
    for (const f of [`${c.id}.jpg`, `${c.id}-thumb.jpg`, `${c.id}.json`]) assert.ok(existsSync(join(ROOT, 'assets/2d/characters', f)), f);
  }
  for (const dir of ['assets/voices', 'assets/2d/voices']) {
    for (const f of readdirSync(join(ROOT, dir)).filter(n => n.endsWith('.json') && n !== 'cast.json')) {
      const clip = json(`${dir}/${f}`);
      const audio = clip.audio || f.replace('.json', '.m4a');
      assert.ok(existsSync(join(ROOT, dir, audio)), `${dir}/${f}: no ${audio}`);
    }
  }
});

test('the schemas are published under wireface.dev', () => {
  assert.equal(json('face.schema.json').$id, 'https://wireface.dev/schema/face.schema.json');
  assert.equal(json('face2d.schema.json').$id, 'https://wireface.dev/schema/face2d.schema.json');
});

test('the examples and docs point only at the SDK', async () => {
  const { FORBIDDEN: EXAMPLES } = await import('../tools/examples.mjs');
  const bad = [];
  for (const file of walk(join(ROOT, 'examples')).filter(f => /\.(html|js|css|json)$/.test(f))) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      for (const f of EXAMPLES) if (line.includes(f)) bad.push(`${relative(ROOT, file)}:${i + 1}: ${f}`);
    });
  }
  if (existsSync(join(ROOT, 'tools', 'docs.mjs')) && existsSync(join(ROOT, 'docs'))) {
    const { FORBIDDEN: DOCS } = await import('../tools/docs.mjs');
    for (const file of walk(join(ROOT, 'docs')).filter(f => f.endsWith('.md'))) {
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        for (const f of DOCS) if (line.toLowerCase().includes(f.toLowerCase())) bad.push(`${relative(ROOT, file)}:${i + 1}: ${f}`);
      });
    }
  }
  assert.deepEqual(bad, []);
});

test("the examples' own imports and import maps resolve", () => {
  const bad = [];
  for (const file of walk(join(ROOT, 'examples')).filter(f => /\.(html|js)$/.test(f))) {
    const text = readFileSync(file, 'utf8');
    const urls = [...text.matchAll(/(?:from\s*|import\s*\(\s*|"[@\w/.-]+":\s*)["'](\.{1,2}\/[^"']+)["']/g)].map(m => m[1]);
    for (const url of urls) {
      if (url.includes('node_modules/')) continue;                   // three, from npm install
      if (!existsSync(join(dirname(file), url.replace(/\/$/, '')))) bad.push(`${relative(ROOT, file)}: ${url}`);
    }
  }
  assert.deepEqual(bad, []);
});
