Passages written for docs/three.md, which tools/docs.mjs builds from the three.js user guide. Each block starts
with a line holding only its name in an HTML comment, and every block must be used. {{VERSION}} is the SDK's version
and {{THREE}} the three.js it's built with.

<!-- install -->
```sh
npm install three github:compsmart/wireface-sdk#v{{VERSION}}
```

`npm start` in the SDK's folder serves the examples at http://127.0.0.1:5173/examples/ (the three.js ones are in
`examples/three/`).

<!-- import-map -->
Pages that import these modules need an import map for `three` and `three/addons/`, or a bundler (section 9). With no
build step, map them from a CDN, along with the SDK's bundles so the code in this guide works as it is:

```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@{{THREE}}/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@{{THREE}}/examples/jsm/",
  "@wireface/sdk/three": "https://cdn.jsdelivr.net/gh/compsmart/wireface-sdk@v{{VERSION}}/dist/three.js",
  "@wireface/sdk/three/characters": "https://cdn.jsdelivr.net/gh/compsmart/wireface-sdk@v{{VERSION}}/dist/three-characters.js",
  "@wireface/sdk/three/kit": "https://cdn.jsdelivr.net/gh/compsmart/wireface-sdk@v{{VERSION}}/dist/three-kit.js",
  "@wireface/sdk/2d/live": "https://cdn.jsdelivr.net/gh/compsmart/wireface-sdk@v{{VERSION}}/dist/2d-live.js"
} }
</script>
```

`@wireface/sdk/three/characters` is the cast and `@wireface/sdk/three/kit` what it's made of (section 8);
`@wireface/sdk/2d/live` is for conversations (section 5).

<!-- own-clips -->
- **Your own clips.** The tool that makes clips from your own audio comes with a
  [commercial licence](https://wireface.dev/license/). Any audio works with live audio or streamed speech, below.

<!-- live-api -->
`npm start` in the SDK's folder serves the 2D API (`/api/live/token` and the rest) when `GEMINI_API_KEY` is set (in the
environment or `.env`). See `examples/three/live-chat.html`, and [Servers and secrets](2d.md#10-servers-and-secrets)
for serving it yourself.

<!-- kit -->
Each member of the cast shows one idea (see [the cast](characters.md)). What they're made of is the kit,
`@wireface/sdk/three/kit` (also `kit` in `@wireface/sdk/three/characters`):

<!-- bundlers -->
The SDK's bundles import `three` by name, and bundlers resolve it from `node_modules` with no settings. Two things need
care, as they do for the [3D face](guide.md#bundlers):

<!-- voices -->
`voices()` looks for the recorded lines in the SDK's `assets/`, next to its bundles, where a bundler doesn't keep
them: bundled code should call `setVoiceFolders()` instead.

<!-- under-the-hood -->
A FaceMesh runs the 3D face's rig, animator and lip-sync timeline without a canvas: its `FaceDriver`, in `face.view`.
Each frame it poses the rig straight into the face's geometry, turns the eyes, moves the mouth and the back of the head
with the jaw, eases between looks, and moves the head it drives. The skin styles are three.js's own lit materials, so
your lights and shadows fall on the face; the hologram is drawn additively. The back of the head is built from the
face's own outline, so no gap opens when the jaw drops.

A FaceScreen runs the 3D or 2D face on a canvas off the page, and draws and uploads a frame whenever the mesh it's
bound to is drawn.

`FaceDriver` has the shape the speech code expects of a face's `view` (`timeline`, `event()`), which is why
`playClip`, `LiveLipSync`, `StreamVoice` and 2D's `Conversation` drive a FaceMesh unchanged. It's the same animator, so
a face here moves exactly as it does in Wireface Desktop and on wireface.dev.
