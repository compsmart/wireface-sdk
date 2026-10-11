import { createFace, exportCharacter } from '../../dist/wireface.js';
import { createFace2d } from '../../dist/2d.js';
import { createCharacter } from '../../dist/create.js';

let canvas = document.querySelector('canvas');
const status = document.querySelector('#status'), save = document.querySelector('#save');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let face = null, character = null, ticket = 0;

async function make() {
  const file = document.querySelector('#photo').files[0];
  if (!file) return;
  const call = ++ticket, kind = document.querySelector('#kind').value;
  status.textContent = 'Finding the face and rigging it…'; save.disabled = true;
  try {
    const made = await createCharacter(file, { kind, detector: 'local', name: file.name.replace(/\.\w+$/, '') });
    if (call !== ticket) return;
    const nextCanvas = canvas.cloneNode();
    const next = kind === '2d' ? createFace2d(nextCanvas, { follow: !reduced }) : createFace(nextCanvas, { follow: !reduced });
    await next.useCharacter(made, { transition: 0 });
    if (call !== ticket) { next.destroy(); return; }
    face?.destroy(); canvas.replaceWith(nextCanvas); canvas = nextCanvas; face = next; character = made;
    face.express(document.querySelector('#expression').value);
    status.textContent = `${made.name} · ${kind} · made on this device`; save.disabled = false;
  } catch (error) { if (call === ticket) status.textContent = error.message; }
}

document.querySelector('#photo').addEventListener('change', make);
document.querySelector('#kind').addEventListener('change', make);
document.querySelector('#expression').addEventListener('change', e => face?.express(e.target.value));
save.addEventListener('click', async () => {
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(await exportCharacter(character)),
    download: `${character.name || 'character'}.wireface.json` });
  link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});
