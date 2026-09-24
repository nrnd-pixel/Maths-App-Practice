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
} = require('./build-v58c-production-bundle.cjs');
const { verify: verifyLoaderManifest } = require('./verify-loader-manifest.cjs');

const forbiddenAuthority = /\bcloud\s*\.\s*(?:rpc|from)\b|\bfetch\s*\(|\b(?:localStorage|sessionStorage|XMLHttpRequest)\b|\b(?:startPractice|finishPractice|submitAnswer|startExam|publishExam|createAssignment)\b|grade_practice_response|request_practice_hint|submit_practice_session|finalize_exam_attempt/i;

async function verifyProductionBundle() {
  assert.equal(verifyLoaderManifest().length, 90, 'Expected the reviewed 86-script production loader');
  const contract = verifyProductionContract();
  const generated = await buildProductionIife();
  const committed = fs.readFileSync(path.join(ROOT, contract.path), 'utf8');
  assert.equal(committed, generated,
    'Committed V58C production bundle differs from deterministic in-memory generation');
  assert.equal(createHash('sha256').update(Buffer.from(committed)).digest('hex'), contract.sha256,
    'Committed V58C production bundle hash differs from the reviewed manifest contract');
  for (const input of EXPECTED_INPUTS) {
    const source = fs.readFileSync(path.join(ROOT, input), 'utf8');
    assert.doesNotMatch(source, forbiddenAuthority, `${input} contains forbidden runtime authority`);
  }
  assert.doesNotMatch(generated, forbiddenAuthority,
    'Generated V58C production bundle contains forbidden network/storage/learning/Exam/assignment authority');
  for (const token of [
    '__v58cParentFriendlyStudentReportInstalled',
    'V58CParentFriendlyStudentReport',
    '__v58cParentSummaryWorkspaceShortcutInstalled',
    'v58c-workspace-parent-summary',
  ]) assert.match(generated, new RegExp(token), `Generated V58C production bundle lost ${token}`);
  return { bytes: Buffer.byteLength(generated), sha256: contract.sha256 };
}

if (require.main === module) {
  verifyProductionBundle()
    .then(result => console.log(`PASS: exact generated V58C production bundle (${result.bytes} bytes, ${result.sha256})`))
    .catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = { forbiddenAuthority, verifyProductionBundle };
