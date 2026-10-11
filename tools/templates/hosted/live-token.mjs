// Optional Gemini Live example. This is independent of Wireface hosted rigging.
import { readFile } from 'node:fs/promises';
import { liveSetup, LIVE_MODEL } from './live-setup.js';

export function createLiveHandler({ root, key = '', model = LIVE_MODEL, fetchImpl = fetch }) {
  let active = 0;
  return async (req, reply) => {
    if (!key) return reply(503, { error: 'Set GEMINI_API_KEY in the backend environment for this conversation example.' });
    if (active >= 2) return reply(429, { error: 'Two token requests are already in progress.' });
    if (String(req.headers['content-type']).split(';')[0] !== 'application/json') return reply(415, { error: 'Expected JSON.' });
    active++;
    try {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 8000) return reply(413, { error: 'Token request too large.' });
        chunks.push(chunk);
      }
      let ask;
      try { ask = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply(400, { error: 'Invalid JSON.' }); }
      if (!ask || typeof ask !== 'object' || Array.isArray(ask)) return reply(400, { error: 'Expected an object.' });
      const cast = JSON.parse(await readFile(new URL('assets/2d/characters/characters.json', root), 'utf8'));
      const known = cast.find(c => c.id === ask.character);
      const clean = (s, n) => typeof s === 'string' ? s.replace(/[\u0000-\u001f]/g, ' ').slice(0, n) : '';
      const name = known?.name || clean(ask.name, 40) || 'a character';
      const voice = known?.voice || 'Zephyr';
      const persona = known?.persona || clean(ask.persona, 1200);
      const maxSeconds = 600, now = Date.now();
      const stamp = seconds => new Date(now + seconds * 1000).toISOString();
      const response = await fetchImpl('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
        method: 'POST', signal: AbortSignal.timeout(20000),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ uses: 1, expireTime: stamp(maxSeconds + 30), newSessionExpireTime: stamp(60),
          bidiGenerateContentSetup: liveSetup({ model, name, voice, persona, maxSeconds }) }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.name !== 'string') return reply(502, { error: 'Gemini could not issue a conversation token.' });
      return reply(200, { token: data.name, model, voice, expires: stamp(60), maxSeconds });
    } catch { return reply(502, { error: 'Conversation token request failed.' }); }
    finally { active--; }
  };
}
