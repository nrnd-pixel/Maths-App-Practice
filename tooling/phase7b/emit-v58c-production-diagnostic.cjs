'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '../..');
const inputs = [
  'site/v58c-parent-friendly-student-report.js',
  'site/v58c-parent-summary-workspace-shortcut.js',
];

(async () => {
  const entry = inputs.map(source => `import ${JSON.stringify(`../../${source}`)};`).join('\n');
  const result = await esbuild.build({
    absWorkingDir: ROOT,
    stdin: { contents: entry, resolveDir: __dirname, sourcefile: 'v58c-production-entry.js' },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    sourcemap: false,
    legalComments: 'none',
    minify: false,
    charset: 'utf8',
    write: false,
    logLevel: 'silent',
  });
  const code = result.outputFiles[0].text;
  const sourceSha256 = Object.fromEntries(inputs.map(source => [
    source,
    createHash('sha256').update(fs.readFileSync(path.join(ROOT, source))).digest('hex'),
  ]));
  const payload = {
    sourceSha256,
    bundleSha256: createHash('sha256').update(Buffer.from(code)).digest('hex'),
    bytes: Buffer.byteLength(code),
    bundleBase64: Buffer.from(code).toString('base64'),
  };
  console.log('PHASE7BF_DIAGNOSTIC=' + Buffer.from(JSON.stringify(payload)).toString('base64'));
})().catch(error => { console.error(error); process.exitCode = 1; });
