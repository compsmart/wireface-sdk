import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const example = JSON.parse(readFileSync(join(root, 'assets/skins/sarah.wireface.json')));
const number = { type: 'number', minimum: -1e6, maximum: 1e6 };
const positive = { type: 'number', exclusiveMinimum: 0, maximum: 1e6 };
const arr = (n, items = number) => ({ type: 'array', minItems: n, maxItems: n, items });
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, required, properties });
const vector = arr(3), index = { type: 'integer', minimum: 0, maximum: 467 };
const rig = object({ count: { const: 468 }, channels: { const: example.rig.channels }, base: arr(1404), uvs: arr(936), jawW: arr(468),
  pivot: vector, skin: { const: example.rig.skin }, deltas: arr(example.rig.channels.length, arr(1404)),
  caps: object(Object.fromEntries(Object.entries(example.rig.caps).map(([k, v]) => [k, { const: v }]))),
  masks: object(Object.fromEntries(['edge', 'lips', 'brows', 'cheeks', 'socket'].map(k => [k, arr(468)]))),
  eyes: object(Object.fromEntries(['R', 'L'].map(k => [k, object({ center: vector, radius: positive, width: positive,
    lidSet: { type: 'array', minItems: 1, maxItems: 468, uniqueItems: true, items: index } })]))),
  mouth: object({ center: vector, pivot: vector, halfW: positive, zFront: number, seamY: number }),
});
const transfer = object({ n: { const: 468 }, aspect: positive, eyeDist: positive, unit: positive, mouthWasOpen: number,
  ...Object.fromEntries(Object.entries({ uvs: 936, rest: 936, J: 1872, edge: 468, base: 1404, restLight: 468, mouthQ: 2, mouthB: 2, mouthJ: 4 }).map(([k, n]) => [k, arr(n)])) });
const teeth = { enum: ['normal', 'braces', 'vampire', 'turkey', 'sharp', 'goofy', 'anime', 'cartoon', 'clay', 'comic', 'pixel', 'sketch'] };
const image = { type: 'string', maxLength: 32 * 1024 * 1024, pattern: '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$' };
const character = { ...object({ format: { const: 'wireface' }, version: { const: 1 }, kind: { enum: ['2d', '3d'] },
  name: { type: 'string', maxLength: 200 }, width: { type: 'integer', minimum: 1, maximum: 8192 }, height: { type: 'integer', minimum: 1, maximum: 8192 },
  texture: { anyOf: [image, { type: 'null' }] }, rig, transfer,
  render: object({ style: { enum: ['photo', 'hologram', 'sculpt', 'toon'] }, teeth, artStyle: { type: 'string', maxLength: 40 },
    teethMode: { enum: ['asset', 'flat', 'none'] } }, ['style', 'teeth']),
  notices: { type: 'array', minItems: 1, maxItems: 32, items: { type: 'string', maxLength: 65536 } },
}, ['format', 'version', 'kind', 'name', 'width', 'height', 'texture', 'rig', 'render', 'notices']),
  allOf: [{ if: { properties: { kind: { const: '2d' } } }, then: { required: ['transfer'], properties: { texture: image } } },
    { if: { properties: { render: { properties: { style: { const: 'photo' } } } } }, then: { properties: { texture: image } } }],
  description: 'Data-only portable character. Runtime additionally verifies dimensions against decoded texture, pixel count <= 16777216, transfer aspect and mandatory third-party notices.' };
const request = object({ image: { ...image, maxLength: 17 * 1024 * 1024 }, name: { type: 'string', maxLength: 200, default: 'Your character' }, teeth }, ['image']);
const tokenRequest = object({ scope: { type: 'array', minItems: 1, maxItems: 2, uniqueItems: true, items: { enum: ['rig:2d', 'rig:3d'] } }, origin: { type: 'string', format: 'uri' } });
const tokenResponse = object({ token: { type: 'string' }, expiresAt: { type: 'integer', description: 'Unix seconds; tokens live for five minutes.' } });
const errorDetail = object({ code: { type: 'string' }, message: { type: 'string' } });
const error = object({ error: errorDetail, requestId: { type: 'string' } });
const job = object({ id: { type: 'string', pattern: '^[a-f0-9]{32}$' }, kind: { enum: ['2d', '3d'] },
  status: { enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'] },
  stage: { enum: ['queued', 'preparing', 'anchors', 'landmarks', 'fitting', 'validating', 'completed', 'failed', 'cancelled'] },
  requestId: { type: 'string' }, createdAt: { type: 'integer' }, error: errorDetail,
  character: { $ref: 'character.schema.json' },
}, ['id', 'kind', 'status', 'stage', 'requestId', 'createdAt']);
const schemas = { character, 'rigging-request': request, 'token-request': tokenRequest, 'token-response': tokenResponse, error, job };
mkdirSync(join(root, 'schemas'), { recursive: true });
for (const [name, schema] of Object.entries(schemas)) writeFileSync(join(root, 'schemas', `${name}.schema.json`),
  JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', $id: `https://wireface.dev/schema/${name}.schema.json`, ...schema }, null, 2) + '\n');
const ref = name => ({ $ref: `./schemas/${name}.schema.json` });
const json = schema => ({ 'application/json': { schema } });
const response = (description, name) => ({ description, content: json(ref(name)) });
const failures = Object.fromEntries([400, 401, 403, 404, 409, 410, 413, 415, 422, 429, 500, 502, 503, 504].map(s => [s, response('Stable error code and request ID.', 'error')]));
const submit = kind => ({ summary: `Prepare a ${kind} character`, operationId: `rig${kind}`, security: [{ bearer: [] }],
  parameters: [{ in: 'header', name: 'Idempotency-Key', required: true, schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{8,128}$' } }],
  requestBody: { required: true, content: json(ref('rigging-request')) },
  responses: { 200: response('Existing terminal request.', 'job'), 202: response('Queued request; poll its ID.', 'job'), ...failures } });
const openapi = { openapi: '3.1.0', info: { title: 'Wireface hosted rigging', version: '1.0.0',
  description: 'Creation requires connectivity and an active key. Saved .wireface.json playback never contacts Wireface. Images are discarded after processing, results expire after 24 hours, metadata after 90 days. Permanent keys are server-only; browsers use origin-bound scoped five-minute tokens.' },
  servers: [{ url: 'https://wireface.dev/api/rigging/v1' }], components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
  paths: { '/2d': { post: submit('2d') }, '/3d': { post: submit('3d') },
    '/tokens': { post: { summary: 'Issue a scoped browser token using a permanent SDK key', operationId: 'createToken', security: [{ bearer: [] }],
      requestBody: { required: true, content: json(ref('token-request')) }, responses: { 201: response('Browser token.', 'token-response'), ...failures } } },
    '/jobs/{id}': { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{32}$' } }],
      get: { summary: 'Get progress or completed embedded character', operationId: 'getJob', security: [{ bearer: [] }], responses: { 200: response('Job state.', 'job'), ...failures } },
      delete: { summary: 'Cancel queued or processing work; already completed requests are unchanged', operationId: 'cancelJob', security: [{ bearer: [] }], responses: { 200: response('Job state.', 'job'), ...failures } } },
  } };
writeFileSync(join(root, 'openapi.json'), JSON.stringify(openapi, null, 2) + '\n');
