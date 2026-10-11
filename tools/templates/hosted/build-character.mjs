import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { createRiggingClient } from '../../dist/rigging.js';
import { exportCharacter } from '../../dist/wireface.js';
const [input, output = 'character.wireface.json', kind = '3d'] = process.argv.slice(2);
if (!input || !['2d', '3d'].includes(kind)) throw new Error('Usage: node examples/hosted/build-character.mjs photo.jpg character.wireface.json [2d|3d]');
const type = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[extname(input).toLowerCase()];
const client = createRiggingClient({ apiKey: process.env.WIREFACE_SDK_KEY });
const character = await client[kind === '2d' ? 'rig2d' : 'rig3d'](new Blob([await readFile(input)], { type }), {
  onProgress: p => console.log(p.stage),
});
await writeFile(output, Buffer.from(await (await exportCharacter(character)).arrayBuffer()));
console.log('Saved', output);
