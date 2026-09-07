const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');

const config = read('config.js');
const checkpoint = read('v575-gamification-stable-checkpoint.js');
const core = read('gamification-core.js');
const student = read('gamification-student.js');
const teacher = read('gamification-teacher.js');
const releaseDoc = fs.readFileSync(path.join(site,'..','CHANGELOG.md'),'utf8');

new vm.Script(checkpoint,{filename:'v575-gamification-stable-checkpoint.js'});

assert.match(checkpoint,/MathAppVersion\?\.CURRENT_RELEASE/);
assert.match(checkpoint,/MathAppVersion\?\.applyIdentity/);
assert.doesNotMatch(checkpoint,/const TITLE = 'Math Practice V5\.7\.5'|const BADGE = 'Version 5\.7\.5/);
assert.match(checkpoint,/V5\.7\.5 Gamified Practice Release:/);
assert.match(checkpoint,/V5\.7\.5 Release Audit/);

for (const phrase of [
  'server-derived XP and levels',
  'gentle streaks',
  'achievement badges',
  'weekly missions',
  'cooperative class challenge',
  'without ranking students',
  'enable, pause or tune',
  'Continue Learning',
  'hidden Exam infrastructure'
]) {
  assert(checkpoint.includes(phrase),`V5.7.5 release note is missing: ${phrase}`);
}

for (const loader of [
  './gamification-core.js',
  './gamification-student.js',
  './gamification-teacher.js',
  './v575-gamification-stable-checkpoint.js'
]) {
  assert(config.includes(loader),`V5.7.5 loader missing: ${loader}`);
}
for (const retiredLoader of [
  './v571a-gamification-foundation.js',
  './v571b-streaks-achievements.js',
  './v572-weekly-missions.js',
  './v573-class-challenges-teacher-gamification.js',
  './v574-gamification-polish-teacher-controls.js'
]) {
  assert(!config.includes(retiredLoader),`Checkpoint 2 must not actively load retired gamification layer: ${retiredLoader}`);
}
assert.match(config,/\.\/v57-stable-release-checkpoint\.js'[\s\S]*\.\/gamification-core\.js'[\s\S]*\.\/gamification-student\.js'[\s\S]*\.\/gamification-teacher\.js'[\s\S]*\.\/v575-gamification-stable-checkpoint\.js'/,
  'Consolidated gamification must remain layered on top of V5.7 and before the untouched V5.7.5 checkpoint.');

assert.match(core,/get_student_gamification_v571a/);
assert.match(core,/get_student_gamification_achievements_v571b/);
assert.match(core,/get_student_weekly_missions_v572/);
assert.match(core,/get_student_class_challenge_v574/);
assert.match(core,/get_teacher_class_gamification_v574/);
assert.match(core,/update_teacher_class_challenge_v574/);
assert.match(student,/__v571aGamificationFoundationInstalled/);
assert.match(student,/__v571bStreaksAchievementsInstalled/);
assert.match(student,/__v572WeeklyMissionsInstalled/);
assert.match(teacher,/__v573ClassChallengesTeacherGamificationInstalled/);
assert.match(teacher,/__v574GamificationPolishTeacherControlsInstalled/);
for (const marker of [
  '__v57StableReleaseCheckpointInstalled',
  '__v571aGamificationFoundationInstalled',
  '__v571bStreaksAchievementsInstalled',
  '__v572WeeklyMissionsInstalled',
  '__v573ClassChallengesTeacherGamificationInstalled',
  '__v574GamificationPolishTeacherControlsInstalled'
]) {
  assert(checkpoint.includes(marker),`V5.7.5 checkpoint is missing accepted marker: ${marker}`);
}

// Historical V573/V574 global contracts remain available to any downstream caller.
assert.match(teacher,/Object\.defineProperty\(window,'V573ClassChallengesTeacherGamification'/);
assert.match(teacher,/Object\.defineProperty\(window,'V574GamificationPolishTeacherControls'/);

assert.match(checkpoint,/v57-stable-release-audit/);
assert.match(checkpoint,/v56-stable-release-audit/);
assert.match(checkpoint,/v50-release-audit-root/);
assert.match(checkpoint,/\[0,120,420,1100,2200,3400,4300\]/,
  'V5.7.5 identity reapply burst must remain finite.');
assert.doesNotMatch(checkpoint,/MutationObserver/,
  'V5.7.5 stable checkpoint must not add a DOM observer.');
assert.doesNotMatch(checkpoint,/cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(|fetch\(/,
  'V5.7.5 stable checkpoint must not make network/data calls.');
assert.doesNotMatch(checkpoint,/localStorage|sessionStorage/,
  'V5.7.5 stable checkpoint must not persist application state.');
assert.doesNotMatch(checkpoint,/grade_practice_response|request_practice_hint|finalize_exam_attempt|submit_practice_session|save_exam_attempt|get_student_questions|update_teacher_class_challenge_v574/i,
  'V5.7.5 stable checkpoint must not alter grading, retrieval, Exam behavior or teacher settings writes.');

assert.match(releaseDoc,/cada087966746a0fdbdba71912470d5705bb568e/);
for (const phrase of [
  'V5.7.1A',
  'V5.7.1B',
  'V5.7.2',
  'V5.7.3',
  'V5.7.4',
  'Version 5.7.5 • Gamified Practice Release',
  'No new Supabase migration or data mutation',
  'Student entry remains Practice-first',
  'Exam Mode remains preserved',
  'No leaderboard'
]) {
  assert(releaseDoc.includes(phrase),`V5.7.5 release checkpoint record is missing: ${phrase}`);
}

console.log('V5.7.5 Gamification Stable Release checkpoint checks passed after Checkpoint 2.');
console.log('- V5.7.1A–V5.7.4 browser behavior is supplied by core/student/teacher modules');
console.log('- exact historical installation flags and global compatibility APIs are retained');
console.log('- V5.7.5 checkpoint remains untouched presentation/audit-only infrastructure');
