// @wireface/sdk: a talking, lip-synced 3D face on a <canvas> (Wireface core).
//
//   import { createFace } from '@wireface/sdk';
//   const face = createFace(canvas, { config: { preset: 'cyan' } });
//   await face.useSkin('mei', { sweep: 1.6 });
//   face.express('happy');
//   await face.say(await face.clip('mei'), { audioContext });

import type { FaceConfig, FaceConfigPatch, TeethStyle } from './config.js';

export { DEFAULTS, PRESETS, RANGES, STYLES, TEETH_STYLES, ConfigError, validateConfig } from './config.js';
export { DEFAULTS as DEFAULT_CONFIG } from './config.js';
export type {
  ColorName, Colors, FaceConfig, FaceConfigPatch, NumberSetting, Preset, Style, TeethStyle,
} from './config.js';

// --- points --------------------------------------------------------------------------------------------------------

/** A point: [x, y]. */
export type Point = [number, number];
/** MediaPipe's 468 face landmarks: [x, y] from 0 to 1, origin top left. */
export type Landmarks = Point[];
/** Landmarks as you may pass them: any array of [x, y] pairs. */
export type LandmarksInput = readonly (readonly number[])[];

// --- expressions ---------------------------------------------------------------------------------------------------

/** The expressions meant for people to set. */
export type Mood =
  | 'neutral' | 'happy' | 'excited' | 'amused' | 'surprised' | 'curious' | 'thinking' | 'concerned' | 'sad'
  | 'afraid' | 'frustrated' | 'calm' | 'content' | 'bored' | 'glum';
/** Everyday words for the moods. */
export type Alias =
  | 'fear' | 'scared' | 'worried' | 'joy' | 'smile' | 'glad' | 'excitement' | 'surprise' | 'shocked' | 'confused'
  | 'pondering' | 'upset' | 'angry' | 'annoyed' | 'relaxed' | 'laugh' | 'interested';
/** A mood, an alias, or an expression of your own (from defineExpression). Unknown names throw. */
export type ExpressionName = Mood | Alias | (string & {});
/** What an expression can move: the rig's channels, plus `jaw` (opens the mouth). */
export type Channel =
  | 'close' | 'wide' | 'round' | 'upperUp' | 'lowerDown' | 'bite' | 'smileL' | 'smileR' | 'frown'
  | 'blinkL' | 'blinkR' | 'squintL' | 'squintR' | 'eyeWideL' | 'eyeWideR' | 'browUpL' | 'browUpR' | 'browDown'
  | 'browInner' | 'cheekPuff' | 'sneer' | 'pout' | 'jaw';
/** An expression: channels to weights from 0 to 1. */
export type ExpressionWeights = Partial<Record<Channel, number>>;
/** What the face is doing, which shows in its eyes and posture. */
export type FaceState = 'idle' | 'thinking' | 'busy' | 'error' | 'muted' | 'asleep';

/** Every channel an expression can move. */
export declare const CHANNELS: readonly Channel[];
/** The moods, in order. */
export declare const MOODS: readonly Mood[];
/** Everyday words and the mood each means. */
export declare const ALIASES: Readonly<Record<Alias, Mood>>;
/** Every expression by name (the built-in ones and those from defineExpression), shared by every face. */
export declare const EXPRESSIONS: Record<string, ExpressionWeights>;
/** The expression called `name` (or one of its aliases); throws for one that doesn't exist. */
export declare function resolveExpression(name: string): string;
/** Add or replace an expression for every face on the page; returns its name. Throws for an unknown channel. */
export declare function defineExpression(name: string, weights: ExpressionWeights): string;

// --- skins ---------------------------------------------------------------------------------------------------------

/** Where MediaPipe's face landmarker is loaded from. */
export interface MediaPipePaths {
  bundle: string;
  wasm: string;
  model: string;
}
/** A ready-made skin, with the URLs of its files. */
export interface CatalogueSkin {
  id: string;
  name: string;
  /** Free text: the included ones are human, robot or creature. */
  kind: string;
  teeth: TeethStyle;
  image: string;
  thumb: string;
  landmarks: string;
}
/** A skin of your own: a picture and its landmarks (each a URL, or the thing itself). */
export interface SkinInput {
  image: string | Blob | ImageBitmap;
  landmarks: string | LandmarksInput;
  teeth?: TeethStyle;
}
/** A skin made from a photo by skinFromPhoto. */
export interface PhotoSkin {
  /** The picture as a JPEG, at most 1024 px. */
  image: Blob;
  landmarks: Landmarks;
  width: number;
  height: number;
}

/** MediaPipe's default files, from a CDN. */
export declare const MEDIAPIPE: Readonly<MediaPipePaths>;
/** The ready-made skins in the `assets` folder (see ASSETS). */
export declare function catalogue(assets: string): Promise<CatalogueSkin[]>;
/** A skin from a photo (File, Blob or URL); rejects if there's no face in it. `paths` hosts MediaPipe yourself. */
export declare function skinFromPhoto(photo: Blob | string, paths?: Partial<MediaPipePaths>): Promise<PhotoSkin>;

// --- speech --------------------------------------------------------------------------------------------------------

/** The mouth channels of a mouth track. */
export type MouthChannel = 'jaw' | 'wide' | 'round' | 'close' | 'fric' | 'bite' | 'tongue' | 'energy';
/** Mouth channels at a moment, 0 to 1. */
export type MouthChannels = Record<MouthChannel, number>;
/** What a mouth timeline gives for a moment: its channels, and the line being said. */
export interface MouthSample extends Partial<MouthChannels> {
  src?: string;
  text?: string | null;
}
/** A piece of a mouth track: a row of `ch` values every `hop` samples from sample `s0`, at `sr` Hz. */
export interface MouthPacket {
  s0: number;
  hop: number;
  sr: number;
  ch: readonly string[];
  frames: number[][];
  src?: string;
  text?: string | null;
}
/** "Sample `s` reaches the speaker at wall time `t`" (seconds, as Date.now() / 1000); `end` is the last sample. */
export interface MouthClock {
  s: number;
  t: number;
  sr: number;
  end?: number | null;
}
/** A face's mouth timeline: buffers mouth packets and plays them against an audio clock. */
export interface MouthTimeline {
  add(packet: MouthPacket): void;
  setClock(clock: MouthClock): void;
  flush(): void;
  /** The mouth at wall time `now` (seconds), or null when nothing is audible. */
  sample(now: number): MouthSample | null;
}
/** An event for a face's view: { topic: 'actor.speaking', payload: { state: 'start' | 'stop', text } } and the like. */
export interface ViewEvent {
  topic: string;
  payload?: unknown;
}
/** The view the speech functions drive. */
export interface FaceViewLike {
  timeline: MouthTimeline;
  event(event: ViewEvent): void;
}
/** Any face the speech functions can drive: core's, Wireface 2D's, or a three.js FaceMesh. */
export interface SpeakingFace {
  readonly view: FaceViewLike;
  hush(): void;
}
/** A recorded line: its sound, its text and its mouth track. */
export interface Clip {
  text?: string;
  /** Seconds. */
  duration: number;
  mouth?: MouthPacket[];
  /** A URL, or the decoded sound. */
  audio?: string | AudioBuffer;
}
/** A clip loaded from a folder. */
export interface LoadedClip extends Clip {
  id: string;
  audio: string;
}
/** How to say a clip. */
export interface SayOptions {
  /** Heard as well as seen (without it, the face mimes). */
  audioContext?: AudioContext | null;
  /** The words so far, as they're spoken. */
  onCaption?: ((text: string) => void) | null;
}
/** Something to lip-sync to as it plays. */
export type AudioSource = MediaStream | HTMLMediaElement | AudioNode;
export interface ListenOptions {
  /** Opens the mouth more or less (default 1). */
  gain?: number;
}
export interface StreamVoiceOptions {
  /** Of the PCM pushed (default 24000). */
  sampleRate?: number;
  /** Seconds buffered before the voice starts (default 0.25). */
  buffer?: number;
  /** Seconds of mouth frames held back for a burst that may yet close the lips (default 0.15). */
  hold?: number;
}

/** A clip from a folder: `${base}${id}.json` and the sound it names (`${id}.m4a` if none). */
export declare function loadClip(base: string, id: string): Promise<LoadedClip>;
/** Say `clip` on `face`; resolves when it's over or stopped, with the sound's node (null when mimed). */
export declare function playClip(face: SpeakingFace, clip: Clip, options?: SayOptions): Promise<AudioBufferSourceNode | null>;

/** Live lip sync from an audio source; while attached it stands in for the face's mouth timeline. */
export declare class LiveLipSync {
  constructor(audioContext: AudioContext, source: AudioSource, options?: ListenOptions);
  /** Drive `face`'s mouth, taking over from any attached before. */
  attach(face: SpeakingFace): void;
  /** Let go of the face: the one attached before takes over again. */
  detach(): void;
  /** The mouth channels now, or null when it's quiet. */
  sample(): MouthChannels | null;
  add(packet?: MouthPacket): void;
  setClock(clock?: MouthClock): void;
  flush(): void;
}

/** The channels of a mouth track, in order. */
export declare const MOUTH_CHANNELS: readonly MouthChannel[];

/** Turns audio, in playback order, into mouth packets for a face's timeline (for sound you play yourself). */
export declare class MouthTracker {
  /** `lead`: seconds the shapes show early (default 0.03); `hold`: seconds held back (default 0.2). */
  constructor(sampleRate: number, options?: { lead?: number; hold?: number });
  /** Add samples (-1..1) that start at player sample `index`; returns the packets now final. */
  feed(samples: Float32Array, index: number): MouthPacket[];
  /** The frames held back after the last feed, provisionally, or null. */
  peek(): MouthPacket | null;
  /** End of the utterance: the remaining frames. */
  flush(): MouthPacket[];
  /** Speech was cut off: drop everything not yet sent. */
  cancel(): void;
}

/** Plays speech that streams in as raw PCM, gaplessly, with the mouth worked out ahead of each piece. */
export declare class StreamVoice {
  constructor(face: SpeakingFace, audioContext: AudioContext, options?: StreamVoiceOptions);
  /** The node the voice plays through (connected to the speakers). */
  readonly out: GainNode;
  /** Called when a reply that end() closed has finished playing. */
  onEnd: (() => void) | null;
  readonly speaking: boolean;
  /** Samples of the reply heard so far, counted as pushed. */
  readonly position: number;
  /** How loud the voice is now, 0..1. */
  readonly level: number;
  /** The next piece: 16-bit PCM, or floats from -1 to 1, mono, at `sampleRate`. */
  push(pcm: Int16Array | Float32Array): void;
  /** The reply is all in: it finishes playing, then onEnd(). */
  end(): void;
  /** Cut it off now: silence, mouth shut. */
  stop(): void;
}

// --- the face ------------------------------------------------------------------------------------------------------

/** What `on()` reports: speech starting (text) and stopping (null), and each sentence as it's heard. */
export type FaceEvent = { type: 'speaking'; text: string | null } | { type: 'caption'; text: string };
/** Where the face is on the canvas, in CSS px: centre, top, bottom and width. */
export interface FaceBounds {
  cx: number;
  cy: number;
  top: number;
  bottom: number;
  w: number;
}
export interface FaceOptions {
  /** Settings, checked (a ConfigError names a bad one). */
  config?: FaceConfigPatch;
  /** Base URL of the skins/ and voices/ folders (default: ASSETS). */
  assets?: string;
  /** How much of the canvas the face fills, 0.5..1.2 (default 0.9). */
  fit?: number;
  /** Eyes and head follow the pointer over the whole window (default true). */
  follow?: boolean;
}
export interface FaceViewOptions {
  fit?: number;
  /** The config setting that zooms (default 'zoom'); null for a fixed framing. */
  zoomKey?: string | null;
  /** Answers the view's requests for a skin's picture and landmarks. */
  api?: (path: string) => Promise<Response | ImageBitmap>;
}

/** The engine's view of one face on a canvas: `face.view`. */
export declare class FaceView {
  constructor(canvas: HTMLCanvasElement, options?: FaceViewOptions);
  readonly canvas: HTMLCanvasElement;
  /** The mouth timeline, to feed mouth packets from a stream. */
  timeline: MouthTimeline;
  readonly speaking: boolean;
  /** Draw (the face starts itself). */
  start(): void;
  /** Stop drawing. */
  stop(): void;
  /** Look at CSS px (x, y) from the face's centre, y down, for 4 seconds; null looks ahead. */
  setPointer(x: number | null, y?: number | null): void;
  /** Sweep the skin on (1) or off (0) from the top down over `seconds` (default 1.6). */
  sweep(to: number, seconds?: number): Promise<void>;
  /** Where the face is, or null before it has been drawn. */
  bounds(): FaceBounds | null;
  /** Is CSS point (x, y) on the face (with a margin, default 8 px)? */
  hitTest(x: number, y: number, margin?: number): boolean;
  on(fn: (event: FaceEvent) => void): () => void;
  event(event: ViewEvent): void;
  /** Stop and free the GPU; the canvas can take a new face. */
  destroy(): void;
}

/** A talking face on a canvas. */
export declare class Wireface {
  constructor(canvas: HTMLCanvasElement, options?: FaceOptions);
  readonly canvas: HTMLCanvasElement;
  /** The assets folder's URL. */
  readonly assets: string;
  /** Every setting, as it is now. */
  readonly config: FaceConfig;
  /** The engine's view, for more than the API gives. */
  readonly view: FaceView;
  /** Change settings; returns the whole config. Throws ConfigError for anything invalid. */
  set(patch: FaceConfigPatch): FaceConfig;
  /** Wear a skin: a catalogue id, { image, landmarks, teeth? }, or null for the wireframe. */
  useSkin(skin: string | SkinInput | null, options?: { sweep?: number; teeth?: TeethStyle }): Promise<void>;
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
  /** Stop drawing and moving, until resume(). */
  pause(): void;
  resume(): void;
  /** The waiting spinner in the eyes, on or off. */
  spinner(on?: boolean): void;
  /** Glitch, then burn away from the chin up. */
  disappear(): Promise<void>;
  /** Come back, from the top down. */
  appear(): Promise<void>;
  /** Listen to its events; returns an unsubscribe function. */
  on(fn: (event: FaceEvent) => void): () => void;
  /** Stop, and let go of the page and the GPU. */
  destroy(): void;
}

/** The URL of the assets that come with the package (skins and voices). */
export declare const ASSETS: string;
/** A face on `canvas`. */
export declare function createFace(canvas: HTMLCanvasElement, options?: FaceOptions): Wireface;
