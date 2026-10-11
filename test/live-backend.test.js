import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createLiveHandler } from '../examples/hosted/live-token.mjs';

const request = body => Object.assign(Readable.from([Buffer.from(JSON.stringify(body))]), { headers: { 'content-type': 'application/json' } });
test('optional live example issues one-use character tokens without exposing the provider key', async () => {
  let posted, result;
  const handle = createLiveHandler({ root: new URL('../', import.meta.url), key: 'mock-provider-key', fetchImpl: async (_, options) => {
    assert.equal(options.headers['x-goog-api-key'], 'mock-provider-key');
    posted = JSON.parse(options.body);
    return new Response(JSON.stringify({ name: 'auth_tokens/mock' }));
  } });
  await handle(request({ character: 'sora' }), (status, data) => { result = { status, data }; });
  assert.equal(result.status, 200);
  assert.equal(posted.uses, 1);
  assert.equal(posted.bidiGenerateContentSetup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Leda');
  assert.ok(posted.bidiGenerateContentSetup.systemInstruction.parts[0].text.includes('Sora'));
  assert.ok(!JSON.stringify(result).includes('mock-provider-key'));
});
test('optional live example rejects absent credentials and oversized requests without provider calls', async () => {
  const results = [];
  const reply = (status, data) => results.push({ status, data });
  await createLiveHandler({ root: new URL('../', import.meta.url) })(request({}), reply);
  await createLiveHandler({ root: new URL('../', import.meta.url), key: 'mock', fetchImpl: () => assert.fail('No provider call expected') })(request({ persona: 'x'.repeat(9000) }), reply);
  assert.deepEqual(results.map(r => r.status), [503, 413]);
});
