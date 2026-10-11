import type { LoadedCharacter } from './character.js';
import type { MediaPipePaths } from './index.js';
import type { RiggingClient, RiggingOptions } from './rigging.js';

export interface CreateOptions extends RiggingOptions {
  /** '3d' fits the mesh to the face; '2d' animates the picture in place. Default '3d'. */
  kind?: '2d' | '3d';
  /**
   * 'auto' (default): on the device; a 2D picture with no face MediaPipe can find goes to the hosted service.
   * 'local': on the device only. 'hosted': straight to the hosted service (needs `rigging`).
   */
  detector?: 'auto' | 'local' | 'hosted';
  /** A hosted rigging client, for drawn and stylised faces that need AI detection on wireface.dev. */
  rigging?: RiggingClient;
  /** Where MediaPipe loads from, when you host its files yourself. */
  mediapipe?: Partial<MediaPipePaths>;
  /** 468 known [x, y] landmarks (0..1 of the picture) instead of detection. */
  landmarks?: [number, number][];
  /** A 2D character's art style. Default 'photo' when made on the device. */
  artStyle?: string;
}

/** A playable character from a picture: made on the device when MediaPipe finds the face, otherwise hosted. */
export declare function createCharacter(photo: Blob | string | URL, options?: CreateOptions): Promise<LoadedCharacter>;
