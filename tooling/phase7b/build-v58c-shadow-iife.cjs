'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('esbuild');

const ROOT = path.resolve(__dirname, '../..');
const SOURCES = Object.freeze([
  'site/v58c-parent-friendly-student-report.js',
  'site/v58c-parent-summary-workspace-shortcut.js',
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
    'V58C shadow candidates must remain adjacent and in classic-script source order',
  );
  assert.equal(loaded[first - 1], 'v58b-teacher-workspace-consolidation.js',
    'V58C pair must remain immediately after the accepted V58B workspace owner');
  assert.equal(loaded[first + SOURCES.length], 'v58d-content-workflow-consolidation.js',
    'V58C pair must remain immediately before V58D');
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
      sourcefile: 'v58c-shadow-entry.js',
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
  assert.equal(result.outputFiles.length, 1, 'Expected one in-memory V58C shadow IIFE');
  return result.outputFiles[0].text;
}

async function main() {
  const code = await buildShadowIife();
  const outputDirectory = path.join(__dirname, '.shadow');
  const outputPath = path.join(outputDirectory, 'v58c-parent-summary-compat.iife.js');
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(outputPath, code);
  console.log(`Shadow-only IIFE: ${path.relative(ROOT, outputPath)} (${Buffer.byteLength(code)} bytes)`);
}

if (require.main === module) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = { ROOT, SOURCES, buildShadowIife, verifyCandidateOrder };
