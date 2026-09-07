const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');

const config = read('config.js');
const checkpoint = read('v56-stable-release-checkpoint.js');
const v56a = read('v56a-question-bank-response-filter.js');
const v56a1 = read('v56a1-bulk-practice-confirmation-bridge.js');
const v56b = read('v56b-teacher-assigned-past-paper-practice.js');
const v56c = read('v56c-student-past-paper-progress.js');
const v56d = read('v56d-teacher-past-paper-analytics.js');
const releaseDoc = fs.readFileSync(path.join(site,'..','CHANGELOG.md'),'utf8');

new vm.Script(checkpoint,{filename:'v56-stable-release-checkpoint.js'});

// Historical V5.6 checkpoint identity delegates the current title/badge to version.js.
assert.match(checkpoint,/MathAppVersion\?\.CURRENT_RELEASE/);
assert.match(checkpoint,/MathAppVersion\?\.applyIdentity/);
assert.doesNotMatch(checkpoint,/const TITLE = 'Math Practice V5\.6'|const BADGE = 'Version 5\.6/);
assert.match(checkpoint,/V5\.6 Stable Release:/);
assert.match(checkpoint,/V5\.6 Release Audit/);

// Release note accurately consolidates the accepted V5.6 sequence.
for (const phrase of [
  'filter Question Bank items by response type',
  'assign specific Past Paper Practice',
  'Students can track Past Paper progress',
  'analyse paper-level class performance',
  'V5.5 Past Paper Practice engine',
  'AI Learning Help',
  'Exam Mode'
]) {
  assert(checkpoint.includes(phrase),`V5.6 release note is missing: ${phrase}`);
}

// Accepted V5.6 runtime chain remains intact and the stable checkpoint loads last.
for (const loader of [
  './v56a-question-bank-response-filter.js',
  './v56a1-bulk-practice-confirmation-bridge.js',
  './v56b-teacher-assigned-past-paper-practice.js',
  './v56c-student-past-paper-progress.js',
  './v56d-teacher-past-paper-analytics.js',
  './v56-stable-release-checkpoint.js'
]) {
  assert(config.includes(loader),`V5.6 loader missing: ${loader}`);
}
assert.match(config,/\.\/v55-stable-release-checkpoint\.js'[\s\S]*\.\/v56a-question-bank-response-filter\.js'/,
  'Accepted V5.5 stable checkpoint must remain before the V5.6 feature sequence.');
assert.match(config,/\.\/v56d-teacher-past-paper-analytics\.js'[\s\S]*\.\/v56-stable-release-checkpoint\.js'/,
  'V5.6 stable checkpoint must load after V5.6D.');

// Browser checkpoint checks correspond to accepted installation markers.
assert.match(v56a,/__v56aQuestionBankResponseFilterInstalled/);
assert.match(v56a1,/__v56a1BulkPracticeConfirmationBridgeInstalled/);
assert.match(v56b,/__v56bTeacherAssignedPastPaperPracticeInstalled/);
assert.match(v56c,/__v56cStudentPastPaperProgressInstalled/);
assert.match(v56d,/__v56dTeacherPastPaperAnalyticsInstalled/);
for (const marker of [
  '__v55StableReleaseCheckpointInstalled',
  '__v56aQuestionBankResponseFilterInstalled',
  '__v56a1BulkPracticeConfirmationBridgeInstalled',
  '__v56bTeacherAssignedPastPaperPracticeInstalled',
  '__v56cStudentPastPaperProgressInstalled',
  '__v56dTeacherPastPaperAnalyticsInstalled'
]) {
  assert(checkpoint.includes(marker),`Stable checkpoint is missing accepted module marker: ${marker}`);
}

// Release Audit consolidation is additive and retains earlier foundations.
assert.match(checkpoint,/V5\.5 stable checkpoint and V5\.4 RC audit foundation remain retained below/);
assert.match(checkpoint,/v55-stable-release-audit/);
assert.match(checkpoint,/v50-release-audit-root/);

// Stable checkpoint remains presentation/audit-only.
assert.match(checkpoint,/\[0,100,260,700,1400,1800\]/,'Checkpoint reapply burst must stay finite.');
assert.doesNotMatch(checkpoint,/MutationObserver/,'V5.6 stable checkpoint must not add a DOM observer.');
assert.doesNotMatch(checkpoint,/cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(|fetch\(/,
  'V5.6 stable checkpoint must not make network/data calls.');
assert.doesNotMatch(checkpoint,/localStorage|sessionStorage/,
  'V5.6 stable checkpoint must not persist application state.');
assert.doesNotMatch(checkpoint,/grade_practice_response|request_practice_hint|finalize_exam_attempt|submit_practice_session|save_exam_attempt|get_student_questions|exam_paper_settings/i,
  'V5.6 stable checkpoint must not alter grading, retrieval, submission or Exam publication behavior.');

// Historical checkpoint record remains preserved in the consolidated changelog.
assert.match(releaseDoc,/a972fd5fdda4f44e7d314f0442c066f95aa9160e/);
for (const phrase of [
  'V5.6A',
  'V5.6A.1',
  'V5.6B',
  'V5.6C',
  'V5.6D',
  'No new Supabase migration or data mutation',
  'Version 5.6 • Stable Release'
]) {
  assert(releaseDoc.includes(phrase),`V5.6 release checkpoint record is missing: ${phrase}`);
}

console.log('V5.6 Stable Release checkpoint checks passed.');
console.log('- historical V5.6 checkpoint uses the shared current title/badge source');
console.log('- accepted V5.6A-D Past Paper management/progress/analytics chain retained');
console.log('- checkpoint remains presentation/audit-only with no database or student-behavior changes');
