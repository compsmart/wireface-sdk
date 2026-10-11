// Prepare matching installable packages and a browser archive. This never publishes or uploads.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = join(root, 'release');
const stage = join(out, 'browser');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(root, 'build-manifest.json'), 'utf8'));
if (manifest.workingTree && !process.argv.includes('--preview')) throw new Error('Working-tree artifacts need --preview; releases require committed-source builds');
const npm = process.env.npm_execpath || join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
if (!existsSync(npm)) throw new Error('Run through npm run pack:release');
mkdirSync(out, { recursive: true });
const files = [];
for (const dir of [root]) {
  const [result] = JSON.parse(execFileSync(process.execPath, [npm, 'pack', '--json', '--ignore-scripts', '--pack-destination', out], { cwd: dir, encoding: 'utf8' }));
  for (const entry of result.files) {
    if (/\.map$|(^|\/)src\/|(^|\/)tools\/|(^|\/)test\//.test(entry.path)) throw new Error(`Unexpected package source: ${entry.path}`);
  }
  files.push(result.filename);
  console.log(`${result.filename}: ${result.files.length} files, ${result.size} bytes`);
}
if (resolve(stage) !== join(out, 'browser') || !stage.startsWith(root + sep)) throw new Error('Unsafe staging path');
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
for (const file of ['dist', 'assets', 'types', 'README.md', 'LICENSE.md', 'HOSTED-RIGGING-TERMS.md', 'NOTICE', 'licenses', 'docs', 'face.schema.json', 'face2d.schema.json']) cpSync(join(root, file), join(stage, file), { recursive: true });
cpSync(join(root, 'examples'), join(stage, 'examples'), { recursive: true });
cpSync(join(root, 'schemas'), join(stage, 'schemas'), { recursive: true });
cpSync(join(root, 'openapi.json'), join(stage, 'openapi.json')); 
writeFileSync(join(stage, 'package.json'), JSON.stringify({ private: true, type: 'module', scripts: { start: 'node examples/hosted/backend.mjs' }, dependencies: { three: pkg.devDependencies.three } }, null, 2));
const browserFile = `wireface-browser-${pkg.version}.tgz`;
const tar = process.platform === 'win32' ? join(process.env.SystemRoot, 'System32/tar.exe') : 'tar';
execFileSync(tar, ['-czf', join(out, browserFile), '-C', stage, '.']);
files.push(browserFile);
const source = join(root, '.source');
for (const file of ['assets', 'types', 'README.md', 'examples', 'face.schema.json', 'face2d.schema.json', 'LICENSE.md', 'HOSTED-RIGGING-TERMS.md', 'NOTICE', 'licenses', 'docs', 'schemas', 'openapi.json']) cpSync(join(root, file), join(source, file), { recursive: true });
cpSync(join(root, 'dist/teeth'), join(source, 'dist/teeth'), { recursive: true });
cpSync(join(root, 'dist/audio'), join(source, 'dist/audio'), { recursive: true });
const sourceFile = `wireface-sdk-source-${pkg.version}.tgz`;
execFileSync(tar, ['-czf', join(out, sourceFile), '-C', source, '.']);
files.push(sourceFile);
const checksums = files.map(file => `${createHash('sha256').update(readFileSync(join(out, file))).digest('hex')}  ${file}`).join('\n') + '\n';
writeFileSync(join(out, 'SHA256SUMS'), checksums);
writeFileSync(join(out, 'RELEASE-NOTES.txt'), `Wireface Engine ${pkg.version}\n${manifest.workingTree ? 'WORKING-TREE PREVIEW: not a published release.' : 'Committed-source release candidate.'}\nCompiled SDK: free after sign-in. Source archive: authenticated commercial entitlement only.\nDeploy payment migrations and rigging service before SDK, examples and site.\nNever publish the private worker, source archive or server credentials in public downloads.\nEarlier orders continue to use archived terms; preserve the payment database and credentials.\n`);
rmSync(stage, { recursive: true, force: true });
console.log('Prepared', out);
