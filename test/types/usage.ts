import { createFace, skinFromPhoto, loadCharacter, exportCharacter } from '@wireface/sdk';
import { createFace2d } from '@wireface/sdk/2d';
import { FaceMesh, FaceScreen } from '@wireface/sdk/three';
import { createRiggingClient, WirefaceError, type RiggingProgress } from '@wireface/sdk/rigging';
async function workflow(canvas: HTMLCanvasElement, file: File) {
 const face = createFace(canvas); await face.useSkin(await skinFromPhoto(file)); face.express('happy');
 const client = createRiggingClient({ getToken: async () => 'short-lived-token' });
 const cancel = new AbortController();
 const progress = (p: RiggingProgress) => console.log(p.stage, p.requestId);
 const two = createFace2d(canvas); const character = await client.rig2d(file, { signal: cancel.signal, onProgress: progress });
 await two.useCharacter(character); two.express('happy');
 const saved = await exportCharacter(character); await two.useCharacter(await loadCharacter(saved));
 const mesh = new FaceMesh(); await mesh.useCharacter(await client.rig3d(file));
 const screen = new FaceScreen({ engine: '2d' }); await screen.useCharacter(character);
 const backend = createRiggingClient({ apiKey: 'environment-only' });
 await backend.createToken({ scope: ['rig:2d'], origin: 'https://example.com' });
 const error = new WirefaceError('failed', 'Try again'); console.log(error.code, error.requestId);
 // @ts-expect-error permanent and browser credentials are mutually exclusive
 createRiggingClient({ apiKey: 'key', getToken: async () => 'token' });
 // @ts-expect-error arbitrary scopes are not valid
 backend.createToken({ scope: ['admin'], origin: 'https://example.com' });
}
void workflow;
