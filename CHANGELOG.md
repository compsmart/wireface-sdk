# Changelog

## 0.3.0 (2026-10-11)

- Local character creation in `@wireface/sdk/create`: photo detection, mesh fitting, rig construction and 2D transfer preparation work offline with bundled MediaPipe assets.
- Silent image animation through `@wireface/sdk/images` and the one-tag image loader, with scrolling, visibility and cross-origin examples.
- Matching canvas, 2D and three.js playback, portable character files, TypeScript declarations and runnable examples.
- Optional hosted detection remains available for pictures the local detector cannot read. Provider credentials stay on the server.

## 0.2.0 (2026-10-11)

- Free local fixed-mesh photo mapping and animation, portable baked characters and an optional hosted rigging client.
- Authenticated compiled downloads, account-bound commercial entitlements and separate SDK source downloads.

## 0.1.0 (2026-10-08)

The first release of the Wireface SDK: the 3D face, Wireface 2D and Wireface for three.js in one package.

- `@wireface/sdk`: a talking, lip-synced 3D face on a canvas: wireframe, sculpted or photo skins, expressions, teeth,
  lip sync from recorded clips, live audio or streamed speech, and skins from your own photos.
- `@wireface/sdk/2d`: any picture of a face brought to life, in any art style, with `/2d/live` for Gemini Live
  conversations and `/2d/server` for the server side.
- `@wireface/sdk/three`: faces on the heads of three.js characters (`FaceMesh`, `FaceScreen`), with a cast of
  ready-made characters in `/three/characters` and their building blocks in `/three/kit`.
- TypeScript types, JSON Schemas for config files, examples, and guides.
