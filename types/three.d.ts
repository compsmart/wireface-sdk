import type { LoadedCharacter as PortableCharacter, CharacterTransition, BakedRig } from './character.js';
// @wireface/sdk/three: talking, lip-synced faces on three.js characters. three.js is a peer dependency.
//
//   import { FaceMesh, attachFace } from '@wireface/sdk/three';
//   const face = new FaceMesh({ skin: 'sarah', size: 0.3 });
//   attachFace(character.head, face);
//   face.express('happy');
//   await face.say(await face.clip('sarah'), { audioContext });

import { Group } from 'three';
import type {
  BufferGeometry, CanvasTexture, Color, Mesh, MeshBasicMaterial, MeshStandardMaterial, MeshStandardMaterialParameters,
  Object3D, PlaneGeometry, SphereGeometry, Texture, Vector3,
} from 'three';
import type { FaceConfig, FaceConfigPatch, TeethStyle } from './config.js';
import type {
  AudioSource, Clip, ExpressionName, ExpressionWeights, FaceEvent, FaceState, LandmarksInput, ListenOptions,
  LoadedClip, MouthTimeline, SayOptions, SkinInput, ViewEvent, Wireface,
} from './index.js';
import type { Face2DConfig, Face2DConfigPatch } from './2d-config.js';
import type { CharacterInput, LoadedCharacter, UseCharacterOptions, Wireface2D } from './2d.js';

// From core, for convenience: the names of things, skins and speech.
export {
  ALIASES, ASSETS, CHANNELS, ConfigError, DEFAULTS, EXPRESSIONS, LiveLipSync, MOODS, MouthTracker, PRESETS, RANGES,
  StreamVoice, TEETH_STYLES, catalogue, loadClip, playClip, resolveExpression, loadCharacter, exportCharacter, skinFromPhoto, MEDIAPIPE,
} from './index.js';
export type {
  Alias, AudioSource, Channel, Clip, ExpressionName, ExpressionWeights, FaceConfig, FaceConfigPatch, FaceEvent,
  FaceState, ListenOptions, LoadedClip, Mood, SayOptions, SkinInput, SpeakingFace, TeethStyle,
} from './index.js';

// --- settings ------------------------------------------------------------------------------------------------------

/** The looks a FaceMesh has: core's three, plus cel-shaded `toon`. */
export type FaceMeshStyle = 'hologram' | 'sculpt' | 'photo' | 'toon';
/** A FaceMesh's config: core's, with the `toon` style. */
export type FaceMeshConfig = Omit<FaceConfig, 'style'> & { style: FaceMeshStyle };
/** Part of a FaceMesh's config. */
export type FaceMeshConfigPatch = Omit<FaceConfigPatch, 'style'> & { style?: FaceMeshStyle };

/** The looks, in order. */
export declare const STYLES: readonly FaceMeshStyle[];
/** Core's validateConfig, plus the `toon` style. */
export declare function validateFaceConfig(patch?: FaceMeshConfigPatch, base?: FaceMeshConfig): FaceMeshConfig;

// --- FaceMesh ------------------------------------------------------------------------------------------------------

/** Stretches the skull: width, height and depth multiply it; crown (0..1.5) raises the top of the head. */
export interface HeadShape {
  width?: number;
  height?: number;
  depth?: number;
  crown?: number;
}
/** A FaceMesh's own options, and any of core's settings given directly (style, preset, colors, glow...). */
export type FaceMeshOptions = Omit<FaceMeshConfigPatch, 'skin'> & {
  /** A catalogue id ('sarah', 'dracula'...), { image, landmarks, teeth? }, or none. */
  skin?: string | SkinInput | null;
  /** The face's height, chin to hairline, in scene units (default 0.25). */
  size?: number;
  /** The back of the head: 'auto' (default) gives one for the skin styles. */
  skull?: boolean | 'auto';
  headShape?: HeadShape;
  /** '#rrggbb' for the skull and the face's edge, or 'auto' (the photo's skin tone, or colors.skin). */
  headColor?: string;
  /** Base URL of core's skins/ and voices/ (default: ASSETS). */
  assets?: string;
  /** Update itself as the scene renders (default true); false: call update() yourself. */
  autoUpdate?: boolean;
  /** Cast and receive shadows (default true). */
  shadows?: boolean;
  /** A face config, merged with any settings given directly. */
  config?: FaceMeshConfigPatch;
  /** Loads a teeth picture as a texture (default: fetched and decoded). */
  textureLoader?: (url: string) => Promise<Texture>;
};
/** What a FaceMesh reports: core's events, and a skin going on (its id, or null) or off (null). */
export type FaceMeshEvent = FaceEvent | { type: 'skin'; skin: string | null };
/** Where things are on a FaceMesh's head, in its own space (origin the head's centre, +z the way it faces, +y up). */
export interface HeadBounds {
  readonly size: number;
  /** Heights: the hairline, the chin, the brows. */
  readonly top: number;
  readonly chin: number;
  readonly brow: number;
  /** The tip of the nose. */
  readonly front: number;
  /** The face's back edge (by the ears): keep a head of your own behind it. */
  readonly back: number;
  /** The ellipsoid the back of the head is built on. */
  readonly skull: { readonly center: Vector3; readonly radius: Vector3 };
  readonly eyes: { readonly left: Vector3; readonly right: Vector3; readonly radius: number };
  readonly ears: { readonly left: Vector3; readonly right: Vector3 };
  readonly nose: Vector3;
  readonly mouth: Vector3;
  readonly neck: Vector3;
}
/** The animator's head pose: radians, and a bob in rig units. */
export interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;
  y: number;
}
/** Something to look at: a world-space point ([x, y, z] or a Vector3), an Object3D followed as it moves, or null. */
export type GazeTarget = Object3D | Vector3 | readonly [number, number, number] | null;
/** The inside of the mouth. */
export interface FaceMouth {
  readonly group: Group;
  readonly cavity: Mesh;
  readonly tongue: Mesh;
  readonly upper: Mesh | null;
  readonly lower: Mesh | null;
}

/** A Wireface face as three.js geometry: a Group to add to a character's head, lit by your scene. */
export declare class FaceMesh extends Group {
  useCharacter(character: string | PortableCharacter, options?: CharacterTransition): Promise<PortableCharacter | undefined>;
  installRig(rig: BakedRig): void;
  constructor(options?: FaceMeshOptions);
  readonly isFaceMesh: true;
  /** The assets folder's URL. */
  readonly assets: string;
  /** Update itself as the scene renders. */
  autoUpdate: boolean;
  /** Every setting, as it is now. */
  readonly config: FaceMeshConfig;
  /** The style being shown (a skin shows in photo, unless sculpt or toon is asked for). */
  readonly style: FaceMeshStyle;
  /** The face's height, chin to hairline, in scene units (setSize changes it). */
  readonly size: number;
  /** Where things are on the head. */
  readonly bounds: HeadBounds;
  /** The group that moves with the face: add hair, hats and glasses to it. */
  readonly head: Group;
  /** The skull's colour. */
  readonly headColor: Color;
  /** It is speaking. */
  readonly speaking: boolean;
  /** How much it's talking right now, 0..1. */
  readonly level: number;
  /** The animator's head pose this frame. */
  readonly motion: HeadPose;
  /** Resolves once the first skin is on. */
  readonly ready: Promise<void>;
  /** The FaceDriver: core's timeline, animator and rig. */
  readonly view: FaceDriver;
  /** The same FaceDriver as `view`. */
  readonly driver: FaceDriver;
  readonly rig: FaceRig;
  /** The face's surface. */
  readonly surface: Mesh;
  readonly skullMesh: Mesh;
  readonly eyes: { readonly R: Mesh; readonly L: Mesh };
  readonly mouth: FaceMouth;
  /** The face's own geometry, whose position attribute is the posed rig. */
  readonly faceGeometry: BufferGeometry;
  /** Resize: the face's height in scene units. */
  setSize(size: number): this;
  /** Look at something; past a little way the head turns too, up to `turn` radians (default 0.9; 0: eyes only). */
  gazeAt(target: GazeTarget, options?: { turn?: number }): this;
  /** Move an outside head the face is on with the face's own motion (null: the face moves itself). */
  drive(head: Object3D | null): this;
  /** A MeshStandardMaterial in the head's colour, kept in step when the skin changes. */
  skinMaterial(params?: MeshStandardMaterialParameters): MeshStandardMaterial;
  /** Change settings; returns the whole config. Throws ConfigError for anything invalid. */
  set(patch: FaceMeshConfigPatch): FaceMeshConfig;
  /** Wear a skin (null: none); with `sweep` (seconds) it scans down over the face. */
  useSkin(skin: string | SkinInput | null, options?: { sweep?: number; teeth?: TeethStyle }): Promise<void>;
  /** Show an expression for `seconds` (default 4); returns its name. */
  express(name: ExpressionName, seconds?: number): string;
  /** A standing mood, worn when nothing else is showing (null: none); intensity 0..1 (default 0.5). */
  mood(name: ExpressionName | null, intensity?: number): void;
  state(name: FaceState): void;
  /** A clip from core's voices folder, or from `base` (see voices()). */
  clip(id: string, base?: string): Promise<LoadedClip>;
  /** Say a clip; resolves when it's done or stopped, with the sound's node (null when mimed). */
  say(clip: Clip, options?: SayOptions): Promise<AudioBufferSourceNode | null>;
  /** Stop talking, sound and mouth. */
  hush(): void;
  /** Lip-sync live to `source`; returns a function that stops it. */
  listenTo(audioContext: AudioContext, source: AudioSource, options?: ListenOptions): () => void;
  /** The waiting spinner in the eyes, on or off. */
  spinner(on?: boolean): void;
  /** Burn away from the chin up. */
  disappear(): Promise<void>;
  appear(): Promise<void>;
  /** Gone at once; appear() brings it back. */
  setGone(): void;
  /** Listen to its events; returns an unsubscribe function. */
  on(fn: (event: FaceMeshEvent) => void): () => void;
  /** One frame (called for you as the scene renders, unless autoUpdate is false). */
  update(): void;
  /** What's been added to the face and its head (hair, hats...). */
  added(): Object3D[];
  /** Throws: a face can't be copied into another. Use clone(), which makes a new face from the same options. */
  copy(source: Object3D, recursive?: boolean): never;
  /** Free its geometries, materials and textures, and stop talking. */
  dispose(): void;
}

/** A FaceMesh. */
export declare function createFaceMesh(options?: FaceMeshOptions): FaceMesh;

// --- FaceScreen ----------------------------------------------------------------------------------------------------

/** Which face a FaceScreen shows: core's renderer ('3d') or Wireface 2D ('2d'). */
export type ScreenEngine = '3d' | '2d';
/** The engine's own face object. */
export type ScreenFace<E extends ScreenEngine> = E extends '2d' ? Wireface2D : Wireface;
/** The engine's settings. */
export type ScreenConfig<E extends ScreenEngine> = E extends '2d' ? Face2DConfig : FaceConfig;
/** Part of the engine's settings. */
export type ScreenConfigPatch<E extends ScreenEngine> = E extends '2d' ? Face2DConfigPatch : FaceConfigPatch;
export interface FaceScreenOptions<E extends ScreenEngine = ScreenEngine> {
  /** Which face (default '3d'). */
  engine?: E;
  /** 3d: a skin to wear. */
  skin?: string | SkinInput;
  /** 2d: a character (a catalogue id, an entry, or a picture to find a face in). */
  character?: CharacterInput;
  /** The engine's settings. */
  config?: ScreenConfigPatch<E>;
  /** The canvas in pixels: 512 (default), or [width, height] to match the surface's shape. */
  resolution?: number | readonly [number, number];
  /** 3d: how much of the canvas the face fills (default 0.9). */
  fit?: number;
  /** The engine's assets folder, if not its own. */
  assets?: string;
  /** 2d: how to find faces in new pictures. */

}
/** A FaceScreen's material: unlit, the face over `background` (null for see-through). */
export interface ScreenMaterialOptions {
  background?: string | null;
  brightness?: number;
  /** Corner rounding, 0..0.5 of the height. */
  corner?: number;
  scanlines?: number;
  vignette?: number;
}

/**
 * A whole Wireface face drawn by its own engine, as a live texture: for a face on something (a screen, a visor, a
 * painting). Each one is a WebGL context. Its methods wait for the engine to load.
 */
export declare class FaceScreen<E extends ScreenEngine = '3d'> {
  constructor(options?: FaceScreenOptions<E>);
  readonly engine: E;
  readonly width: number;
  readonly height: number;
  /** The canvas the engine draws on. */
  readonly canvas: HTMLCanvasElement;
  /** The canvas as a texture. */
  readonly texture: CanvasTexture;
  /** The engine's face (core's Wireface, or Wireface 2D's), once it has loaded. */
  readonly face: ScreenFace<E> | null;
  /** The mesh it's bound to. */
  readonly mesh: Object3D | null;
  /** Resolves to the screen once the engine has loaded. */
  readonly ready: Promise<this>;
  /** The engine's settings, once it has loaded. */
  readonly config: ScreenConfig<E> | undefined;
  readonly speaking: boolean;
  /** How much it's talking right now, 0..1. */
  readonly level: number;
  /** A material for the screen. */
  material(options?: ScreenMaterialOptions): MeshBasicMaterial;
  /** Show the face on `mesh` and draw it whenever that mesh is drawn. Returns the mesh. */
  bind<T extends Object3D>(mesh: T): T;
  unbind(): void;
  /** Draw a frame into the texture (bind() does this for you). */
  update(): void;
  /** Look at a world-space point or an Object3D, from the bound mesh's front; null looks ahead. */
  gazeAt(target: Object3D | Vector3 | null): this;
  set(patch: ScreenConfigPatch<E>): ScreenConfig<E> | Promise<ScreenConfig<E> | undefined>;
  express(name: ExpressionName, seconds?: number): string | Promise<string | undefined>;
  mood(name: ExpressionName | null, intensity?: number): void | Promise<void>;
  state(name: FaceState): void | Promise<void>;
  clip(id: string, base?: string): Promise<LoadedClip | undefined>;
  say(clip: Clip, options?: SayOptions): Promise<AudioBufferSourceNode | null | undefined>;
  hush(): void;
  /** Lip-sync live to `source`; returns a function that stops it (it starts once the engine has loaded). */
  listenTo(audioContext: AudioContext, source: AudioSource, options?: ListenOptions): () => void;
  appear(): Promise<void>;
  disappear(): Promise<void>;
  setGone(): void | Promise<void>;
  /** 3d only: the waiting spinner in the eyes. */
  spinner(on?: boolean): void | Promise<void>;
  on(fn: (event: FaceEvent) => void): () => void;
  /** 3d only: wear a skin. */
  useSkin(skin: string | SkinInput | null, options?: { sweep?: number; teeth?: TeethStyle }): Promise<void>;
  /** 2d only: wear a character. */
  useCharacter(character: CharacterInput, options?: UseCharacterOptions): Promise<LoadedCharacter | undefined>;
  /** Free the engine (and its WebGL context), the texture and the hook on the bound mesh. */
  dispose(): void;
}

/** A FaceScreen. */
export declare function createFaceScreen<E extends ScreenEngine = '3d'>(options?: FaceScreenOptions<E>): FaceScreen<E>;

// --- surfaces and heads --------------------------------------------------------------------------------------------

/** A screen facing +z: `width` x `height`, bulging forward by `curve` in the middle (0: flat). */
export declare function screenGeometry(options?: { width?: number; height?: number; curve?: number; segments?: number }): PlaneGeometry;
/** A visor: a piece of a sphere of `radius`, `width` and `height` radians across, centred on +z. */
export declare function visorGeometry(options?: { radius?: number; width?: number; height?: number; segments?: number }): SphereGeometry;

export interface AttachOptions {
  /** Where the face's centre goes, in the head's space (default [0, 0, 0]). */
  at?: readonly [number, number, number];
  /** Euler angles [x, y, z], for a head whose front isn't +z. */
  rotation?: readonly [number, number, number];
  /** The face's height in world units, whatever scale the head has. */
  size?: number;
  /** Move `head` with the face's motion (default true). */
  motion?: boolean;
}
/** Add `face` to `head` (a mesh, group or bone) and let it move that head. Returns the face. */
export declare function attachFace<T extends FaceMesh>(head: Object3D, face: T, options?: AttachOptions): T;
/** The first bone under `root` whose name matches (a RegExp, or a string in any case), else the first object. */
export declare function findBone(root: Object3D, name?: RegExp | string): Object3D | null;

// --- sound ---------------------------------------------------------------------------------------------------------

/** The page's AudioContext, made (or resumed) now: call it from a click or key handler. */
export declare function unlockAudio(): AudioContext;
/** The AudioContext once unlockAudio() has made it, or null. */
export declare function audioContext(): AudioContext | null;
/** Run `fn` with the AudioContext on the next click or key press anywhere on the page. */
export declare function onFirstGesture(fn: (audioContext: AudioContext) => void): void;
/** The folder of an engine's recorded lines, for face.clip(id, folder): '3d' (core's, default) or '2d'. */
export declare function voices(engine?: ScreenEngine): string;
/** Where the voices are, if not in the package (with a bundler, copy them out). */
export declare function setVoiceFolders(folders: Partial<Record<ScreenEngine, string>>): void;

// --- expressions ---------------------------------------------------------------------------------------------------

/** Add or replace an expression for every face (FaceMesh, and both kinds of FaceScreen); returns its name. */
export declare function defineExpression(name: string, weights: ExpressionWeights): string;
/** Another engine's defineExpression: it gets every expression defined so far, and from now on. */
export declare function shareExpressions(define: (name: string, weights: ExpressionWeights) => unknown): void;

// --- the parts, to build on ----------------------------------------------------------------------------------------

/** Wireface core's face rig, in rig units (about a centimetre); its other fields are internal. */
export interface FaceRig {
  /** The number of vertices. */
  readonly count: number;
  /** The neutral face's vertex positions (x, y, z). */
  readonly base: Float32Array;
}
/** The animator's output for a frame. */
export interface AnimatorFrame {
  weights: Float32Array;
  jaw: number;
  head: HeadPose;
  /** [yaw, pitch], radians. */
  gaze: [number, number];
  pupil: number;
  dim: number;
  /** [up, forward]. */
  tongue: [number, number];
  /** How much it's talking, 0..1. */
  talk: number;
}
/** The settings the animator reads. */
export interface MotionSettings {
  motion?: number;
  expressiveness?: number;
  mouth_gain?: number;
  follow_mouse?: boolean;
  sync_offset_ms?: number;
}
/** What a face is doing, as the animator sees it. */
export type DriverState = 'idle' | 'speaking' | 'listening' | 'thinking' | 'busy' | 'error' | 'muted' | 'asleep';

/** The status each face.state() name sets. */
export declare const STATES: Readonly<Record<FaceState, string>>;

/** One face's life without a canvas: core's rig, animator and mouth timeline, stepped once a frame. */
export declare class FaceDriver {
  constructor();
  readonly rig: FaceRig;
  /** The posed vertices (rig units) and the jaw's angle. */
  readonly pose: { readonly pos: Float32Array; readonly nrm: Float32Array; readonly jawAngle: number };
  timeline: MouthTimeline;
  status: { state: string };
  readonly speaking: boolean;
  /** The animator's last output. */
  readonly out: AnimatorFrame | null;
  on(fn: (event: FaceMeshEvent) => void): () => void;
  emit(event: FaceMeshEvent): void;
  /** The events core's FaceView takes. */
  event(event: ViewEvent): void;
  /** A standing mood ({ face: an expression, intensity }), or null. */
  applyMood(mood: { face: string; intensity?: number } | null): void;
  state(): DriverState;
  /** Look towards [yaw, pitch] (radians, the face's own frame), or null. */
  setGaze(yaw: number | null, pitch?: number | null): void;
  /** One frame at `t` (seconds, default now): returns the animator's output; `pose` holds the vertices. */
  step(settings: MotionSettings, t?: number): AnimatorFrame;
}

/** The back of a head, swept from the face's outline round to the back; follows the posed face. */
export declare class Skull {
  constructor(rig: FaceRig, shape?: HeadShape, rings?: number);
  readonly geometry: BufferGeometry;
  /** The face's outline (vertex indices). */
  readonly ring: number[];
  readonly center: [number, number, number];
  readonly radii: [number, number, number];
  /** Follow the posed face's vertex positions and normals (rig units). */
  update(pos: ArrayLike<number>, nrm: ArrayLike<number>): void;
}
/** The ellipsoid a head is built on, for a neutral face (rig units): its centre and radii. */
export declare function headShape(base: ArrayLike<number>, ring: readonly number[], shape?: HeadShape): {
  center: [number, number, number];
  radii: [number, number, number];
};
/** The face mesh's outer edge, in order round the face (vertex indices). */
export declare function outline(): number[];

/** A picture colours are read from. */
export type ColourSource = ImageBitmap | HTMLCanvasElement | HTMLImageElement | OffscreenCanvas;
/** A skin picture's skin tone. */
export declare function skinColour(picture: ColourSource, landmarks: LandmarksInput): Color;
/** A skin picture's eye colour. */
export declare function irisColour(picture: ColourSource, landmarks: LandmarksInput): Color;

export declare function wrapGeometry(geometry: BufferGeometry, options?: { width?: number; height?: number; center?: [number, number]; flip?: boolean }): BufferGeometry;
