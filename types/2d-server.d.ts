// @wireface/sdk/2d/server: the server side of Wireface 2D, for Node 18+. It holds the Gemini API key, so the browser
// never sees it, and answers POST /api/detect, POST /api/live/token, POST /api/generate and GET /api/status.
//
//   import http from 'node:http';
//   import { createApi } from '@wireface/sdk/2d/server';
//   const api = createApi({ key: process.env.GEMINI_API_KEY, hosts: ['example.com'], origins: ['https://example.com'] });
//   http.createServer(async (req, res) => { if (await api.handle(req, res)) return; ... });
//
// The request and response are typed by what the API uses of them, so Node's IncomingMessage and ServerResponse fit.

/** An incoming request (node:http's IncomingMessage fits). */
export interface ApiRequest {
  readonly url?: string;
  readonly method?: string;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly socket?: { readonly remoteAddress?: string } | null;
  on(event: 'data', listener: (chunk: Uint8Array) => void): unknown;
  on(event: 'end', listener: () => void): unknown;
  on(event: 'error', listener: (error: Error) => void): unknown;
  destroy(error?: Error): unknown;
}
/** A response (node:http's ServerResponse fits). */
export interface ApiResponse {
  readonly destroyed?: boolean;
  readonly writableEnded?: boolean;
  writeHead(statusCode: number, headers?: Record<string, string>): unknown;
  end(body?: string): unknown;
  on?(event: 'close', listener: () => void): unknown;
  off?(event: 'close', listener: () => void): unknown;
}
/** What createApi uses to call Gemini: fetch, or a stand-in for tests. */
export type FetchLike = (url: string, init: {
  method: string;
  headers: Record<string, string>;
  body: string;
  signal: AbortSignal;
}) => Promise<{ readonly ok: boolean; readonly status: number; json(): Promise<any> }>;

export interface ApiOptions {
  /** The Gemini API key; without it every route but /api/status answers 503. */
  key?: string;
  /** Detection models in order of preference. */
  detectModels?: readonly string[];
  /** The Live model for conversations. */
  liveModel?: string;
  /** The image model for new characters. */
  imageModel?: string;
  /** The package folder, where assets/characters/characters.json is (default: this package's own). */
  root?: string;
  /** Take a persona from the browser for characters not in the catalogue (default false). */
  customPersona?: boolean;
  /** The Origins allowed to call; without it, a request whose Origin isn't its own Host is refused. */
  origins?: readonly string[];
  /** The Host headers answered, against DNS rebinding. */
  hosts?: readonly string[];
  /** Requests per client per route per day (default 300). */
  perDay?: number;
  /** Requests per route per day from everyone together (default 1000). */
  globalPerDay?: number;
  /** Behind a reverse proxy: the client is X-Real-IP, or the last X-Forwarded-For (default false). */
  trustProxy?: boolean;
  /** How long a request may wait for Gemini, in ms (default 90000). */
  timeoutMs?: number;
  /** The longest conversation a token allows, in seconds (default 600). */
  maxSeconds?: number;
  /** Calls Gemini (default: fetch). */
  fetchImpl?: FetchLike;
}
/** The API: mount it in any Node HTTP server. */
export interface WirefaceApi {
  /** It has a key. */
  readonly enabled: boolean;
  /** Answer `req` if it's one of ours (under /api/); resolves true if it was. */
  handle(req: ApiRequest, res: ApiResponse): Promise<boolean>;
}

/** The base persona every character gets, before its own. */
export declare const PERSONA: string;
/** The tools a character's Live session gets: express, go_away and come_back. */
export declare const TOOLS: readonly { readonly functionDeclarations: readonly object[] }[];
/** The API, for a key and its limits. */
export declare function createApi(options?: ApiOptions): WirefaceApi;
