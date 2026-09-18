'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const {
  ROOT,
  EXPECTED_INPUTS,
  buildProductionIife,
  verifyProductionContract,
} = require('./build-v576-production-bundle.cjs');
const { verify: verifyLoaderManifest } = require('./verify-loader-manifest.cjs');

const forbiddenAuthority = /\bcloud\s*\.\s*(?:rpc|from)\b|\bfetch\s*\(|\b(?:startPractice|finishPractice|submitAnswer|startExam|publishExam|createAssignment)\b/;

async function verifyProductionBundle() {
  assert.equal(verifyLoaderManifest().length, 88, 'Expected the reviewed 88-script production loader');
  const contract = verifyProductionContract();
  const generated = await buildProductionIife();
  const committed = fs.readFileSync(path.join(ROOT, contract.path), 'utf8');
  assert.equal(committed, generated,
    'Committed production bundle differs from deterministic in-memory generation');
  assert.equal(createHash('sha256').update(Buffer.from(committed)).digest('hex'), contract.sha256,
    'Committed production bundle hash differs from the reviewed manifest contract');
  for (const input of EXPECTED_INPUTS) {
    const source = fs.readFileSync(path.join(ROOT, input), 'utf8');
    assert.doesNotMatch(source, forbiddenAuthority, `${input} contains forbidden runtime authority`);
  }
  assert.doesNotMatch(generated, forbiddenAuthority,
    'Generated production bundle contains forbidden network/learning/Exam/assignment authority');
  for (const token of [
    '__v5761FeedbackTriggerPositionInstalled',
    '__v5763TeacherFeedbackHeaderIconInstalled',
    'V5761FeedbackTriggerPosition',
    'V5763TeacherFeedbackHeaderIcon',
  ]) assert.match(generated, new RegExp(token), `Generated production bundle lost ${token}`);
  return { bytes: Buffer.byteLength(generated), sha256: contract.sha256 };
}

if (require.main === module) {
  verifyProductionBundle()
    .then(result => console.log(`PASS: exact generated V576 production bundle (${result.bytes} bytes, ${result.sha256})`))
    .catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = { forbiddenAuthority, verifyProductionBundle };
