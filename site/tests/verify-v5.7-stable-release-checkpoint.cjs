const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

require('./verify-phase4-past-paper-v56-v57-checkpoint1-integrity.cjs');
require('./verify-phase4-past-paper-v56-v57-dormant-reference-integrity.cjs');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');

const config = read('config.js');
const checkpoint = read('v57-stable-release-checkpoint.js');
const v561 = read('v561-practice-first-student-experience.js');
const cross = read('past-paper-cross-device.js');
const v57b = read('v57b-teacher-assignment-management.js');
const v57c = read('v57c-student-continue-learning-home.js');
const actions = read('past-paper-analytics-actions.js');
const releaseDoc = fs.readFileSync(path.join(site,'..','CHANGELOG.md'),'utf8');

new vm.Script(checkpoint,{filename:'v57-stable-release-checkpoint.js'});
assert.match(checkpoint,/MathAppVersion\?\.CURRENT_RELEASE/);
assert.match(checkpoint,/MathAppVersion\?\.applyIdentity/);
assert.doesNotMatch(checkpoint,/const TITLE = 'Math Practice V5\.7'|const BADGE = 'Version 5\.7/);
assert.match(checkpoint,/V5\.7 Stable Release:/);
assert.match(checkpoint,/V5\.7 Release Audit/);

for (const phrase of [
  'continue Past Paper Practice across devices','most useful next learning action from Home','manage Past Paper assignments more clearly',
  'paper analytics into prepared student cohorts','teaching focus plan','Practice-first student entry','Exam engine'
]) assert(checkpoint.includes(phrase),`V5.7 release note is missing: ${phrase}`);

for (const loader of [
  './past-paper-cross-device.js','./v57b-teacher-assignment-management.js','./v57c-student-continue-learning-home.js',
  './past-paper-analytics-actions.js','./v57-stable-release-checkpoint.js'
]) assert(config.includes(loader),`V5.7 loader missing: ${loader}`);
assert.match(config,/\.\/v56-stable-release-checkpoint\.js'[\s\S]*\.\/v561-practice-first-student-experience\.js'[\s\S]*\.\/past-paper-cross-device\.js'/,
  'Accepted V5.6 stable + V5.6.1 foundation must remain before consolidated cross-device runtime.');
assert.match(config,/\.\/past-paper-analytics-actions\.js'[\s\S]*\.\/v57-stable-release-checkpoint\.js'/,
  'V5.7 stable checkpoint must load after consolidated analytics actions.');

assert.match(v561,/__v561PracticeFirstStudentExperienceInstalled/);
assert.match(cross,/__v57aCrossDevicePastPaperResumeInstalled/);
assert.match(cross,/__v57a1CrossDeviceLocalBridgeInstalled/);
assert.match(cross,/__v57a2StaleLocalCheckpointCleanupInstalled/);
assert.match(v57b,/__v57bTeacherAssignmentManagementInstalled/);
assert.match(v57c,/__v57cStudentContinueLearningHomeInstalled/);
assert.match(actions,/__v57dPastPaperAnalyticsActionsInstalled/);
assert.match(actions,/__v57d1FocusPlanCopyFallbackInstalled/);
for (const marker of [
  '__v56StableReleaseCheckpointInstalled','__v561PracticeFirstStudentExperienceInstalled',
  '__v57aCrossDevicePastPaperResumeInstalled','__v57a1CrossDeviceLocalBridgeInstalled','__v57a2StaleLocalCheckpointCleanupInstalled',
  '__v57bTeacherAssignmentManagementInstalled','__v57cStudentContinueLearningHomeInstalled',
  '__v57dPastPaperAnalyticsActionsInstalled','__v57d1FocusPlanCopyFallbackInstalled'
]) assert(checkpoint.includes(marker),`Stable checkpoint is missing accepted module marker: ${marker}`);

assert.match(checkpoint,/V5\.6, V5\.5 and V5\.4 audit foundations remain retained below/);
assert.match(checkpoint,/v56-stable-release-audit/);
assert.match(checkpoint,/v55-stable-release-audit/);
assert.match(checkpoint,/v50-release-audit-root/);
assert.match(checkpoint,/\[0,100,300,900,1800,2600,3200\]/);
assert.doesNotMatch(checkpoint,/MutationObserver/);
assert.doesNotMatch(checkpoint,/cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(|fetch\(/);
assert.doesNotMatch(checkpoint,/localStorage|sessionStorage/);
assert.doesNotMatch(checkpoint,/grade_practice_response|request_practice_hint|finalize_exam_attempt|submit_practice_session|save_exam_attempt|get_student_questions|create_teacher_past_paper_assignments|update_teacher_past_paper_assignment|reassign_teacher_past_paper_assignment/i);

assert.match(releaseDoc,/4a5759ed81a89449531ae061b1de6e4f722dc86b/);
for (const phrase of ['V5.7A','V5.7B','V5.7C','V5.7D','V5.7D.1','No new Supabase migration or data mutation','Version 5.7 • Stable Release','student entry remains Practice-first','Exam Mode remains preserved']){
  assert(releaseDoc.includes(phrase),`V5.7 release checkpoint record is missing: ${phrase}`);
}

console.log('V5.7 Stable Release checkpoint checks passed.');
console.log('- consolidated cross-device and analytics-action owners retain all V5.7 historical install markers');
console.log('- untouched V57B/V57C remain in their original positions');
console.log('- Phase 4 V56/V57 integrity and dormant-reference guards run from the maintained stable verifier');
