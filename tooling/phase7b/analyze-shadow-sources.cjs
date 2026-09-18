'use strict';

const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const { verify } = require('./verify-loader-manifest.cjs');

async function main() {
  const entries = verify();
  const rows = [];
  for (const entry of entries) {
    const source = fs.readFileSync(path.resolve(__dirname, '../../site', entry.target), 'utf8');
    // Transform each classic script independently, in manifest tier order. Never
    // bundle, execute, concatenate or write the transformed code to disk.
    const result = await esbuild.transform(source, {
      loader: 'js', sourcefile: entry.target, minify: true, target: 'es2020',
    });
    rows.push({ owner: entry.owner, src: entry.src,
      sourceBytes: Buffer.byteLength(source), minifiedBytes: Buffer.byteLength(result.code),
      warnings: result.warnings.map(warning => warning.text) });
  }
  console.log(JSON.stringify({
    analysis: 'Independent source transforms only; not a production bundle or runtime equivalence proof. Tier order does not model browser scheduling.',
    esbuildVersion: esbuild.version,
    scripts: rows.length,
    sourceBytes: rows.reduce((sum, row) => sum + row.sourceBytes, 0),
    minifiedBytes: rows.reduce((sum, row) => sum + row.minifiedBytes, 0),
    rows,
  }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
