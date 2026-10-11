import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function dimensions(b) {
  if (b[0] === 137 && b.toString('ascii', 1, 4) === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] !== 255 || b[1] !== 216) throw new Error('Expected PNG/JPEG catalogue image');
  let p = 2;
  while (p < b.length) {
    if (b[p++] !== 255) throw new Error('Invalid JPEG');
    while (b[p] === 255) p++;
    const tag = b[p++], size = b.readUInt16BE(p);
    if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(tag)) return [b.readUInt16BE(p + 5), b.readUInt16BE(p + 3)];
    p += size;
  }
  throw new Error('No JPEG dimensions');
}

export async function bakeCatalogues(assets, creator) {
  for (const [folder, list, kind] of [['skins', 'skins.json', '3d'], ['2d/characters', 'characters.json', '2d']]) {
    const dir = join(assets, folder);
    for (const entry of JSON.parse(readFileSync(join(dir, list), 'utf8'))) {
      const bytes = readFileSync(join(dir, `${entry.id}.jpg`));
      const [width, height] = dimensions(bytes);
      const data = JSON.parse(readFileSync(join(dir, `${entry.id}.json`), 'utf8'));
      const character = creator.bakeCharacter({ landmarks: data.landmarks || data, width, height,
        name: entry.name, kind, artStyle: entry.style || 'other', teeth: entry.teeth || 'normal', teethMode: entry.teethMode,
        texture: `data:image/jpeg;base64,${bytes.toString('base64')}` });
      writeFileSync(join(dir, `${entry.id}.wireface.json`), Buffer.from(await (await creator.exportCharacter(character)).arrayBuffer()));
      console.log(`  baked ${kind} ${entry.id}`);
    }
  }
}
