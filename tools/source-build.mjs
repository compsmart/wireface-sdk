// Included in paid SDK source. All inputs are playback/integration/local mapping code.
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const entries = ['wireface', 'config', '2d', '2d-live', '2d-config', 'three', 'three-characters', 'three-kit', 'rigging'];
const core = { '': 'index.js', '/config': 'config.js', '/expressions': 'expressions.js', '/skins': 'skins.js', '/speech': 'speech.js', '/character': 'character.js' };
await build({ entryPoints: Object.fromEntries(entries.map(n => [n, resolve(root, 'entries', n + '.js')])),
  outdir: resolve(root, 'dist'), bundle: true, splitting: true, platform: 'browser', format: 'esm', target: 'es2022',
  external: ['three', 'three/*'], plugins: [{ name: 'wireface', setup(b) {
    b.onResolve({ filter: /^@wireface\/(core|2d)(\/.*)?$/ }, a => {
      const [, pkg, sub = ''] = a.path.match(/^@wireface\/(core|2d)(\/.*)?$/);
      return { path: resolve(root, pkg, 'src', pkg === 'core' ? core[sub] || sub.slice(1) : 'index.js') };
    });
    b.onResolve({ filter: /^\.\.?\// }, a => {
      const path = resolve(a.resolveDir, a.path), copy = resolve(root, '2d/src/core');
      if (path.startsWith(copy)) return { path: resolve(root, 'core/src', path.slice(copy.length + 1)) };
    });
  } }] });

mkdirSync(resolve(root, "dist/audio"), { recursive: true });
copyFileSync(resolve(root, "2d/src/audio/mic-worklet.js"), resolve(root, "dist/audio/mic-worklet.js"));
