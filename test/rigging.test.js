import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRiggingClient, WirefaceError } from '../dist/rigging.js';
const id = 'a'.repeat(32), requestId = 'request-1';
const blob = new Blob(['image'], { type: 'image/png' });
const character = JSON.parse(readFileSync(new URL('../assets/skins/sarah.wireface.json', import.meta.url)));
const completed = { id, requestId, status: 'completed', stage: 'completed', character };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status });
const client = fetch => createRiggingClient({ apiKey: 'wf_sk_test', fetch, pollInterval: 10 });
test('retrying an interrupted submission retains idempotency; result validates locally', async () => {
  const calls = []; let n = 0;
  const c = client(async (url, options) => { calls.push(options); if (!n++) throw new TypeError('interrupted'); return reply(completed); });
  const stages = []; const result = await c.rig3d(blob, { onProgress: p => stages.push(p.stage) });
  assert.equal(result.kind, '3d'); assert.equal(calls.length, 2);
  assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
  assert.deepEqual(stages, ['completed']);
});
test('interrupted result is retried; attempts remain bounded', async () => {
  let n = 0;const c = client(async () => ++n === 1 ? new Response('{') : reply(completed));
  assert.equal((await c.rig3d(blob)).name, character.name); assert.equal(n,2);
  n=0;await assert.rejects(client(async()=>{n++;return reply({error:{code:'provider_unavailable',message:'Retry later'},requestId},503);}).rig3d(blob), e=>e instanceof WirefaceError && e.code==='provider_unavailable' && e.requestId===requestId);
  assert.equal(n,3);
});
test('revocation, failed job and malformed character are typed errors', async () => {
  for (const [value,status,code] of [[{error:{code:'key_revoked',message:'Revoked'},requestId},401,'key_revoked'],
    [{id,status:'failed',error:{code:'poor_anchors',message:'Use a clearer image'},requestId},200,'poor_anchors'],
    [{...completed,character:{}},200,'invalid_character']]) {
    let n=0;await assert.rejects(client(async()=>{n++;return reply(value,status);}).rig2d(blob),e=>e instanceof WirefaceError && e.code===code);
    assert.equal(n,1);
  }
});
test('cancellation cancels accepted server job and never delivers a character', async () => {
 const controller=new AbortController(),methods=[];
 const c=client(async(url,o)=>{methods.push(o.method);return reply({id,status:o.method==='DELETE'?'cancelled':'processing',stage:'anchors',requestId});});
 await assert.rejects(c.rig3d(blob,{signal:controller.signal,onProgress:()=>controller.abort()}),e=>e.code==='cancelled');
 assert.deepEqual(methods,['POST','DELETE']);
});
test('cancellation and timeout interrupt a pending token callback', async () => {
 const controller=new AbortController();const c=createRiggingClient({getToken:()=>new Promise(()=>{}),timeout:30});
 await assert.rejects(c.rig3d(blob),e=>e.code==='timeout');
 const pending=c.rig3d(blob,{signal:controller.signal});controller.abort();await assert.rejects(pending,e=>e.code==='cancelled');
});
test('client-side image download sends no permanent key and validates inputs', async () => {
 const seen=[];const c=client(async(url,o)=>{seen.push([url,o]);return seen.length===1?new Response(blob,{headers:{'Content-Type':'image/png'}}):reply(completed);});
 await c.rig3d('https://images.example/photo.png');assert.equal(seen[0][1].headers,undefined);assert.ok(seen[1][1].headers.Authorization);
 await assert.rejects(c.rig3d(new Blob(['<svg>'],{type:'image/svg+xml'})),e=>e.code==='invalid_image');
 assert.throws(()=>createRiggingClient({apiKey:'x',baseUrl:'http://untrusted.example'}));
});
