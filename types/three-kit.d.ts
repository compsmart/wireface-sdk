// @wireface/sdk/three/kit: what the cast is made of. Toy-figure materials and shapes, hair and ears that fit a
// FaceMesh's head, and Character, which gives a figure its idle life and talking gestures. Sizes are in metres;
// figures stand on y = 0 and face +z.

import type {
  BufferGeometry, CapsuleGeometry, ColorRepresentation, CylinderGeometry, Group, LatheGeometry, Material, Mesh,
  MeshBasicMaterial, MeshPhysicalMaterial, MeshPhysicalMaterialParameters, MeshStandardMaterial,
  MeshStandardMaterialParameters, Object3D, SphereGeometry, Vector3,
} from 'three';
import type { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { LoadedClip } from './index.js';
import type { FaceMesh, FaceScreen, ScreenEngine } from './three.js';

// --- materials -----------------------------------------------------------------------------------------------------

/** Soft, matte modelling clay. */
export declare function clay(color: ColorRepresentation, params?: MeshStandardMaterialParameters): MeshStandardMaterial;
/** Glossy vinyl, like a designer toy. */
export declare function vinyl(color: ColorRepresentation, params?: MeshPhysicalMaterialParameters): MeshPhysicalMaterial;
/** Brushed metal. */
export declare function metal(color: ColorRepresentation, params?: MeshStandardMaterialParameters): MeshStandardMaterial;
/** Fabric: rough, with a touch of sheen. */
export declare function cloth(color: ColorRepresentation, params?: MeshPhysicalMaterialParameters): MeshPhysicalMaterial;
/** Something that gives off light (unlit, so bloom picks it up). */
export declare function glow(color: ColorRepresentation, strength?: number): MeshBasicMaterial;
/** Clear glass: reflections and a faint tint. */
export declare function glass(color?: ColorRepresentation, params?: MeshPhysicalMaterialParameters): MeshPhysicalMaterial;

// --- shapes --------------------------------------------------------------------------------------------------------

export interface PartOptions {
  rotation?: readonly [number, number, number];
  scale?: number | readonly [number, number, number];
  name?: string;
  /** Cast and receive shadows (default true). */
  shadow?: boolean;
}
/** A mesh that casts and receives shadows, placed at [x, y, z]. */
export declare function part<G extends BufferGeometry, M extends Material | Material[]>(
  geometry: G, material: M, at?: readonly [number, number, number], options?: PartOptions,
): Mesh<G, M>;
export declare function capsule(radius: number, length: number): CapsuleGeometry;
export declare function ball(radius: number, widthSegments?: number, heightSegments?: number): SphereGeometry;
/** A box with rounded edges (radius `r`, default 0.02). */
export declare function box(width: number, height: number, depth: number, r?: number): RoundedBoxGeometry;
export declare function tube(radiusTop: number, radiusBottom: number, height: number, segments?: number, open?: boolean): CylinderGeometry;
/** A surface of revolution from [radius, y] points, bottom to top. */
export declare function lathe(points: readonly (readonly [number, number])[], segments?: number): LatheGeometry;
/** A smooth lathe through a few [radius, y] points. */
export declare function smoothLathe(points: readonly (readonly [number, number])[], segments?: number, samples?: number): LatheGeometry;

// --- hair and ears for a FaceMesh head -----------------------------------------------------------------------------

/** A cap of hair over a FaceMesh's skull, on face.head. `front` (0..1) brings a fringe down over the forehead. */
export declare function hairCap(face: FaceMesh, material: Material, options?: {
  cover?: number; tilt?: number; puff?: number; front?: number; segments?: number;
}): Mesh;
/** Hair round the back and sides of a FaceMesh head, down to `length` (0: the ears, 1: the chin, 1.6: the shoulders). */
export declare function hairFall(face: FaceMesh, material: Material, options?: {
  length?: number; open?: number; puff?: number; flare?: number;
}): Mesh;
/** Two ears at the sides of a FaceMesh head, in its skin's colour; `point` makes them elfin. */
export declare function ears(face: FaceMesh, options?: { size?: number; point?: number; material?: Material }): Mesh[];

// --- a character ---------------------------------------------------------------------------------------------------

/** A character's recorded line: an engine's voice ('3d' or '2d') and expression cues along it ([seconds, name]). */
export interface CharacterLine {
  engine?: ScreenEngine;
  id: string;
  cues?: readonly (readonly [number, string])[];
}
/** What a Character is made from. */
export interface CharacterDef {
  id: string;
  name: string;
  /** Its height in metres (default 1.3). */
  height?: number;
  line: CharacterLine;
}

/**
 * A figure with a face. The builders set its parts: `body` (breathes), `arms` (gesture as it talks), `head` (turns to
 * look at things) and `face` (a FaceMesh or a FaceScreen).
 */
export declare class Character {
  constructor(def: CharacterDef);
  readonly def: CharacterDef;
  readonly id: string;
  readonly name: string;
  /** Add it to your scene. */
  readonly root: Group;
  readonly body: Group;
  arms: Object3D[];
  head: Object3D | null;
  face: FaceMesh | FaceScreen<ScreenEngine> | null;
  /** For a FaceScreen: the head to turn towards what it looks at. */
  turnHead: Object3D | null;
  /** Run every frame (antennae, a ghost's hem...). */
  extras: ((dt: number, t: number, character: Character) => void)[];
  /** A line to say instead of the one it was built with. */
  lineOverride?: CharacterLine | null;
  /** Look at a world-space point or an Object3D, or null. */
  gazeAt(target: Object3D | Vector3 | null): this;
  /** Where it talks from, in world space: above its head. */
  top(out?: Vector3): Vector3;
  /** Its recorded line, with its cues. */
  line(): Promise<{ clip: LoadedClip; cues: readonly (readonly [number, string])[] }>;
  /** Say its line, with its cues; heard if you pass an AudioContext. Resolves when it's finished. */
  speak(options?: { audioContext?: AudioContext | null; onCaption?: ((text: string) => void) | null }): Promise<void>;
  /** Stop talking: the line it's saying, its cues, and a line still loading. */
  hush(): void;
  /** One frame: `dt` and `t` in seconds. */
  update(dt: number, t: number): void;
  /** Free the face, and the figure's geometries, materials and textures. */
  dispose(): void;
}

/** A toy figure's legs, torso, arms and hands, coloured. Returns the torso, its top and the shoulders' height. */
export declare function toyBody(character: Character, options?: {
  top?: Material; bottom?: Material; shoes?: Material; skin?: Material;
  chest?: number; hips?: number; height?: number; armLength?: number; hands?: boolean;
}): { torso: Mesh; torsoTop: number; shoulderY: number };
/** A neck from `from` up to `headY`, in `skin`. */
export declare function neck(character: Character, skin: Material, from: number, headY: number, radius?: number): void;
/** An empty head group at `y`: the face goes in it, and it's what nods and turns. */
export declare function headAt(character: Character, y: number): Group;
