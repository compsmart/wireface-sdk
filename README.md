# Wireface: free offline SDK, optional hosted rigging

The SDK maps photos onto its fixed mesh and animates faces locally, including commercial use. Expressions, rendering and audio-driven lip-sync are free. Canvas, 2D and three.js integrations live in one `@wireface/sdk` package.

Sign in at https://wireface.dev/account/ for the compiled SDK download and a free hosted rigging key. Install the downloaded archive with `npm install ./wireface-sdk-0.2.0.tgz`. In the SDK repository, run `npm install` and `npm start`, then open `http://localhost:5173`. Working-tree builds are previews until matching artifacts are released.

## Local photo mapping

```js
import { createFace, skinFromPhoto } from '@wireface/sdk';
const face = createFace(canvas);
await face.useSkin(await skinFromPhoto(photoFile));
face.express('happy');
```

This detects landmarks on the device and maps the photo onto a baked, fixed mesh. It does not change facial geometry. No image is uploaded and no account or key is needed once installed. MediaPipe JavaScript, CPU WASM and the detection model are bundled in `assets/mediapipe`; no CDN is needed. Serve the package's `dist/` and `assets/` folders together over local HTTP. With a bundler, copy `assets/` into your public directory, pass `{ assets: '/wireface-assets/' }` to the renderer and call `skinFromPhoto(file, { bundle: '/wireface-assets/mediapipe/vision_bundle.mjs', wasm: '/wireface-assets/mediapipe/wasm', model: '/wireface-assets/mediapipe/face_landmarker.task' })`. Serve `.wasm` as `application/wasm`. The first installation requires downloading the package; thereafter mapping and playback work with external networking blocked.

## Hosted 2D and 3D creation

```js
import { createRiggingClient } from '@wireface/sdk/rigging';
import { createFace2d } from '@wireface/sdk/2d';
import { FaceMesh } from '@wireface/sdk/three';
const rigging = createRiggingClient({
  getToken: async () => {
    const response = await fetch('/api/wireface-token', { method: 'POST' });
    if (!response.ok) throw new Error('Could not authorise rigging');
    return (await response.json()).token;
  },
});
const face = createFace2d(canvas);
await face.useCharacter(await rigging.rig2d(pictureFile));
face.express('happy');
const mesh = new FaceMesh();
await mesh.useCharacter(await rigging.rig3d(portraitFile));
scene.add(mesh);
```

Install `three` separately for the optional three.js integration. Use `examples/hosted/backend.mjs`: set `WIREFACE_SDK_KEY` in its environment, then `npm start`. It runs on localhost and issues five-minute tokens for only `rig:2d` and `rig:3d`, scoped to that browser origin. Production backends must authenticate their own users before issuing tokens. Never put permanent keys in browser bundles. The client rejects permanent keys in browser contexts.

```js
// Backend only, after authorising the application's user:
const rigging = createRiggingClient({ apiKey: process.env.WIREFACE_SDK_KEY });
const { token, expiresAt } = await rigging.createToken({
  scope: ['rig:2d'], origin: 'https://your-app.example',
});
```

`rig2d` and `rig3d` accept a File, Blob or image URL. URL images are fetched by the SDK and uploaded as bytes; the service does not fetch arbitrary URLs. Use JPEG, PNG or still WebP, at most 12 MB and 40 megapixels, with one clear face. 3D needs a front-facing portrait with visible facial detail. 2D supports drawings and stylised characters. Unusable images are rejected; no manual or canonical fallback silently replaces your character.

```js
const abort = new AbortController();
const character = await rigging.rig3d(file, {
  signal: abort.signal,
  idempotencyKey: crypto.randomUUID(), // retain for a retry of the same submission
  onProgress: ({ stage, requestId }) => console.log(stage, requestId),
});
```

The client retries network failures and 429/502/503/504 responses at most twice by default, with bounded backoff. It has a three-minute overall timeout, configurable up to ten minutes. Cancelling stops polling and makes a best-effort server cancellation. `WirefaceError` exposes `code`, `status`, `requestId` and `retryable`. A submission interrupted before its job ID arrives can be retrieved by retrying with the same idempotency key and input. Reusing a key with different input returns `idempotency_conflict`. Completed results expire after 24 hours; metadata is retained for 90 days.

Common codes include `invalid_image`, `face_count`, `low_confidence`, `poor_anchors`, `anchor_disagreement`, `dense_face_missing`, `key_revoked`, `token_expired`, `scope_denied`, `busy`, `result_expired`, `provider_unavailable` and `processing_timeout`. Request a new browser token when it expires. Rotating/revoking a permanent key invalidates its outstanding browser tokens. Credentials do not affect saved-character playback.

## Export and offline playback

```js
import { loadCharacter, exportCharacter } from '@wireface/sdk';
const saved = await exportCharacter(character); // Blob; save as character.wireface.json
const restored = await loadCharacter(saved);    // also accepts URL or ArrayBuffer
await face.useCharacter(restored);
```

The versioned JSON contains an embedded raster texture, baked mesh and expression channels, jaw, eyes, mouth, render metadata and prepared 2D transfer data. It contains no credentials, expiring asset URLs or executable code. Loading validates and copies it before renderer replacement. File-based loading never invokes fitting or contacts Wireface. Fetching a character URL uses the network only to obtain that file. Legacy `.wface` version-1 documents remain loadable.

Feed any TTS provider's audio into `face.listenTo(audioContext, source)` or the existing clip/stream interfaces. Lip-sync analysis and animation run locally. Cloud TTS has its own connectivity, account and charges. The optional Gemini Live conversation examples use a separate `GEMINI_API_KEY` in the backend environment; `GEMINI_LIVE_MODEL` can select a supported live model. `examples/playback/` demonstrates exported-character playback and local audio; `examples/3d/photo.html` demonstrates offline mapping; `examples/hosted/` demonstrates remote 2D and three.js, cancellation, expressions, export, reload and audio. `node examples/hosted/build-character.mjs photo.jpg character.wireface.json 3d` builds a saved character from Node.

## Commercial hosted characters and source

Noncommercial hosted creation/use is free after sign-in. Commercial use of hosted-rigged characters costs £25/year for developers and organisations with fewer than 10 employees, covering one named product. Larger organisations and multiple commercial products require Enterprise terms. Renewal is manual. An active licence permits existing account characters in the licensed product without re-rigging. End users need no account. Ongoing commercial use needs an active licence, but saved characters never stop working or contact a licence server.

The commercial licence includes full SDK and integration source, with updates during the term. Hosted detection orchestration, morphing, fitting and rig construction stay private and are excluded. Local fixed-frame mapping and SDK animation remain free for commercial use regardless of this entitlement. Historical licences and third-party notices are preserved. Desktop and Chat have separate free offerings and licences.

## API contracts

The package includes `openapi.json` (OpenAPI 3.1), request/response schemas under `schemas/`, and TypeScript declarations for every entry. The optional rigging entry has no effect on playback dependencies. HTTP endpoints are `POST /api/rigging/v1/2d`, `POST /api/rigging/v1/3d`, `GET /api/rigging/v1/jobs/{id}`, `DELETE /api/rigging/v1/jobs/{id}`, and `POST /api/rigging/v1/tokens`.

Private creation uses structured Gemini observations, independent anatomical checks, dense server-side MediaPipe for 3D portraits, and Wireface's existing fitter. Gemini does not generate rigging code. See [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output) and [MediaPipe Python](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/python).
