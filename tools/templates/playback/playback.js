import { createFace, loadCharacter } from '../../dist/wireface.js';
import { createFace2d } from '../../dist/2d.js';

let canvas = document.querySelector('canvas');
const status = document.querySelector('#status');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let face = createFace(canvas, { follow: !reduced, config: { motion: reduced ? 0 : 0.5 } });
let kind = '3d', ticket = 0, context, stopAudio;
async function wear(input) {
  const call = ++ticket;
  try {
    const character = await loadCharacter(input);
    if (call !== ticket) return;
    if (kind !== character.kind) {
      const nextCanvas = canvas.cloneNode();
      const next = character.kind === '2d' ? createFace2d(nextCanvas, { follow: !reduced }) : createFace(nextCanvas, { follow: !reduced });
      try { await next.useCharacter(character, { transition: 0 }); }
      catch (error) { next.destroy(); throw error; }
      if (call !== ticket) { next.destroy(); return; }
      stopAudio?.(); face.destroy(); canvas.replaceWith(nextCanvas); canvas = nextCanvas; face = next; kind = character.kind;
    } else await face.useCharacter(character, { transition: reduced ? 0 : 0.35 });
    if (call === ticket) status.textContent = `${character.name} · ${kind} · local playback`;
  } catch (error) { if (call === ticket) status.textContent = error.message; }
}
document.querySelector('#character').addEventListener('change', e => { if (e.target.files[0]) wear(e.target.files[0]); });
document.querySelector('#expression').addEventListener('change', e => face.express(e.target.value));
document.querySelector('#audio').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    stopAudio?.(); context ||= new AudioContext(); await context.resume();
    const source = context.createBufferSource(); source.buffer = await context.decodeAudioData(await file.arrayBuffer());
    source.connect(context.destination); const detach = face.listenTo(context, source);
    stopAudio = () => { detach(); try { source.stop(); } catch {} source.disconnect(); };
    source.onended = detach; source.start();
  } catch (error) { status.textContent = error.message; }
});
document.querySelector('#pause').addEventListener('click', e => {
  const paused = e.target.getAttribute('aria-pressed') !== 'true';
  e.target.setAttribute('aria-pressed', String(paused));
  e.target.textContent = paused ? 'Resume animation' : 'Pause animation';
  paused ? face.view.stop() : face.view.start();
});
wear('../../assets/skins/sarah.wireface.json');
