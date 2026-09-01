const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');

const config = read('config.js');
const release = read('v40-release.js');
const polish = read('v50-production-polish.js');
const audit = read('v50-release-audit-rc3.js');
const checkpoint = read('v54-stable-release-checkpoint.js');

new vm.Script(checkpoint,{filename:'v54-stable-release-checkpoint.js'});

// Final release identity is explicitly V5.4 and is applied after the established start shell.
assert.match(polish,/const TITLE = 'Math Practice V5\.4'/);
assert.match(polish,/const BADGE = 'Version 5\.4 • Stable Release'/);
assert.match(polish,/phase:'V5\.4Stable'/);
assert.match(audit,/V5\.4 Release Audit/);
assert.match(audit,/stable V5\.4 baseline/);
assert.match(checkpoint,/const TITLE = 'Math Practice V5\.4'/);
assert.match(checkpoint,/const BADGE = 'Version 5\.4 • Stable Release'/);
assert.match(checkpoint,/V5\.4 Stable Release:/);
assert.match(config,/\.\/v40-start-shell\.js'[\s\S]*\.\/v54-stable-release-checkpoint\.js'/,
  'V5.4 checkpoint must load after the established start shell.');

// Release note accurately summarizes the accepted V5.4 product boundary.
for (const phrase of [
  'Practice and Exam',
  'unified Practice resource bank',
  'past-paper and topical-exercise questions',
  'individual and bulk Practice eligibility controls',
  'compact 50-card Question Bank browsing',
  'safe bulk-selection scope',
  'whole-set topical management',
  'Deterministic grading',
  'AI-free Exam Mode'
]) {
  assert(checkpoint.includes(phrase),`V5.4 release note is missing: ${phrase}`);
}

// The complete accepted V5.4A–F module chain and V5.4G performance revision remain loaded.
for (const loader of [
  "v54a-resource-bank-visibility.js?v=54a3-2",
  "v54b-practice-eligibility-controls.js?v=54b-1",
  "v54c-compact-question-bank.js?v=54c-1",
  "v54d-topical-resource-simplification.js?v=54d-1",
  "v54e-bulk-practice-eligibility.js?v=54e-1",
  "v54f-bulk-selection-scope-safety.js?v=54f-1",
  "v52b1-question-bank-performance.js?v=52b1-3"
]) {
  assert(release.includes(loader),`Accepted V5.4 loader missing: ${loader}`);
}

// Checkpoint reuses the audited production-polish API and remains presentation-only.
assert.match(checkpoint,/V50ProductionPolish\?\.refresh/);
assert.match(checkpoint,/\[0,80,220,600\]/,'Checkpoint reapply burst must stay finite.');
assert.doesNotMatch(checkpoint,/MutationObserver/,'Stable checkpoint must not add a broad DOM observer.');
assert.doesNotMatch(checkpoint,/cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(|fetch\(/,
  'Stable checkpoint must not make network/data calls.');
assert.doesNotMatch(checkpoint,/localStorage|sessionStorage/,
  'Stable checkpoint must not persist application state.');
assert.doesNotMatch(checkpoint,/grade_practice_response|request_practice_hint|finalize_exam_attempt|submit_practice_session|save_exam_attempt|get_student_questions|exam_paper_settings/i,
  'Stable checkpoint must not alter grading, retrieval, submission or Exam publication behavior.');

console.log('V5.4 Stable Release checkpoint checks passed.');
console.log('- final V5.4 title, badge, release note and Release Audit identity aligned');
console.log('- accepted V5.4A–G runtime chain retained');
console.log('- checkpoint remains presentation-only with no database or student-behavior changes');
