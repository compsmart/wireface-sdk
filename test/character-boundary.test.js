import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCharacter } from '../dist/wireface.js';

test('runtime graph contains playback and local mapping only; construction stays private', () => {
  const graph = JSON.parse(readFileSync(new URL('../build-manifest.json', import.meta.url)));
  const construction = /morphs\/src|rig-build|\/detect\/|prepare-transfer|registration|creation-characters|overlay\.js/;
  assert.deepEqual(Object.keys(graph.runtime.inputs).filter(p => construction.test(p.replaceAll('\\', '/'))), []);
  assert.ok(Object.keys(graph.privateBaker.inputs).some(p => p.includes('rig-build')));
  for (const output of Object.values(graph.runtime.outputs)) for (const dependency of output.imports) {
    assert.ok(!dependency.path.includes('creator'), dependency.path);
  }
});

test('every shipped catalogue entry is a complete loadable baked character with notices', async () => {
  for (const [folder, list, kind] of [['skins', 'skins.json', '3d'], ['2d/characters', 'characters.json', '2d']]) {
    const root = new URL(`../assets/${folder}/`, import.meta.url);
    for (const item of JSON.parse(readFileSync(new URL(list, root)))) {
      const c = await loadCharacter(new Blob([readFileSync(new URL(`${item.id}.wireface.json`, root))]));
      assert.equal(c.kind, kind); assert.equal(c.name, item.name);
      assert.equal(c.rig.count, 468); assert.equal(c.rig.deltas.length, c.rig.channels.length);
      assert.ok(c.texture.startsWith('data:image/'));
      assert.ok(c.notices.some(n => n.includes('Apache License') && n.includes('Version 2.0')));
      if (kind === '2d') assert.equal(c.transfer.J.length, 1872);
    }
  }
});
