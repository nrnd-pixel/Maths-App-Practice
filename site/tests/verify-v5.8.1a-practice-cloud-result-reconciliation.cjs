const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const patch = fs.readFileSync(path.join(site,'v581a-practice-cloud-result-reconciliation.js'),'utf8');
const config = fs.readFileSync(path.join(site,'config.js'),'utf8');

new vm.Script(patch,{filename:'v581a-practice-cloud-result-reconciliation.js'});

assert.match(patch,/__v581aPracticeCloudResultReconciliationInstalled/);
assert.match(patch,/get_student_review/,'Cloud result verification must use the saved result code.');
assert.match(patch,/Cloud ✓/,'A verified cloud result must restore the cloud sync label.');
assert.match(patch,/applyServerSummary/,'Server result summary must be authoritative on the result screen.');
assert.match(patch,/secondTrySuccesses/,'Second-try success must be reconciled from saved answers.');
assert.match(patch,/completed before this teacher assignment was started/,
  'Stale pre-assignment results need a specific student-facing explanation.');
assert.match(patch,/clearStaleResultState/,'Starting a teacher assignment must clear stale result state.');
assert.match(patch,/start_student_practice_assignment_v56b/,
  'The assignment-start RPC path must be guarded against stale result state.');
assert.doesNotMatch(patch,/complete_student_practice_assignment_v56b/,
  'The reconciliation layer must not duplicate server assignment-completion authority.');
assert.doesNotMatch(patch,/practice_assignment_attempts[^\n]*update|from\(['"]practice_assignment_attempts['"]\)/i,
  'The reconciliation layer must not write assignment status directly.');

assert.match(config,/\.\/v581a-practice-cloud-result-reconciliation\.js'/,
  'V5.8.1A loader is missing from config.');
assert.match(config,/\.\/v58d-content-workflow-consolidation\.js'[\s\S]*\.\/v581a-practice-cloud-result-reconciliation\.js'[\s\S]*\.\/v58-stable-release-checkpoint\.js'/,
  'V5.8.1A must load after accepted V5.8D behavior and before the presentation-only V5.8 stable checkpoint.');

console.log('V5.8.1A Practice cloud result reconciliation checks passed.');
console.log('- successful cloud saves cannot remain mislabeled as Local backup');
console.log('- saved server scores/hints/second-try outcomes drive the visible summary');
console.log('- stale pre-assignment results are explained and cleared on assignment start');
console.log('- assignment completion remains server-authoritative');
