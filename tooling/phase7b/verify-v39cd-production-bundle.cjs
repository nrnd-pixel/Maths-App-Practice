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
} = require('./build-v39cd-production-bundle.cjs');
const { verify: verifyLoaderManifest } = require('./verify-loader-manifest.cjs');

const forbiddenAuthority = /\bcloud\s*\.\s*(?:rpc|from)\b|\bfetch\s*\(|\b(?:localStorage|sessionStorage|XMLHttpRequest)\b|\b(?:startPractice|finishPractice|submitAnswer|startExam|publishExam|createAssignment)\b|grade_practice_response|request_practice_hint|submit_practice_session|finalize_exam_attempt|set_student_pin/i;

async function verifyProductionBundle() {
  assert.equal(verifyLoaderManifest().length, 99, 'Expected the reviewed 86-script production loader');
  const contract = verifyProductionContract();
  const generated = await buildProductionIife();
  const committed = fs.readFileSync(path.join(ROOT, contract.path), 'utf8');

  assert.equal(committed, generated,
    'Committed V39CD production bundle differs from deterministic in-memory generation');
  assert.equal(createHash('sha256').update(Buffer.from(committed)).digest('hex'), contract.sha256,
    'Committed V39CD production bundle hash differs from the reviewed manifest contract');

  for (const input of EXPECTED_INPUTS) {
    const source = fs.readFileSync(path.join(ROOT, input), 'utf8');
    assert.doesNotMatch(source, forbiddenAuthority, `${input} contains forbidden runtime authority`);
  }
  assert.doesNotMatch(generated, forbiddenAuthority,
    'Generated V39CD production bundle contains forbidden network/storage/Practice/Exam/assignment authority');

  for (const token of [
    'v39-dashboard-polish-style',
    'v39-state-polish-style',
    'v39-dashboard-intro',
    'v39-assignments-intro',
    'v39-empty-enhanced',
  ]) assert.match(generated, new RegExp(token), `Generated V39CD production bundle lost ${token}`);

  return { bytes: Buffer.byteLength(generated), sha256: contract.sha256 };
}

if (require.main === module) {
  verifyProductionBundle()
    .then(result => console.log(
      `PASS: deterministic V39CD production bundle (${result.bytes} bytes, ${result.sha256})`
    ))
    .catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = { verifyProductionBundle };
