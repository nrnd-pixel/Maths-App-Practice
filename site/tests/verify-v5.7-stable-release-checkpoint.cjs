const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');

const config = read('config.js');
const checkpoint = read('v57-stable-release-checkpoint.js');
const v561 = read('v561-practice-first-student-experience.js');
const v57a = read('v57a-cross-device-past-paper-resume.js');
const v57a1 = read('v57a1-cross-device-local-bridge.js');
const v57a2 = read('v57a2-stale-local-checkpoint-cleanup.js');
const v57b = read('v57b-teacher-assignment-management.js');
const v57c = read('v57c-student-continue-learning-home.js');
const v57d = read('v57d-past-paper-analytics-actions.js');
const v57d1 = read('v57d1-focus-plan-copy-fallback.js');
const releaseDoc = fs.readFileSync(path.join(site,'..','CHANGELOG.md'),'utf8');

new vm.Script(checkpoint,{filename:'v57-stable-release-checkpoint.js'});

// Historical V5.7 checkpoint identity delegates the current title/badge to version.js.
assert.match(checkpoint,/MathAppVersion\?\.CURRENT_RELEASE/);
assert.match(checkpoint,/MathAppVersion\?\.applyIdentity/);
assert.doesNotMatch(checkpoint,/const TITLE = 'Math Practice V5\.7'|const BADGE = 'Version 5\.7/);
assert.match(checkpoint,/V5\.7 Stable Release:/);
assert.match(checkpoint,/V5\.7 Release Audit/);

// Release note accurately consolidates the accepted V5.7 sequence.
for (const phrase of [
  'continue Past Paper Practice across devices',
  'most useful next learning action from Home',
  'manage Past Paper assignments more clearly',
  'paper analytics into prepared student cohorts',
  'teaching focus plan',
  'Practice-first student entry',
  'Exam engine'
]) {
  assert(checkpoint.includes(phrase),`V5.7 release note is missing: ${phrase}`);
}

// Accepted runtime chain remains intact and the stable checkpoint loads last.
for (const loader of [
  './v57a-cross-device-past-paper-resume.js',
  './v57a1-cross-device-local-bridge.js',
  './v57a2-stale-local-checkpoint-cleanup.js',
  './v57b-teacher-assignment-management.js',
  './v57c-student-continue-learning-home.js',
  './v57d-past-paper-analytics-actions.js',
  './v57d1-focus-plan-copy-fallback.js',
  './v57-stable-release-checkpoint.js'
]) {
  assert(config.includes(loader),`V5.7 loader missing: ${loader}`);
}
assert.match(config,/\.\/v56-stable-release-checkpoint\.js'[\s\S]*\.\/v561-practice-first-student-experience\.js'[\s\S]*\.\/v57a-cross-device-past-paper-resume\.js'/,
  'Accepted V5.6 stable + V5.6.1 Practice-first foundation must remain before V5.7.');
assert.match(config,/\.\/v57d1-focus-plan-copy-fallback\.js'[\s\S]*\.\/v57-stable-release-checkpoint\.js'/,
  'V5.7 stable checkpoint must load after V5.7D.1.');

// Browser checkpoint checks correspond to accepted installation markers.
assert.match(v561,/__v561PracticeFirstStudentExperienceInstalled/);
assert.match(v57a,/__v57aCrossDevicePastPaperResumeInstalled/);
assert.match(v57a1,/__v57a1CrossDeviceLocalBridgeInstalled/);
assert.match(v57a2,/__v57a2StaleLocalCheckpointCleanupInstalled/);
assert.match(v57b,/__v57bTeacherAssignmentManagementInstalled/);
assert.match(v57c,/__v57cStudentContinueLearningHomeInstalled/);
assert.match(v57d,/__v57dPastPaperAnalyticsActionsInstalled/);
assert.match(v57d1,/__v57d1FocusPlanCopyFallbackInstalled/);
for (const marker of [
  '__v56StableReleaseCheckpointInstalled',
  '__v561PracticeFirstStudentExperienceInstalled',
  '__v57aCrossDevicePastPaperResumeInstalled',
  '__v57a1CrossDeviceLocalBridgeInstalled',
  '__v57a2StaleLocalCheckpointCleanupInstalled',
  '__v57bTeacherAssignmentManagementInstalled',
  '__v57cStudentContinueLearningHomeInstalled',
  '__v57dPastPaperAnalyticsActionsInstalled',
  '__v57d1FocusPlanCopyFallbackInstalled'
]) {
  assert(checkpoint.includes(marker),`Stable checkpoint is missing accepted module marker: ${marker}`);
}

// Release Audit consolidation is additive and retains earlier foundations.
assert.match(checkpoint,/V5\.6, V5\.5 and V5\.4 audit foundations remain retained below/);
assert.match(checkpoint,/v56-stable-release-audit/);
assert.match(checkpoint,/v55-stable-release-audit/);
assert.match(checkpoint,/v50-release-audit-root/);

// Stable checkpoint remains presentation/audit-only and retains its finite refresh burst.
assert.match(checkpoint,/\[0,100,300,900,1800,2600,3200\]/,'Checkpoint reapply burst must stay finite.');
assert.doesNotMatch(checkpoint,/MutationObserver/,'V5.7 stable checkpoint must not add a DOM observer.');
assert.doesNotMatch(checkpoint,/cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(|fetch\(/,
  'V5.7 stable checkpoint must not make network/data calls.');
assert.doesNotMatch(checkpoint,/localStorage|sessionStorage/,
  'V5.7 stable checkpoint must not persist application state.');
assert.doesNotMatch(checkpoint,/grade_practice_response|request_practice_hint|finalize_exam_attempt|submit_practice_session|save_exam_attempt|get_student_questions|create_teacher_past_paper_assignments|update_teacher_past_paper_assignment|reassign_teacher_past_paper_assignment/i,
  'V5.7 stable checkpoint must not alter grading, retrieval, submission, assignment writes or Exam behavior.');

// Historical checkpoint record remains preserved in the consolidated changelog.
assert.match(releaseDoc,/4a5759ed81a89449531ae061b1de6e4f722dc86b/);
for (const phrase of [
  'V5.7A',
  'V5.7B',
  'V5.7C',
  'V5.7D',
  'V5.7D.1',
  'No new Supabase migration or data mutation',
  'Version 5.7 • Stable Release',
  'student entry remains Practice-first',
  'Exam Mode remains preserved'
]) {
  assert(releaseDoc.includes(phrase),`V5.7 release checkpoint record is missing: ${phrase}`);
}

console.log('V5.7 Stable Release checkpoint checks passed.');
console.log('- historical V5.7 checkpoint uses the shared current title/badge source');
console.log('- accepted V5.7A-D continuity, assignment-management and analytics-action chain retained');
console.log('- checkpoint remains presentation/audit-only with no database or student-behavior changes');
