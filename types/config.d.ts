// @wireface/sdk/config: a 3D face's settings, their defaults and ranges, and the validator that checks them.

/** How the face is drawn: a glowing wireframe, a shaded head, or a photo skin. */
export type Style = 'hologram' | 'sculpt' | 'photo';
/** The photographic teeth a photo skin shows. */
export type TeethStyle = 'normal' | 'braces' | 'vampire' | 'goofy' | 'sharp' | 'turkey';
/** A colour preset's name. */
export type Preset = 'cyan' | 'ember' | 'green' | 'amber' | 'violet' | 'rose' | 'ice';
/** The colours a face has. */
export type ColorName = 'primary' | 'secondary' | 'background' | 'skin' | 'iris' | 'lips' | 'mouth';
/** Every colour, as '#rrggbb'. */
export type Colors = Record<ColorName, string>;
/** The settings that are numbers (each has a range in RANGES). */
export type NumberSetting =
  | 'glow' | 'wire' | 'fill' | 'scanlines' | 'points' | 'edge_fade' | 'motion' | 'expressiveness' | 'mouth_gain'
  | 'sync_offset_ms' | 'zoom' | 'teeth_width' | 'teeth_size' | 'skin_amount';

/** A face's whole config, as validateConfig returns it. */
export interface FaceConfig {
  /** A catalogue skin's id (shown in photo style), or null. */
  skin: string | null;
  /** Wireframe (0) to skin (1). */
  skin_amount: number;
  style: Style;
  colors: Colors;
  /** Bloom around the wireframe, 0..2. */
  glow: number;
  /** Wireframe line strength, 0..1. */
  wire: number;
  /** Surface fill behind the lines, 0..1. */
  fill: number;
  scanlines: number;
  /** Dots on the vertices, 0..1. */
  points: number;
  /** Soft edge around the face, 0..1. */
  edge_fade: number;
  /** Eyeballs with irises (false: hollow hologram eyes). */
  eyes: boolean;
  teeth_style: TeethStyle;
  teeth_width: number;
  teeth_size: number;
  /** Eyes and head follow the pointer. */
  follow_mouse: boolean;
  /** Idle head motion, 0..2. */
  motion: number;
  /** How strongly expressions and gestures show, 0..2. */
  expressiveness: number;
  /** Lip-sync amplitude, 0.3..2. */
  mouth_gain: number;
  /** Positive: the mouth moves later (-200..200 ms). */
  sync_offset_ms: number;
  zoom: number;
}

/** Part of a config: any settings, a colour `preset`, and (in a file) `$schema`. */
export type FaceConfigPatch = Partial<Omit<FaceConfig, 'colors'>> & {
  colors?: Partial<Colors>;
  preset?: Preset;
  $schema?: string;
};

/** The styles, in order. */
export declare const STYLES: readonly Style[];
/** The teeth styles, in order. */
export declare const TEETH_STYLES: readonly TeethStyle[];
/** Colour sets: primary (the wireframe and its glow), secondary (the rim) and a background for the page. */
export declare const PRESETS: Readonly<Record<Preset, { readonly primary: string; readonly secondary: string; readonly background: string }>>;
/** Every setting's default. */
export declare const DEFAULTS: Readonly<FaceConfig> & { readonly colors: Readonly<Colors> };
/** Every number setting's [min, max]. */
export declare const RANGES: Readonly<Record<NumberSetting, readonly [number, number]>>;

/** Thrown for a setting that is unknown or out of range; the message names it. */
export declare class ConfigError extends Error {}

/**
 * `base` (default: DEFAULTS) with `patch` applied. Throws ConfigError naming the setting for anything unknown or out
 * of range.
 */
export declare function validateConfig(patch?: FaceConfigPatch, base?: FaceConfig): FaceConfig;
