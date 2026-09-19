'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { ROOT, SOURCES, buildShadowIife, verifyCandidateOrder } = require('./build-v39cd-shadow-iife.cjs');

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  verifyCandidateOrder();
  for (const source of SOURCES) {
    const bytes = fs.readFileSync(path.join(ROOT, source));
    console.log(`PHASE7BL_SOURCE_SHA256 ${source} ${sha256(bytes)}`);
  }

  const bundle = await buildShadowIife();
  const bundleBytes = Buffer.from(bundle, 'utf8');
  console.log(`PHASE7BL_BUNDLE_SHA256 ${sha256(bundleBytes)}`);
  console.log(`PHASE7BL_BUNDLE_BYTES ${bundleBytes.length}`);
  console.log(`PHASE7BL_BUNDLE_BASE64 ${bundleBytes.toString('base64')}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
