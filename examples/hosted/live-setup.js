/*! Wireface | Required Notice: Copyright 2026 Compsmart (https://wireface.dev) | Wireface SDK Licence; free local use including commercial: https://wireface.dev/license/ */
// What a character's Gemini Live session is set up with: the persona, the voice and the tools that let it move its own
// face. Shared by the server (which locks a token to it, see live-token.mjs) and by live.js when it connects with a key
// directly in development.
import { MOODS } from '../../dist/2d.js';

export const LIVE_MODEL = 'gemini-3.8-live';

/** The base persona every character gets, before its own. */
export const PERSONA = `You are a character in a picture, brought to life in a web browser by Wireface 2D: your face
moves, blinks and lip-syncs as you talk. Everything you say is spoken aloud, so keep it brief and natural: one to three
short sentences, plain words, no lists, no markdown. Stay in character and keep it friendly and suitable for everyone.
You can't see the person, their screen or the web, and you don't remember anything after this conversation. Use the
express tool to show feelings on your face as you speak, now and then, when they fit.`;

/** The tools the face understands (the same as wireface.dev's Try page). */
export const TOOLS = [{
  functionDeclarations: [
    {
      name: 'express', description: 'Show a feeling on your face for a few seconds, as you say something it fits.',
      parameters: {
        type: 'OBJECT', required: ['name'], properties: {
          name: { type: 'STRING', enum: MOODS, description: 'the feeling' },
          seconds: { type: 'NUMBER', description: 'how long to show it, 2 to 8 (default 4)' },
        },
      },
      behavior: 'NON_BLOCKING',
    },
    { name: 'go_away', description: 'Vanish from the page in a burst of embers. Only when asked to go away.', behavior: 'NON_BLOCKING' },
    { name: 'come_back', description: 'Reappear after going away, when asked to come back.', behavior: 'NON_BLOCKING' },
  ],
}];

/** The persona for a character: the base, then who they are. */
export const personaFor = ({ name = 'a character', persona = '', maxSeconds = 600 } = {}) =>
  `${PERSONA}\n\nYou are ${name}. ${persona}`.trim() + `\nThe conversation lasts at most ${Math.round(maxSeconds / 60)} minutes.`;

/** The whole BidiGenerateContentSetup for a character. */
export function liveSetup({ model = LIVE_MODEL, voice = 'Zephyr', ...who } = {}) {
  return {
    model: model.startsWith('models/') ? model : `models/${model}`,
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
    systemInstruction: { parts: [{ text: personaFor(who) }] },
    tools: TOOLS, inputAudioTranscription: {}, outputAudioTranscription: {},
  };
}
