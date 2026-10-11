import type { LoadedCharacter } from './character.js';
export declare class WirefaceError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;
  readonly retryable: boolean;
  constructor(code: string, message: string, options?: { status?: number; requestId?: string; retryable?: boolean; cause?: unknown });
}
export type RiggingScope = 'rig:2d' | 'rig:3d';
export interface RiggingProgress {
  id: string;
  stage: 'queued' | 'preparing' | 'anchors' | 'landmarks' | 'fitting' | 'validating' | 'completed' | 'failed' | 'cancelled';
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  requestId: string;
}
export interface RiggingOptions {
  signal?: AbortSignal;
  onProgress?: (progress: RiggingProgress) => void;
  idempotencyKey?: string;
  name?: string;
  teeth?: 'normal' | 'braces' | 'vampire' | 'turkey' | 'sharp' | 'goofy' | 'anime' | 'cartoon' | 'clay' | 'comic' | 'pixel' | 'sketch';
}
export interface RiggingClient {
  rig2d(photo: Blob | string | URL, options?: RiggingOptions): Promise<LoadedCharacter>;
  rig3d(photo: Blob | string | URL, options?: RiggingOptions): Promise<LoadedCharacter>;
  createToken(options: { scope: RiggingScope[]; origin: string }): Promise<{ token: string; expiresAt: number }>;
}
export type RiggingClientOptions = ({ apiKey: string; getToken?: never } | { getToken: () => Promise<string>; apiKey?: never }) & {
  baseUrl?: string; fetch?: typeof fetch; retries?: number; pollInterval?: number; timeout?: number;
};
export declare function createRiggingClient(options: RiggingClientOptions): RiggingClient;
