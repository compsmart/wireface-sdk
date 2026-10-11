import { loadCharacter } from '@wireface/core/character';

export class WirefaceError extends Error {
  constructor(code, message, { status = 0, requestId, retryable = false, cause } = {}) {
    super(message, { cause }); this.name = 'WirefaceError';
    Object.assign(this, { code, status, requestId, retryable });
  }
}
// getRandomValues also works on HTTP development origins where randomUUID is unavailable.
const newId = () => globalThis.crypto.randomUUID?.() || Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
const aborted = () => new WirefaceError('cancelled', 'Character creation was cancelled.');
function cancellable(promise, signal) {
  return new Promise((resolve, reject) => {
    const stop = () => reject(aborted());
    if (signal?.aborted) return reject(aborted());
    signal?.addEventListener('abort', stop, { once: true });
    Promise.resolve(promise).then(resolve, reject).finally(() => signal?.removeEventListener('abort', stop));
  });
}
const sleep = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) return reject(aborted());
  const stop = () => { clearTimeout(timer); reject(aborted()); };
  const timer = setTimeout(() => { signal?.removeEventListener('abort', stop); resolve(); }, ms);
  signal?.addEventListener('abort', stop, { once: true });
});
async function limitedBody(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) throw new WirefaceError('response_too_large', 'Response exceeds the size limit.');
  const chunks = []; let size = 0;
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new WirefaceError('response_too_large', 'Response exceeds the size limit.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Uint8Array(await new Blob(chunks).arrayBuffer());
}

/** Optional network client. Playback and local mapping never import or call this module. */
export function createRiggingClient({ apiKey, getToken, baseUrl = 'https://wireface.dev/api/rigging/v1',
  fetch: request = globalThis.fetch, retries = 2, pollInterval = 1000, timeout = 180000 } = {}) {
  if ((!apiKey === !getToken) || (apiKey && typeof apiKey !== 'string') || (getToken && typeof getToken !== 'function'))
    throw new TypeError('Provide exactly one of apiKey (server) or getToken (browser).');
  if (apiKey && typeof window !== 'undefined') throw new TypeError('Keep permanent SDK keys on your backend; use getToken in browsers.');
  const base = new URL(baseUrl);
  if ((base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))) || base.username || base.password || base.search || base.hash)
    throw new TypeError('Use an HTTPS service URL (HTTP is allowed on localhost).');
  if (!Number.isInteger(retries) || retries < 0 || retries > 3 || !Number.isFinite(pollInterval) || pollInterval < 10 || !Number.isFinite(timeout) || timeout < 1 || timeout > 600000)
    throw new TypeError('Invalid retry, polling or timeout settings.');
  const root = base.href.replace(/\/$/, '');

  async function call(path, { method = 'GET', body, signal, idempotencyKey } = {}) {
    for (let attempt = 0;; attempt++) {
      if (signal?.aborted) throw aborted();
      try {
        let token;
        try { token = apiKey || await cancellable(getToken(), signal); }
        catch (cause) { if (signal?.aborted) throw aborted(); throw new WirefaceError('unauthorized', cause.message || 'Could not authorise rigging.', { cause }); }
        if (typeof token !== 'string' || !token) throw new WirefaceError('unauthorized', 'Could not authorise rigging.');
        const response = await request(root + path, { method, signal, credentials: 'omit', redirect: 'error',
          headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) }, body: body ? JSON.stringify(body) : undefined });
        let data;
        try { data = JSON.parse(new TextDecoder().decode(await limitedBody(response, 32 * 1024 * 1024))); }
        catch (cause) { if (cause instanceof WirefaceError) throw cause;
          throw new WirefaceError('invalid_response', 'The rigging service returned an incomplete response.', { retryable: true, cause }); }
        if (!response.ok) throw new WirefaceError(data.error?.code || 'service_error', data.error?.message || 'Rigging request failed.',
          { status: response.status, requestId: data.requestId || response.headers.get('x-request-id'), retryable: [429, 502, 503, 504].includes(response.status) });
        return data;
      } catch (cause) {
        if (signal?.aborted) throw aborted();
        const error = cause instanceof WirefaceError ? cause : new WirefaceError('network_error', 'Could not reach Wireface.', { retryable: true, cause });
        if (!error.retryable || attempt >= retries) throw error;
        await sleep(Math.min(4000, 250 * 2 ** attempt), signal);
      }
    }
  }
  async function rig(kind, photo, { signal, onProgress, idempotencyKey = newId(), name = 'Your character', teeth = 'normal' } = {}) {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    let timedOut = false, jobId;
    const timer = setTimeout(() => { timedOut = true; cancel(); }, timeout);
    try {
      let blob = photo;
      if (typeof photo === 'string' || photo instanceof URL) {
        const response = await request(photo, { signal: controller.signal, credentials: 'omit' });
        if (!response.ok) throw new WirefaceError('image_download_failed', `Could not download the image (${response.status}).`);
        blob = new Blob([await limitedBody(response, 12 * 1024 * 1024)], { type: response.headers.get('content-type')?.split(';')[0] || '' });
      }
      if (!(blob instanceof Blob) || blob.size === 0 || blob.size > 12 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(blob.type))
        throw new WirefaceError('invalid_image', 'Choose a JPEG, PNG or WebP up to 12 MB.');
      const bytes = new Uint8Array(await blob.arrayBuffer()); let binary = '';
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      let job = await call(`/${kind}`, { method: 'POST', signal: controller.signal, idempotencyKey,
        body: { image: `data:${blob.type};base64,${btoa(binary)}`, name, teeth } });
      if (!/^[a-f0-9]{32}$/.test(job.id || '')) throw new WirefaceError('invalid_response', 'The service returned an invalid job.');
      jobId = job.id;
      for (;;) {
        if (controller.signal.aborted) throw aborted();
        onProgress?.({ id: job.id, stage: job.stage, status: job.status, requestId: job.requestId });
        if (job.status === 'completed') {
          try { return await loadCharacter(new Blob([JSON.stringify(job.character)])); }
          catch (cause) { throw new WirefaceError('invalid_character', 'The service returned an invalid character.', { requestId: job.requestId, cause }); }
        }
        if (job.status === 'failed' || job.status === 'cancelled') throw new WirefaceError(job.error?.code || job.status,
          job.error?.message || 'Character creation failed.', { requestId: job.requestId });
        if (!['queued', 'processing'].includes(job.status)) throw new WirefaceError('invalid_response', 'Unknown job status.');
        await sleep(pollInterval, controller.signal);
        job = await call(`/jobs/${jobId}`, { signal: controller.signal });
      }
    } catch (error) {
      if (controller.signal.aborted && jobId) {
        const cleanup = new AbortController(), end = setTimeout(() => cleanup.abort(), 3000);
        try { await call(`/jobs/${jobId}`, { method: 'DELETE', signal: cleanup.signal }); } catch {} finally { clearTimeout(end); }
      }
      if (timedOut) throw new WirefaceError('timeout', 'Character creation timed out; retry with the same idempotency key to check the request.');
      if (signal?.aborted) throw aborted();
      throw error;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  }
  return Object.freeze({
    rig2d: (photo, options) => rig('2d', photo, options),
    rig3d: (photo, options) => rig('3d', photo, options),
    createToken: async ({ scope, origin } = {}) => {
      if (!apiKey) throw new TypeError('Only application backends can issue browser tokens.');
      return call('/tokens', { method: 'POST', body: { scope, origin }, signal: AbortSignal.timeout(10000) });
    },
  });
}
