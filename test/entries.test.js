// Each entry exports what its types declare (test/types/exports.json), the Node-safe ones work in Node, and the
// types themselves check (TypeScript, if it's installed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const declared = JSON.parse(readFileSync(join(ROOT, 'test', 'types', 'exports.json'), 'utf8'));
const entry = spec => join(ROOT, pkg.exports[spec === '@wireface/sdk' ? '.' : `.${spec.slice('@wireface/sdk'.length)}`].default);

test('every entry exports exactly what its types declare', async () => {
  for (const [spec, names] of Object.entries(declared)) {
    const mod = await import(pathToFileURL(entry(spec)).href);
    assert.deepEqual(Object.keys(mod).sort(), [...names].sort(), spec);
  }
});

test('config validation works in Node', async () => {
  const { validateConfig, ConfigError, DEFAULTS } = await import('../dist/config.js');
  assert.equal(validateConfig({ preset: 'violet' }).style, DEFAULTS.style);
  assert.throws(() => validateConfig({ glow: 99 }), ConfigError);
  const two = await import('../dist/2d-config.js');
  assert.throws(() => two.validateConfig({ framing: 'nope' }), two.ConfigError);
});

test('the types check', { skip: !existsSync(join(ROOT, 'node_modules', 'typescript')) && 'TypeScript is not installed' }, () => {
  const tsc = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
  execFileSync(process.execPath, [tsc, '-p', join(ROOT, 'test', 'types')], { stdio: 'pipe' });
});
