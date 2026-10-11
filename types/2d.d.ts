// @wireface/sdk/2d: make any picture of a face talk, on a <canvas> (Wireface 2D).
//
//   import { createFace2d } from '@wireface/sdk/2d';
//   const face = createFace2d(canvas);
//   await face.useCharacter('sora');      // a ready-made character, or any picture (its face is found first)
//   face.express('happy');
//   await face.say(await face.clip('sora'), { audioContext });
//
// The expressions and speech are core's own (the same objects as @wireface/sdk's), so they are re-exported from it.

import type { LoadedCharacter } from './character.js';
export { loadCharacter } from './character.js';
export type { LoadedCharacter } from './character.js';
import type {
  AudioSource, Clip, ExpressionName, FaceEvent, FaceState, Landmarks, LandmarksInput, ListenOptions, LoadedClip,
  MediaPipePaths, MouthTimeline, Point, SayOptions, ViewEvent,
} from './index.js';
import type { Face2DConfig, Face2DConfigPatch, TeethMode, TeethStyle2D } from './2d-config.js';

export { CHOICES, ConfigError, DEFAULTS, FRAMINGS, RANGES, configDiff, validateConfig } from './2d-config.js';
export { DEFAULTS as DEFAULT_CONFIG } from './2d-config.js';
export type {
  Face2DConfig, Face2DConfigPatch, Framing, NumberSetting2D, Shading, Smoothing, TeethMode, TeethStyle2D,
} from './2d-config.js';
export { ALIASES, CHANNELS, EXPRESSIONS, MOODS, defineExpression, resolveExpression } from './index.js';
export { LiveLipSync, StreamVoice, loadClip, playClip } from './index.js';
export type {
  Alias, AudioSource, Channel, Clip, ExpressionName, ExpressionWeights, FaceEvent, FaceState, Landmarks,
  LandmarksInput, ListenOptions, LoadedClip, MediaPipePaths, Mood, MouthTimeline, Point, SayOptions, SpeakingFace,
  StreamVoiceOptions, ViewEvent,
} from './index.js';

// --- art styles ----------------------------------------------------------------------------------------------------

/** What kind of picture a character is. */
export type ArtStyle =
  | 'photo' | 'render3d' | 'anime' | 'cartoon' | 'comic' | 'painting' | 'watercolor' | 'sketch' | 'pixel' | 'clay'
  | 'vector' | 'creature' | 'robot' | 'other';
/** How a face treats an art style, for settings left on "auto". */
export interface ArtStyleInfo {
  readonly label: string;
  /** 0..1: how much it skips 3D lighting and draws teeth flat. */
  readonly flat: number;
  /** How far the head turns in 3D. */
  readonly depth: number;
  /** Sample the picture without smoothing. */
  readonly pixel?: boolean;
  /** [teeth_mode, teeth_style] that suit it. */
  readonly teeth: readonly [TeethMode, TeethStyle2D];
}

/** Every art style's settings. */
export declare const ART_STYLES: Readonly<Record<ArtStyle, ArtStyleInfo>>;
/** The art styles, in order. */
export declare const ART_STYLE_IDS: readonly ArtStyle[];
/** A style's settings (an unknown one is "other"). */
export declare function artStyle(id: string | null | undefined): ArtStyleInfo;

// --- teeth ---------------------------------------------------------------------------------------------------------

/** One row of a teeth picture: its rectangle and bite line (0..1 of the picture) and its height. */
export interface TeethRow {
  readonly rect: readonly [number, number, number, number];
  readonly bite: number;
  readonly height: number;
}
/** A teeth picture: its URL and its two rows. */
export interface TeethAsset {
  id: TeethStyle2D;
  url: string;
  upper: TeethRow;
  lower: TeethRow;
  /** One of the drawn sets (not core's photographic ones). */
  drawn: boolean;
}

/** The teeth modes (the teeth_mode setting also takes 'auto'). */
export declare const TEETH_MODES: readonly TeethMode[];
/** [id, label] of every teeth picture: core's photographic ones, then the drawn ones. */
export declare const TEETH_STYLES: readonly (readonly [TeethStyle2D, string])[];
/** A teeth style's picture (an unknown style is 'normal'). */
export declare function teethAsset(style: string): TeethAsset;

/** Optional catalogue metadata for conversations and UI. */
export interface CharacterInfo {
  id?: string | null; name?: string; style?: string; styleLabel?: string; voice?: string;
  persona?: string; greeting?: string; description?: string; line?: string;
  cues?: readonly (readonly [number, string])[]; teeth?: TeethStyle2D; teethMode?: TeethMode;
  width?: number; height?: number;
}
export interface CatalogueCharacter extends CharacterInfo {
  id: string; name: string; style: ArtStyle; styleLabel: string; voice: string;
  persona: string; greeting: string; image: string; thumb: string; data: string; character: string;
}
export interface DecodedPicture extends LoadedCharacter {
  image: ImageBitmap; uvs: Float32Array; aspect: number; style: string;
}
export type CharacterInput = string | LoadedCharacter;
export declare const ASSETS: string;
export declare function catalogue(assets?: string): Promise<CatalogueCharacter[]>;

// --- the face ------------------------------------------------------------------------------------------------------

export interface Face2DOptions {
  /** Settings, checked (a ConfigError names a bad one). */
  config?: Face2DConfigPatch;
  /** Base URL of the characters/ and voices/ folders (default: ASSETS). */
  assets?: string;
  /** The head turns a little towards the pointer (default true). */
  follow?: boolean;
}
export interface UseCharacterOptions {
  /** Seconds for the old character to burn away and the new one in (default 0.5; 0 switches at once). */
  transition?: number;
}
export declare class FaceView2D {
  constructor(canvas: HTMLCanvasElement);
  readonly canvas: HTMLCanvasElement;
  /** The mouth timeline, to feed mouth packets from a stream. */
  timeline: MouthTimeline;
  readonly speaking: boolean;
  /** The character being worn (with its size and aspect), or null. */
  readonly character: (DecodedPicture & { width: number; height: number; aspect: number }) | null;
  start(): void;
  stop(): void;
  /** The pointer at CSS px (x, y) over the canvas (null when it leaves): the head turns a little towards it. */
  setPointer(x: number | null, y?: number | null): void;
  /** Where the face's centre is, in CSS px. */
  faceCenter(): Point;
  /** A uv on the picture (0..1) to CSS px on the canvas. */
  project(uv: readonly [number, number]): Point;
  /** CSS px on the canvas to a uv. */
  unproject(point: readonly [number, number]): Point;
  /** The posed face's vertices now, in CSS px. */
  vertices(): Point[];
  /** The eyes' centres, in uvs, or null. */
  eyes(): [Point, Point] | null;
  /** Gone at once (or back, with false), without the animation. */
  setGone(gone?: boolean): void;
  on(fn: (event: FaceEvent) => void): () => void;
  event(event: ViewEvent): void;
  /** Stop and free the GPU; the canvas can take a new face. */
  destroy(): void;
}

/** A talking picture on a canvas. Its methods match core's Wireface. */
export declare class Wireface2D {
  constructor(canvas: HTMLCanvasElement, options?: Face2DOptions);
  readonly canvas: HTMLCanvasElement;
  /** The assets folder's URL. */
  readonly assets: string;
  /** Every setting, as it is now; `character` changes once a character has loaded. */
  readonly config: Face2DConfig;
  /** What's known about the character being worn, or null. */
  readonly character: CharacterInfo | null;
  /** The engine's view, for more than the API gives. */
  readonly view: FaceView2D;
  /** Change settings; returns the whole config. Throws ConfigError for anything invalid. */
  set(patch: Face2DConfigPatch): Face2DConfig;
  /** The ready-made characters. */
  catalogue(): Promise<CatalogueCharacter[]>;
  /** Wear a character; resolves to it once it's on. */
  useCharacter(character: CharacterInput, options?: UseCharacterOptions): Promise<LoadedCharacter | undefined>;
  /** Show an expression for `seconds` (default 4); returns its name. */
  express(name: ExpressionName, seconds?: number): string;
  /** A standing mood, worn when nothing else is showing (null: none); intensity 0..1 (default 0.5). */
  mood(name: ExpressionName | null, intensity?: number): void;
  state(name: FaceState): void;
  /** A clip from the voices folder, or from `base`. */
  clip(id: string, base?: string): Promise<LoadedClip>;
  /** Say a clip; resolves when it's done or stopped, with the sound's node (null when mimed). */
  say(clip: Clip, options?: SayOptions): Promise<AudioBufferSourceNode | null>;
  /** Stop the clip it's saying, sound and mouth. */
  hush(): void;
  /** Lip-sync live to `source`; returns a function that stops it. */
  listenTo(audioContext: AudioContext, source: AudioSource, options?: ListenOptions): () => void;
  /** Burn away, from the bottom up. */
  disappear(): Promise<void>;
  appear(): Promise<void>;
  /** A uv on the picture (0..1) to CSS px on the canvas. */
  project(uv: readonly [number, number]): Point;
  /** CSS px on the canvas to a uv. */
  unproject(point: readonly [number, number]): Point;
  /** Listen to its events; returns an unsubscribe function. */
  on(fn: (event: FaceEvent) => void): () => void;
  /** Stop everything and free the GPU; the canvas can take a new face. */
  destroy(): void;
}

/** A talking picture on `canvas`. */
export declare function createFace2d(canvas: HTMLCanvasElement, options?: Face2DOptions): Wireface2D;

export { exportCharacter } from './character.js';
