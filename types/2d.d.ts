// @wireface/sdk/2d: make any picture of a face talk, on a <canvas> (Wireface 2D).
//
//   import { createFace2d } from '@wireface/sdk/2d';
//   const face = createFace2d(canvas);
//   await face.useCharacter('sora');      // a ready-made character, or any picture (its face is found first)
//   face.express('happy');
//   await face.say(await face.clip('sora'), { audioContext });
//
// The expressions and speech are core's own (the same objects as @wireface/sdk's), so they are re-exported from it.

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

// --- face points ---------------------------------------------------------------------------------------------------

/** A named face point. "left" and "right" are the picture's, not the character's own. */
export type KeypointName =
  | 'left_eye_outer' | 'left_eye_center' | 'left_eye_inner' | 'right_eye_inner' | 'right_eye_center'
  | 'right_eye_outer' | 'left_brow' | 'right_brow' | 'forehead' | 'nose_tip' | 'mouth_left' | 'mouth_right'
  | 'upper_lip' | 'lower_lip' | 'chin' | 'left_cheek' | 'right_cheek' | 'left_jaw' | 'right_jaw';
/** A named point and where it sits on the face mesh: a vertex, or the centre of a ring of them. */
export interface Keypoint {
  readonly name: KeypointName;
  readonly index?: number;
  readonly ring?: readonly number[];
  /** How the detector is asked for it. */
  readonly ask: string;
}
/** Named points, [x, y] from 0 to 1 of the picture. */
export type Keypoints = Partial<Record<KeypointName, Point>>;
/** A box on the picture: [x0, y0, x1, y1], 0 to 1. */
export type Box = [number, number, number, number];

/** The 19 named points. */
export declare const KEYPOINTS: readonly Keypoint[];
/** Every named point, as handles for fine corrections to a fit. */
export declare const ANCHORS: readonly KeypointName[];
/** The six handles of a fit by hand: eye centres, nose, mouth corners, chin. */
export declare const CONTROLS: readonly KeypointName[];

// --- finding faces -------------------------------------------------------------------------------------------------

/** Gemini Live's prebuilt voices. */
export type VoiceName =
  | 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede' | 'Leda' | 'Orus' | 'Zephyr' | 'Autonoe' | 'Umbriel' | 'Erinome'
  | 'Laomedeia' | 'Schedar' | 'Achird' | 'Sadachbia' | 'Enceladus' | 'Algieba' | 'Algenib' | 'Achernar' | 'Gacrux'
  | 'Zubenelgenubi' | 'Sadaltager' | 'Callirrhoe' | 'Iapetus' | 'Despina' | 'Rasalgethi' | 'Alnilam' | 'Pulcherrima'
  | 'Vindemiatrix' | 'Sulafat';
/** How the mesh was fitted: MediaPipe's points, MediaPipe's bent onto Gemini's, Gemini's alone, or by hand. */
export type FitMode = 'dense' | 'fused' | 'keypoints' | 'manual';
/** Which detector the fit came from. */
export type FitSource = 'mediapipe' | 'gemini' | 'gemini+mediapipe' | 'none';
/** A step of finding a face. */
export type DetectStepId = 'prepare' | 'gemini' | 'mediapipe' | 'fit';
/** How far the face is turned: 0 straight on, about 1 in profile; `supported` is false past about 35 degrees. */
export interface FacePose {
  score: number;
  supported: boolean;
}
/** Who the face could be, as Gemini suggests: a character to talk as. */
export interface SuggestedCharacter {
  name: string;
  /** A well-known fictional character. */
  recognized: boolean;
  description: string;
  persona: string;
  voice: VoiceName;
  greeting: string;
}
/** What Gemini found, coordinates 0 to 1. */
export interface GeminiDetection {
  found: boolean;
  faces: number;
  box: Box | null;
  points: Keypoints;
  style: ArtStyle;
  /** Degrees, positive towards the right of the picture. */
  yaw: number;
  mouthOpen: boolean;
  teethVisible: boolean;
  character: SuggestedCharacter | null;
  /** Why a face that was found can't be used. */
  reason?: string;
  model?: string;
}
/** A record of a detection, for replaying it (DetectionOverlay.replay). */
export interface DetectionTrace {
  ms: number;
  box: Box | null;
  points: Keypoints | null;
  dense: boolean;
  mode: FitMode;
  source: FitSource;
  error: number | null;
  model: string | null;
  /** When each step started, in ms. */
  steps: Partial<Record<DetectStepId, number>>;
}
interface StepBase {
  label: string;
  status: 'active' | 'done' | 'skipped' | 'failed';
  detail: string;
  ms: number;
}
/** A step's progress, as detectFace reports it to onStep. */
export type DetectStep =
  | (StepBase & { id: 'prepare'; data?: undefined })
  | (StepBase & { id: 'gemini'; data?: GeminiDetection })
  | (StepBase & { id: 'mediapipe'; data?: { landmarks: Landmarks } })
  | (StepBase & { id: 'fit'; data?: { uvs: Float32Array; mode: FitMode } });
/** How to reach Gemini: a server endpoint that holds the key, or (local development only) a key. */
export interface GeminiOptions {
  endpoint?: string;
  apiKey?: string;
  /** Models to try in order (with apiKey). */
  models?: readonly string[];
  /** The largest side sent, in px (default 1024). */
  maxSide?: number;
}
/** How to find faces. Without `gemini`, MediaPipe looks alone. */
export interface DetectOptions {
  gemini?: GeminiOptions | null;
  /** Self-hosted MediaPipe files, or false to skip it. */
  mediapipe?: Partial<MediaPipePaths> | false;
  onStep?: (step: DetectStep) => void;
  signal?: AbortSignal;
}
/** A picture to find a face in. */
export type PictureInput =
  | string | Blob | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | OffscreenCanvas;
/** A face found in a picture. `mode` is 'manual' when there was none: fit it by hand. */
export interface DetectedFace {
  /** The picture, at most 1024 px. */
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  uvs: Float32Array;
  landmarks: Landmarks;
  mode: FitMode;
  source: FitSource;
  style: ArtStyle;
  keypoints: Keypoints;
  box: Box | null;
  character: SuggestedCharacter | null;
  pose: FacePose;
  mouthOpen: boolean;
  gemini: GeminiDetection | null;
  trace: DetectionTrace;
}

/** MediaPipe's default files, from a CDN. */
export declare const MEDIAPIPE: Readonly<MediaPipePaths>;
/** The steps of finding a face, in order. */
export declare const STEPS: readonly { readonly id: DetectStepId; readonly label: string }[];
/** Gemini models for detection, tried in order. */
export declare const DETECT_MODELS: readonly string[];
/** Gemini Live's voices and their character. */
export declare const VOICES: Readonly<Record<VoiceName, string>>;
/** Find the face in a picture. Never rejects for "no face": `mode` is then 'manual'. */
export declare function detectFace(input: PictureInput, options?: DetectOptions): Promise<DetectedFace>;

// --- characters ----------------------------------------------------------------------------------------------------

/** What's known about a character: all optional. */
export interface CharacterInfo {
  id?: string | null;
  name?: string;
  /** An art style id (see ART_STYLES). */
  style?: string;
  styleLabel?: string;
  voice?: string;
  persona?: string;
  greeting?: string;
  description?: string;
  /** Its recorded line, and expression cues along it ([seconds, expression]). */
  line?: string;
  cues?: readonly (readonly [number, string])[];
  teeth?: TeethStyle2D;
  teethMode?: TeethMode;
  /** Corrections to the fit, in pixels of the picture. */
  adjust?: Partial<Record<KeypointName, readonly [number, number]>>;
  mode?: FitMode | null;
  source?: string | null;
  keypoints?: Keypoints | null;
  box?: Box | null;
  trace?: DetectionTrace | null;
  pose?: FacePose;
  width?: number;
  height?: number;
}
/** A character to wear: a picture and its 468 landmarks (or uvs), or a catalogue entry (its `data` is fetched). */
export interface CharacterSource extends CharacterInfo {
  image?: string | Blob | ImageBitmap | HTMLCanvasElement | HTMLImageElement;
  canvas?: HTMLCanvasElement;
  landmarks?: LandmarksInput | Float32Array;
  uvs?: Float32Array | LandmarksInput;
  /** The URL of its <id>.json. */
  data?: string;
}
/** A ready-made character, with the URLs of its files. */
export interface CatalogueCharacter extends CharacterSource {
  id: string;
  name: string;
  style: ArtStyle;
  styleLabel: string;
  voice: string;
  persona: string;
  greeting: string;
  image: string;
  thumb: string;
  data: string;
}
/** A character ready to wear: its picture decoded, its landmarks as flat uvs. */
export interface LoadedCharacter extends CharacterSource {
  image: ImageBitmap | HTMLCanvasElement | HTMLImageElement;
  uvs: Float32Array;
}
/** A character made from a picture by characterFromImage. */
export interface DetectedCharacter extends DetectedFace {
  id: null;
  image: HTMLCanvasElement;
  name: string;
  voice: string;
  persona: string;
  greeting: string;
  description: string;
}
/** What to save for a character (its <id>.json). */
export interface CharacterData {
  landmarks: Landmarks;
  style: string;
  mode: FitMode | null;
  source: string | null;
  keypoints: Keypoints | null;
  box: Box | null;
  trace: DetectionTrace | null;
}
/** What useCharacter takes: a catalogue id, a character, or a picture (its face is found first). */
export type CharacterInput = string | CharacterSource | Blob | HTMLImageElement | HTMLCanvasElement | ImageBitmap;

/** The URL of the assets that come with the package (characters and voices). */
export declare const ASSETS: string;
/** The ready-made characters in the `assets` folder (default: ASSETS). */
export declare function catalogue(assets?: string): Promise<CatalogueCharacter[]>;
/** A character ready to wear: a catalogue entry (fetched), or your own { image, landmarks }. */
export declare function loadCharacter(entry: CharacterSource): Promise<LoadedCharacter>;
/** A character from any picture: its face is found, and a name, persona and voice suggested. */
export declare function characterFromImage(input: PictureInput, options?: DetectOptions): Promise<DetectedCharacter>;
/** What to save for a character, as plain JSON. */
export declare function characterData(character: CharacterSource): CharacterData;

// --- the face ------------------------------------------------------------------------------------------------------

export interface Face2DOptions {
  /** Settings, checked (a ConfigError names a bad one). */
  config?: Face2DConfigPatch;
  /** Base URL of the characters/ and voices/ folders (default: ASSETS). */
  assets?: string;
  /** How to find faces in new pictures. */
  detect?: Pick<DetectOptions, 'gemini' | 'mediapipe'>;
  /** The head turns a little towards the pointer (default true). */
  follow?: boolean;
}
export interface UseCharacterOptions {
  /** Seconds for the old character to burn away and the new one in (default 0.9; 0 switches at once). */
  transition?: number;
  onStep?: (step: DetectStep) => void;
  signal?: AbortSignal;
}
/** A fit being corrected by hand (Wireface2D.editFit). */
export interface FitEditor {
  /** The handles' names. */
  readonly names: KeypointName[];
  /** Where the handles are, in CSS px. */
  points(): Point[];
  /** Drag handle `index` to CSS px `point`. */
  move(index: number, point: readonly [number, number]): void;
  /** Move the whole mesh by CSS px. */
  shift(dx: number, dy: number): void;
  shape(transform: { scaleX?: number; scaleY?: number; rotation?: number }): void;
  reset(): void;
  /** The fit now. */
  uvs(): Float32Array;
  /** Finish: puts show_mesh back as it was; returns the fit. */
  done(): Float32Array;
}

/** The engine's view of one talking picture: `face.view`. */
export declare class FaceView2D {
  constructor(canvas: HTMLCanvasElement);
  readonly canvas: HTMLCanvasElement;
  /** The mouth timeline, to feed mouth packets from a stream. */
  timeline: MouthTimeline;
  readonly speaking: boolean;
  /** The character being worn (with its size and aspect), or null. */
  readonly character: (LoadedCharacter & { width: number; height: number; aspect: number }) | null;
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
  useCharacter(character: CharacterInput, options?: UseCharacterOptions): Promise<LoadedCharacter>;
  /** Find the face in a picture without wearing it. */
  detect(input: PictureInput, options?: { onStep?: (step: DetectStep) => void; signal?: AbortSignal }): Promise<DetectedFace>;
  /** Correct the fit by hand: `handles` are CONTROLS (default) or ANCHORS. */
  editFit(options?: { handles?: readonly KeypointName[] }): FitEditor;
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

// --- showing detection ---------------------------------------------------------------------------------------------

/** Where the picture is drawn in the overlay's container, in CSS px. */
export interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Face detection drawn over a picture, in SVG: a scan line, the face box, the named points, the dense landmarks and
 * the fitted mesh. Colour it with --wf-box, --wf-point, --wf-dense and --wf-mesh on the container.
 */
export declare class DetectionOverlay {
  /** `container` should be position: relative, with the picture filling it. */
  constructor(container: Element, options?: { labels?: boolean });
  readonly svg: SVGSVGElement;
  /** Where the picture is; redraws what's shown. */
  place(rect: OverlayRect): void;
  clear(): void;
  /** Fade it all out (default 600 ms), then clear. */
  fade(ms?: number): Promise<void>;
  /** The scan line, on or off. */
  scan(on: boolean): void;
  box(box: Box | null, animate?: boolean): void;
  points(points: Keypoints | null, animate?: boolean): void;
  dense(landmarks: Landmarks | null, animate?: boolean): void;
  /** The fitted mesh, from 468 uvs (flat, or [x, y] pairs). */
  mesh(uvs: Float32Array | LandmarksInput | null, animate?: boolean): SVGGElement | undefined;
  /** Draw a detectFace step as it arrives (pass it to onStep). */
  step(step: DetectStep): void;
  /** Play back a saved detection at a watchable pace. */
  replay(trace: DetectionTrace | null | undefined, uvs: Float32Array | LandmarksInput, options?: { pace?: number }): Promise<void>;
}
