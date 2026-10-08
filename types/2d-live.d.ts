// @wireface/sdk/2d/live: talking with a character through Gemini Live, from the browser.
//
//   import { Conversation } from '@wireface/sdk/2d/live';
//   const talk = new Conversation(face, { audio: () => audioContext, character: () => ({ character: 'ava' }) });
//   await talk.start();  talk.send('hello');  await talk.setMic(true);  talk.end();

import type { FaceState, SpeakingFace } from './index.js';

/** Why a conversation ended: you ended it, its time ran out, it sat quiet, you left the page, or Gemini closed it. */
export type EndReason = 'user' | 'cap' | 'idle' | 'left' | 'away';
/** Where a conversation is. */
export type ConversationState = 'off' | 'connecting' | 'ready' | 'thinking' | 'speaking' | 'ended' | 'error';
/** What onState reports on every change. */
export interface ConversationStatus {
  state: ConversationState;
  /** More about it ('Connecting...', an error, why it ended), or ''. */
  detail: string;
  /** Seconds left. */
  left: number;
  /** The microphone is on. */
  mic: boolean;
}
/** A line so far: the character's ('face') or the person's ('you'); '' clears it. */
export interface ConversationCaption {
  who: 'face' | 'you';
  text: string;
}
/** Who to talk with, as the token endpoint is asked: a catalogue character, or one of your own. */
export interface ConversationCharacter {
  character?: string;
  name?: string;
  voice?: string;
  persona?: string;
}
/** A face a conversation can drive: core's Wireface, Wireface 2D's, or a three.js FaceMesh. */
export interface ConversationFace extends SpeakingFace {
  state(name: FaceState): void;
  express(name: string, seconds?: number): unknown;
  appear(): unknown;
  disappear(): unknown;
}
export interface ConversationOptions {
  /** The AudioContext, made on a click (browsers need one before sound). */
  audio: () => AudioContext | Promise<AudioContext>;
  /** What to ask the token endpoint for. */
  character?: () => ConversationCharacter;
  /** The token endpoint (default '/api/live/token'), or null with apiKey. */
  token?: string | null;
  /** Local development only: a key held in memory, instead of a token endpoint. */
  apiKey?: string | (() => string | null | undefined) | null;
  /** The Live model, with apiKey. */
  model?: string;
  /** What to cue the character with when the session opens ('' waits for the person). */
  greet?: string;
  /** The longest conversation, in seconds (default 300; the token's own limit wins). */
  maxSeconds?: number;
  /** How long it can sit quiet before it ends, in seconds (default 120). */
  idleSeconds?: number;
  /** The microphone worklet's URL (default MIC_WORKLET). */
  micWorklet?: string;
  onState?: (status: ConversationStatus) => void;
  onCaption?: (caption: ConversationCaption) => void;
}

/** The URL of the microphone worklet that comes with the package. */
export declare const MIC_WORKLET: string;
/** The default cue when a session opens: greet the person and ask them something. */
export declare const GREET: string;
/** What each ending says. */
export declare const ENDINGS: Readonly<Record<EndReason, string>>;

/** A Gemini Live conversation with a face: its voice, captions, expressions, interruptions and the microphone. */
export declare class Conversation {
  constructor(face: ConversationFace, options: ConversationOptions);
  readonly face: ConversationFace;
  readonly state: ConversationState;
  readonly detail: string;
  /** The conversation so far. */
  readonly history: readonly ConversationCaption[];
  /** Connecting, or open. */
  readonly live: boolean;
  /** Seconds left. */
  readonly left: number;
  /** Open a session (after a click: it needs sound). `then` is text to send once it's open; without, it greets. */
  start(options?: { then?: string | null }): Promise<void>;
  /** Say something to the character (it starts the session if needed). */
  send(text: string): void | Promise<void>;
  /** Turn the microphone on or off (on starts the session if needed). */
  setMic(on: boolean): Promise<void>;
  /** A new character was put on: it carries the conversation on in a new voice. */
  changeFace(name: string): void;
  /** Stop the character talking at once. */
  interrupt(): void;
  /** End the session. */
  end(why?: EndReason, detail?: string): void;
  /** End it and let go of the page. */
  destroy(): void;
}
