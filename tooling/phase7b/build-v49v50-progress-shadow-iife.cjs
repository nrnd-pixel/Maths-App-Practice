'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('esbuild');

const ROOT = path.resolve(__dirname, '../..');
const SOURCES = Object.freeze([
  'site/v49-student-topic-progress.js',
  'site/v50-student-progress-overview.js',
]);

function verifyCandidateOrder() {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'loader-manifest.json'), 'utf8'));
  const loaded = manifest.tiers.flatMap(tier => tier.entries)
    .map(entry => entry.src.replace(/^\.\//, '').split('?')[0]);

  const first = loaded.indexOf(path.basename(SOURCES[0]));
  assert(first >= 0, `${SOURCES[0]} is absent from the production loader manifest`);
  assert.deepEqual(
    loaded.slice(first, first + SOURCES.length),
    SOURCES.map(source => path.basename(source)),
    'V49/V50 shadow candidates must remain adjacent and in classic-script source order',
  );
  assert.equal(loaded[first - 1], 'assignment-deadlines.js',
    'V49/V50 must remain immediately after assignment deadlines');
  assert.equal(loaded[first + SOURCES.length], 'v50-accessibility-polish.js',
    'V49/V50 must remain immediately before V50 accessibility polish');
  for (const source of SOURCES) {
    assert(!manifest.sourceOnly.some(entry => entry.path === source),
      `${source} must remain production-loaded during the shadow-only checkpoint`);
  }
}

async function buildShadowIife() {
  verifyCandidateOrder();
  const entry = SOURCES.map(source => `import ${JSON.stringify(`../../${source}`)};`).join('\n');
  const result = await build({
    absWorkingDir: ROOT,
    stdin: {
      contents: entry,
      resolveDir: __dirname,
      sourcefile: 'v49v50-progress-shadow-entry.js',
    },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    write: false,
    sourcemap: false,
    legalComments: 'none',
    minify: false,
    charset: 'utf8',
    logLevel: 'silent',
  });
  assert.equal(result.outputFiles.length, 1, 'Expected one in-memory V49/V50 progress shadow IIFE');
  return result.outputFiles[0].text;
}

async function main() {
  const code = await buildShadowIife();
  const outputDirectory = path.join(__dirname, '.shadow');
  const outputPath = path.join(outputDirectory, 'v49v50-progress-compat.iife.js');
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(outputPath, code);
  console.log(`Shadow-only V49/V50 progress IIFE: ${path.relative(ROOT, outputPath)} (${Buffer.byteLength(code)} bytes)`);
}

if (require.main === module) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = { ROOT, SOURCES, buildShadowIife, verifyCandidateOrder };
