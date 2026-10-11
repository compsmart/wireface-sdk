export interface BakedEye {
  center: number[];
  radius: number;
  width: number;
  lidSet: Set<number>;
}
export interface BakedRig {
  count: 468;
  channels: string[];
  base: Float32Array;
  uvs: Float32Array;
  deltas: Float32Array[];
  jawW: Float32Array;
  pivot: number[];
  eyes: { R: BakedEye; L: BakedEye };
  mouth: { center: number[]; pivot: number[]; halfW: number; zFront: number; seamY: number };
  skin: Uint16Array;
  caps: { mouth: number[]; eyeR: number[]; eyeL: number[] };
  masks: Record<'edge' | 'lips' | 'brows' | 'cheeks' | 'socket', Float32Array>;
}
export interface PreparedTransfer {
  n: 468;
  aspect: number;
  eyeDist: number;
  unit: number;
  mouthWasOpen: number;
  uvs: Float32Array;
  rest: Float32Array;
  J: Float32Array;
  edge: Float32Array;
  base: Float32Array;
  restLight: Float32Array;
  mouthQ: Float32Array;
  mouthB: Float32Array;
  mouthJ: Float32Array;
}
export interface LoadedCharacter {
  format: 'wireface';
  version: 1;
  kind: '3d' | '2d';
  name: string;
  width: number;
  height: number;
  rig: BakedRig;
  texture: string | null;
  notices: string[];
  render: { style: 'photo' | 'hologram' | 'sculpt' | 'toon'; teeth: string; artStyle?: string; teethMode?: 'asset' | 'flat' | 'none' };
  transfer?: PreparedTransfer;
}
export interface CharacterTransition { transition?: number }
export declare const CHARACTER_VERSION: 1;
export declare function loadCharacter(input: string | URL | Blob | ArrayBuffer): Promise<LoadedCharacter>;

export declare function exportCharacter(character: LoadedCharacter): Promise<Blob>;
