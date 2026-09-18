'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('esbuild');

const ROOT = path.resolve(__dirname, '../..');
const SOURCES = Object.freeze([
  'site/v5761-feedback-trigger-position.js',
  'site/v5763-teacher-feedback-header-icon.js',
]);

function verifyCandidateOrder() {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'loader-manifest.json'), 'utf8'));
  const orderedTargets = manifest.tiers.flatMap(tier => tier.entries)
    .map(entry => entry.src.replace(/^\.\//, '').split('?')[0]);
  const first = orderedTargets.indexOf(path.basename(SOURCES[0]));
  assert(first >= 0, `${SOURCES[0]} is absent from the loader manifest`);
  assert.deepEqual(orderedTargets.slice(first, first + SOURCES.length), SOURCES.map(source => path.basename(source)),
    'V576 shadow candidates must remain adjacent and in classic-script source order');
}

async function buildShadowIife() {
  verifyCandidateOrder();
  const entry = SOURCES.map(source => `import ${JSON.stringify(`../../${source}`)};`).join('\n');
  const result = await build({
    absWorkingDir: ROOT,
    stdin: { contents: entry, resolveDir: __dirname, sourcefile: 'v576-shadow-entry.js' },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    write: false,
    sourcemap: false,
    legalComments: 'none',
    logLevel: 'silent',
  });
  assert.equal(result.outputFiles.length, 1, 'Expected one in-memory shadow IIFE');
  return result.outputFiles[0].text;
}

async function main() {
  const code = await buildShadowIife();
  const outputDirectory = path.join(__dirname, '.shadow');
  const outputPath = path.join(outputDirectory, 'v576-feedback-compat.iife.js');
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(outputPath, code);
  console.log(`Shadow-only IIFE: ${path.relative(ROOT, outputPath)} (${Buffer.byteLength(code)} bytes)`);
}

if (require.main === module) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = { ROOT, SOURCES, buildShadowIife, verifyCandidateOrder };
