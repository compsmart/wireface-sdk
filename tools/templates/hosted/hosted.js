import { createRiggingClient } from '../../dist/rigging.js';
import { createFace2d, exportCharacter, loadCharacter } from '../../dist/2d.js';
import { FaceMesh } from '../../dist/three.js';
import * as THREE from 'three';
const $ = id => document.getElementById(id);
const client = createRiggingClient({ getToken: async () => {
  const response = await fetch('/api/wireface-token', { method: 'POST' });
  if (!response.ok) throw new Error('Could not authorise rigging. Set WIREFACE_SDK_KEY in the backend environment.');
  return (await response.json()).token;
} });
let face, renderer, scene, camera, character, controller, context;
async function display(next) {
  // Decode/validate the replacement before changing the displayed character.
  const canvas = document.createElement('canvas'); canvas.id = 'face';
  let nextFace, nextRenderer, nextScene, nextCamera;
  try {
    if (next.kind === '2d') {
      nextFace = createFace2d(canvas); await nextFace.useCharacter(next, { transition: 0 });
    } else {
      nextFace = new FaceMesh(); await nextFace.useCharacter(next, { transition: 0 });
      nextRenderer = new THREE.WebGLRenderer({ canvas, alpha: true });
      nextScene = new THREE.Scene(); nextScene.add(nextFace, new THREE.AmbientLight(0xffffff, 2));
      nextCamera = new THREE.PerspectiveCamera(35, 1, .01, 20); nextCamera.position.set(0, 0, 1.3);
      nextCamera.lookAt(0, 0, 0);
    }
  } catch (e) { nextFace?.destroy?.(); nextFace?.dispose?.(); nextRenderer?.dispose(); throw e; }
  face?.destroy?.(); face?.dispose?.(); renderer?.dispose(); $('face').replaceWith(canvas);
  [face, renderer, scene, camera, character] = [nextFace, nextRenderer, nextScene, nextCamera, next];
  $('export').disabled = false;
}
function animate() {
  if (renderer) {
    const canvas = renderer.domElement, w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}
animate();
$('photo').onchange = async e => {
  const file = e.target.files[0]; if (!file) return;
  controller?.abort(); const own = controller = new AbortController(); $('cancel').disabled = false;
  try {
    const next = await client[$('kind').value === '2d' ? 'rig2d' : 'rig3d'](file, {
      signal: own.signal, onProgress: p => { if (controller === own) $('status').textContent = p.stage; },
    });
    if (controller !== own) return;
    await display(next); $('status').textContent = 'Ready. Animation and audio lip-sync now work offline.';
  } catch (error) { if (controller === own) $('status').textContent = error.message; }
  finally { if (controller === own) $('cancel').disabled = true; }
};
$('cancel').onclick = () => controller?.abort();
$('happy').onclick = () => face?.express('happy');
$('export').onclick = async () => {
  const url = URL.createObjectURL(await exportCharacter(character));
  Object.assign(document.createElement('a'), { href: url, download: 'character.wireface.json' }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('reload').onchange = async e => {
  try { await display(await loadCharacter(e.target.files[0])); $('status').textContent = 'Reloaded locally.'; }
  catch (error) { $('status').textContent = error.message; }
};
$('audio').onchange = async e => {
  if (!face || !e.target.files[0]) return;
  context ||= new AudioContext(); await context.resume();
  const buffer = await context.decodeAudioData(await e.target.files[0].arrayBuffer());
  const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination);
  const stop = face.listenTo(context, source); source.onended = stop; source.start();
};
