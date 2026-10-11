// Public documentation is authored against the single-package API, independently of private-source guides.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const SDK = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const FORBIDDEN = ['@wireface/core', '@wireface/2d', '@wireface/three', 'PolyForm Noncommercial',
  'github.com/compsmart/wireface-core', 'github.com/compsmart/wireface-morphs'];
export function buildDocs(src, out) {
  mkdirSync(out, { recursive: true });
  const engine = readFileSync(join(SDK, 'tools/templates/engine.md'), 'utf8');
  for (const forbidden of FORBIDDEN) if (engine.includes(forbidden)) throw new Error(`Obsolete documentation: ${forbidden}`);
  const docs = {
    'engine.md': engine,
    'guide.md': engine,
    '2d.md': '# Wireface 2D playback\n\nUse `@wireface/sdk/2d` to play prepared 2D characters.\n\n' + engine,
    'three.md': '# Wireface for three.js\n\nUse `FaceMesh` for geometry or `FaceScreen` for a live texture. The monster has sharp teeth and Dracula has fangs; the robot has normal teeth.\n\n' + engine,
    'characters.md': '# Built-in characters\n\nThe runtime includes baked 3D portraits and stylised 2D characters. The three.js cast is available from `@wireface/sdk/three/characters`.\n\nSee [the engine guide](engine.md) for loading and deployment.\n',
  };
  for (const [name, text] of Object.entries(docs)) writeFileSync(join(out, name), text);
  return Object.keys(docs);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildDocs(resolve(SDK, '..'), join(SDK, 'docs'));
