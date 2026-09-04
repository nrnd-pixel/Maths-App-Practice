const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');

const config = read('config.js');
const checkpoint = read('v58-stable-release-checkpoint.js');
const v58a = read('v58a-student-first-use-experience.js');
const v58b = read('v58b-teacher-workspace-consolidation.js');
const v58c = read('v58c-parent-friendly-student-report.js');
const v58d = read('v58d-content-workflow-consolidation.js');
const v575 = read('v575-gamification-stable-checkpoint.js');
const v576 = read('v576-classroom-feedback-support.js');
const releaseDoc = read('RELEASE-CHECKPOINT-V5.8.md');

new vm.Script(checkpoint,{filename:'v58-stable-release-checkpoint.js'});

// V5.8 is the explicit stable presentation identity.
assert.match(checkpoint,/const TITLE = 'Math Practice V5\.8'/);
assert.match(checkpoint,/const BADGE = 'Version 5\.8 • Stable Release'/);
assert.match(checkpoint,/V5\.8 Stable Release:/);
assert.match(checkpoint,/V5\.8 Release Audit/);

// Release note accurately consolidates the accepted V5.8 sequence.
for (const phrase of [
  'clearer first Practice experience',
  'cleaner task-based workspace',
  'parent-friendly Practice progress summary',
  'consolidated content workflow',
  'Practice-first Home',
  'Exam engine'
]) {
  assert(checkpoint.includes(phrase),`V5.8 release note is missing: ${phrase}`);
}

// Accepted runtime chain remains intact and the stable checkpoint loads last.
for (const loader of [
  './v58a-student-first-use-experience.js',
  './v58b-teacher-workspace-consolidation.js',
  './v58c-parent-friendly-student-report.js',
  './v58c-parent-summary-workspace-shortcut.js',
  './v58d-content-workflow-consolidation.js',
  './v58-stable-release-checkpoint.js'
]) {
  assert(config.includes(loader),`V5.8 loader missing: ${loader}`);
}
assert.match(config,/\.\/v58d-content-workflow-consolidation\.js'[\s\S]*\.\/v58-stable-release-checkpoint\.js'/,
  'V5.8 stable checkpoint must load after V5.8D.');

// Browser checkpoint checks correspond to accepted installation markers.
assert.match(v58a,/__v58aStudentFirstUseExperienceInstalled/);
assert.match(v58b,/__v58bTeacherWorkspaceInstalled/);
assert.match(v58c,/__v58cParentFriendlyStudentReportInstalled/);
assert.match(v58d,/__v58dContentWorkflowInstalled/);
assert.match(v575,/__v575GamificationStableCheckpointInstalled/);
assert.match(v576,/__v576ClassroomFeedbackSupportInstalled/);
for (const marker of [
  '__v58aStudentFirstUseExperienceInstalled',
  '__v58bTeacherWorkspaceInstalled',
  '__v58cParentFriendlyStudentReportInstalled',
  '__v58dContentWorkflowInstalled',
  '__v57StableReleaseCheckpointInstalled',
  '__v575GamificationStableCheckpointInstalled',
  '__v576ClassroomFeedbackSupportInstalled'
]) {
  assert(checkpoint.includes(marker),`Stable checkpoint is missing accepted module marker: ${marker}`);
}

// Release Audit consolidation is additive and retains earlier foundations.
assert.match(checkpoint,/v57-stable-release-audit/);
assert.match(checkpoint,/v56-stable-release-audit/);
assert.match(checkpoint,/v50-release-audit-root/);
assert.match(checkpoint,/Earlier stable audit foundations remain retained below/);

// V5.8 must finish after the retained V5.7.5 identity burst at 4300ms.
assert.match(v575,/\[0,120,420,1100,2200,3400,4300\]/,
  'Expected retained V5.7.5 identity burst was not found.');
assert.match(checkpoint,/\[0,120,420,1100,2200,3400,4600,5200\]/,
  'V5.8 stable identity must finish after all earlier retained identity bursts.');

// Stable checkpoint remains presentation/audit-only.
assert.doesNotMatch(checkpoint,/MutationObserver/,'V5.8 stable checkpoint must not add a DOM observer.');
assert.doesNotMatch(checkpoint,/cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(|fetch\(/,
  'V5.8 stable checkpoint must not make network/data calls.');
assert.doesNotMatch(checkpoint,/localStorage|sessionStorage/,
  'V5.8 stable checkpoint must not persist application state.');
assert.doesNotMatch(checkpoint,/grade_practice_response|request_practice_hint|finalize_exam_attempt|submit_practice_session|save_exam_attempt|get_student_questions|create_teacher_past_paper_assignments|update_teacher_past_paper_assignment|save_question_practice_eligibility|save_topical_exercise_setting/i,
  'V5.8 stable checkpoint must not alter grading, retrieval, submission, assignment, content publication or Exam behavior.');

// Checkpoint record is anchored to the accepted V5.8D production baseline.
assert.match(releaseDoc,/4f88bc2153c32434a130dbe54310595839148423/);
for (const phrase of [
  'V5.8A',
  'V5.8B',
  'V5.8C',
  'V5.8D',
  'No new Supabase migration or data mutation',
  'Version 5.8 • Stable Release',
  'student entry remains Practice-first',
  'Exam Mode remains preserved'
]) {
  assert(releaseDoc.includes(phrase),`V5.8 release checkpoint record is missing: ${phrase}`);
}

console.log('V5.8 Stable Release checkpoint checks passed.');
console.log('- V5.8 title, badge, release note and Release Audit identity aligned');
console.log('- accepted V5.8A-D feature chain retained over the V5.7 foundation');
console.log('- V5.8 identity finishes after earlier retained checkpoint bursts');
console.log('- checkpoint remains presentation/audit-only with no database or student-behavior changes');
