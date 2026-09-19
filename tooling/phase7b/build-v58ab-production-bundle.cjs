'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '../..');
const MANIFEST_PATH = path.join(__dirname, 'loader-manifest.json');
const EXPECTED_INPUTS = Object.freeze([
  'site/v58a-student-first-use-experience.js',
  'site/v58b-teacher-workspace-consolidation.js',
]);
const EXPECTED_OUTPUT = 'site/v58ab-first-use-workspace-bundle.js';
const EXPECTED_OPTIONS = Object.freeze({
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  sourcemap: false,
  legalComments: 'none',
  minify: false,
  charset: 'utf8',
});

function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function verifyProductionContract() {
  const manifest = readManifest();
  assert.equal(manifest.generatedBundles.length, 3, 'Expected exactly three reviewed production bundles');
  const contract = manifest.generatedBundles.find(entry => entry.path === EXPECTED_OUTPUT);
  assert(contract, 'Missing reviewed V58AB production bundle contract');
  assert.deepEqual(contract.inputs, EXPECTED_INPUTS, 'V58AB production input order drift');
  assert.equal(contract.tool, 'esbuild');
  assert.equal(contract.toolVersion, esbuild.version, 'Pinned esbuild version drift');
  assert.equal(contract.entrySourcefile, 'v58ab-production-entry.js');
  assert.deepEqual(contract.options, EXPECTED_OPTIONS, 'Reviewed esbuild output options drift');
  assert.match(contract.sha256, /^[a-f0-9]{64}$/, 'Invalid committed V58AB production bundle SHA-256');
  assert.deepEqual(
    manifest.sourceOnly.filter(entry => contract.inputs.includes(entry.path)).map(entry => entry.path),
    contract.inputs,
    'V58AB sourceOnly order must preserve the exact production build input order',
  );

  const loaded = manifest.tiers.flatMap(tier => tier.entries)
    .map(entry => entry.src.replace(/^\.\//, '').split('?')[0]);
  assert.equal(loaded.filter(target => target === path.basename(contract.path)).length, 1,
    'Loaded manifest must contain exactly one V58AB production bundle');
  for (const input of contract.inputs) {
    assert(!loaded.includes(path.basename(input)), `${input} must be source-only, not production-loaded`);
  }
  const bundleIndex = loaded.indexOf(path.basename(contract.path));
  assert.deepEqual(loaded.slice(bundleIndex - 1, bundleIndex + 2), [
    'v576-feedback-presentation-bundle.js',
    'v58ab-first-use-workspace-bundle.js',
    'v58c-parent-summary-presentation-bundle.js',
  ], 'V576 -> V58AB production bundle -> V58C loader order drift');
  return contract;
}

async function buildProductionIife() {
  const contract = verifyProductionContract();
  const entry = contract.inputs.map(source => `import ${JSON.stringify(`../../${source}`)};`).join('\n');
  const result = await esbuild.build({
    absWorkingDir: ROOT,
    stdin: {
      contents: entry,
      resolveDir: __dirname,
      sourcefile: contract.entrySourcefile,
    },
    ...contract.options,
    write: false,
    logLevel: 'silent',
  });
  assert.equal(result.outputFiles.length, 1, 'Expected one generated V58AB production IIFE');
  return result.outputFiles[0].text;
}

async function main() {
  const contract = verifyProductionContract();
  const code = await buildProductionIife();
  const outputPath = path.join(ROOT, contract.path);
  fs.writeFileSync(outputPath, code);
  console.log(`Generated V58AB production IIFE: ${contract.path} (${Buffer.byteLength(code)} bytes)`);
}

if (require.main === module) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = {
  ROOT,
  EXPECTED_INPUTS,
  EXPECTED_OUTPUT,
  EXPECTED_OPTIONS,
  buildProductionIife,
  readManifest,
  verifyProductionContract,
};
