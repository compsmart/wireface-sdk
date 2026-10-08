// @wireface/sdk/three/characters: the cast, eleven ready-made characters, each with a face on its head.
//
//   import { buildCharacter } from '@wireface/sdk/three/characters';
//   const walter = buildCharacter('walter');
//   scene.add(walter.root);
//   renderer.setAnimationLoop(() => { walter.update(dt, t); renderer.render(scene, camera); });
//   await walter.speak({ audioContext });

import type { Character, CharacterDef, CharacterLine } from './three-kit.js';
import type { FaceMeshOptions, FaceScreenOptions } from './three.js';

export { Character } from './three-kit.js';
export * as kit from './three-kit.js';
export type { CharacterDef, CharacterLine } from './three-kit.js';

/** A member of the cast. */
export type CastId = 'mei' | 'walter' | 'dracula' | 'grub' | 'unit7' | 'zib' | 'wisp' | 'patch' | 'amara' | 'eleanor' | 'kit';
/** Options for a cast member's face: a FaceMesh's or a FaceScreen's, as the character has. */
export type CastOptions = FaceMeshOptions | FaceScreenOptions;
/** A cast member's definition. */
export interface CastMember extends CharacterDef {
  readonly id: CastId;
  readonly kind: string;
  /** Which kind of face it wears. */
  readonly face: 'FaceMesh' | 'FaceScreen 3d' | 'FaceScreen 2d';
  readonly look: string;
  readonly blurb: string;
  /** The heart of how it's built, as code to show. */
  readonly code: string;
  readonly height: number;
  readonly line: CharacterLine & { engine: '3d' | '2d'; cues: readonly (readonly [number, string])[] };
  /** Build it: `options` go to its face. */
  build(options?: CastOptions): Character;
}

/** Every character. */
export declare const CAST: readonly CastMember[];
/** Build a character by id: add its `root` to your scene, and call update(dt, t) each frame. */
export declare function buildCharacter(id: CastId, options?: CastOptions): Character;
