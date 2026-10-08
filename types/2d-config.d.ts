// @wireface/sdk/2d/config: a 2D face's settings, their defaults and ranges, and the validator that checks them.
// "auto" settings follow the character's art style.

import type { TeethStyle } from './config.js';

/** contain: all of the picture; cover: fill the canvas; face: close in on the face. */
export type Framing = 'contain' | 'cover' | 'face';
/** lit: 3D lighting as the head turns; flat: none (drawings); auto: by art style. */
export type Shading = 'auto' | 'lit' | 'flat';
/** smooth, or pixel (no blur, for pixel art); auto: by art style. */
export type Smoothing = 'auto' | 'smooth' | 'pixel';
/** How the teeth are drawn: modelled arches, a picture of teeth, or none. */
export type TeethMode = 'rendered' | 'asset' | 'none';
/** A teeth picture: core's photographic ones, or the drawn ones. */
export type TeethStyle2D = TeethStyle | 'anime' | 'cartoon' | 'clay' | 'comic' | 'pixel' | 'sketch';
/** The settings that are numbers (each has a range in RANGES). */
export type NumberSetting2D =
  | 'zoom' | 'depth' | 'edge_pin' | 'feather' | 'teeth_width' | 'teeth_size' | 'motion' | 'expressiveness'
  | 'mouth_gain' | 'sync_offset_ms';

/** A 2D face's whole config, as validateConfig returns it. */
export interface Face2DConfig {
  /** A catalogue character's id, or null. */
  character: string | null;
  framing: Framing;
  /** 0.5..3, about the face. */
  zoom: number;
  /** How far the head turns in 3D: 0 (flat) to 1, or auto. */
  depth: number | 'auto';
  /** How firmly the face's outline holds to the picture behind it, 0..1. */
  edge_pin: number;
  /** How soft the face's edge is, in eye-widths, 0..1. */
  feather: number;
  shading: Shading;
  smoothing: Smoothing;
  teeth_mode: 'auto' | TeethMode;
  /** Which teeth picture, for asset mode. */
  teeth_style: 'auto' | TeethStyle2D;
  teeth_width: number;
  teeth_size: number;
  /** The inside of the mouth: '#rrggbb', or 'auto' (from the character's lips). */
  mouth_color: string;
  /** The head turns a little towards the pointer. */
  follow_mouse: boolean;
  /** Idle head motion, 0..2. */
  motion: number;
  /** How strongly expressions and gestures show, 0..2. */
  expressiveness: number;
  /** Lip-sync amplitude, 0.3..2. */
  mouth_gain: number;
  /** Positive: the mouth moves later (-200..200 ms). */
  sync_offset_ms: number;
  /** Draw the fitted mesh over the face. */
  show_mesh: boolean;
}

/** Part of a config, and (in a file) `$schema`. */
export type Face2DConfigPatch = Partial<Face2DConfig> & { $schema?: string };

export declare const FRAMINGS: readonly Framing[];
export declare const SHADINGS: readonly Shading[];
export declare const SMOOTHINGS: readonly Smoothing[];
/** The teeth_mode setting's choices, 'auto' included. */
export declare const TEETH_MODES: readonly ('auto' | TeethMode)[];
/** Every setting's default. */
export declare const DEFAULTS: Readonly<Face2DConfig>;
/** Every number setting's [min, max]. */
export declare const RANGES: Readonly<Record<NumberSetting2D, readonly [number, number]>>;
/** Every choice setting's choices. */
export declare const CHOICES: {
  readonly framing: readonly Framing[];
  readonly shading: readonly Shading[];
  readonly smoothing: readonly Smoothing[];
  readonly teeth_mode: readonly ('auto' | TeethMode)[];
  readonly teeth_style: readonly ('auto' | TeethStyle2D)[];
};

/** Thrown for a setting that is unknown or out of range; the message names it. */
export declare class ConfigError extends Error {}

/**
 * `base` (default: DEFAULTS) with `patch` applied. Throws ConfigError naming the setting for anything unknown or out
 * of range.
 */
export declare function validateConfig(patch?: Face2DConfigPatch, base?: Face2DConfig): Face2DConfig;
/** The settings that differ from DEFAULTS (what a config file needs to say). */
export declare function configDiff(config: Partial<Face2DConfig>): Partial<Face2DConfig>;
