const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');

const config = read('config.js');
const checkpoint = read('v55-stable-release-checkpoint.js');
const v55a = read('v55a-past-paper-practice.js');
const v55b = read('v55b-full-paper-practice.js');
const v55c = read('v55c-resume-past-paper-practice.js');
const v55c1 = read('v55c1-resume-button-bridge.js');
const v55d = read('v55d-past-paper-result-attribution.js');
const releaseDoc = read('RELEASE-CHECKPOINT-V5.5.md');

new vm.Script(checkpoint,{filename:'v55-stable-release-checkpoint.js'});

// V5.5 is now the explicit stable presentation identity.
assert.match(checkpoint,/const TITLE = 'Math Practice V5\.5'/);
assert.match(checkpoint,/const BADGE = 'Version 5\.5 • Stable Release'/);
assert.match(checkpoint,/V5\.5 Stable Release:/);
assert.match(checkpoint,/V5\.5 Release Audit/);

// Release note accurately consolidates the accepted Past Paper Practice sequence.
for (const phrase of [
  'Past Paper Practice',
  'Quick Session',
  'All Available Questions',
  'resume',
  'teacher results and exports',
  'Mixed Practice',
  'Topic Practice',
  'AI Learning Help',
  'Exam Mode'
]) {
  assert(checkpoint.includes(phrase),`V5.5 release note is missing: ${phrase}`);
}

// The accepted V5.5 runtime chain remains intact and the stable checkpoint loads last.
for (const loader of [
  './v55a-past-paper-practice.js',
  './v55a1-practice-type-guard.js',
  './v55b-full-paper-practice.js',
  './v55c-resume-past-paper-practice.js',
  './v55c1-resume-button-bridge.js',
  './v55d-past-paper-result-attribution.js',
  './v55-stable-release-checkpoint.js'
]) {
  assert(config.includes(loader),`V5.5 loader missing: ${loader}`);
}
assert.match(config,/\.\/v54-stable-release-checkpoint\.js'[\s\S]*\.\/v55a-past-paper-practice\.js'/,
  'Historical V5.4 checkpoint must remain before the V5.5 feature sequence.');
assert.match(config,/\.\/v55d-past-paper-result-attribution\.js'[\s\S]*\.\/v55-stable-release-checkpoint\.js'/,
  'V5.5 stable checkpoint must load after the accepted V5.5D feature layer.');

// Browser checkpoint checks correspond to the actual accepted module installation markers.
assert.match(v55a,/__v55aPastPaperPracticeInstalled/);
assert.match(v55b,/__v55bFullPaperPracticeInstalled/);
assert.match(v55c,/__v55cResumePastPaperPracticeInstalled/);
assert.match(v55c1,/__v55c1ResumeButtonBridgeInstalled/);
assert.match(v55d,/__v55dPastPaperResultAttributionInstalled/);
for (const marker of [
  '__v55aPastPaperPracticeInstalled',
  '__v55bFullPaperPracticeInstalled',
  '__v55cResumePastPaperPracticeInstalled',
  '__v55c1ResumeButtonBridgeInstalled',
  '__v55dPastPaperResultAttributionInstalled'
]) {
  assert(checkpoint.includes(marker),`Stable checkpoint is missing accepted module marker: ${marker}`);
}

// Release Audit consolidation is additive: the established V5.4 audits remain the foundation.
assert.match(checkpoint,/V5\.4 RC1-RC3 functional, security and production-polish audits remain the underlying foundation below/);
assert.match(checkpoint,/release-audit-panel/);
assert.match(checkpoint,/v50-release-audit-root/);

// Stable checkpoint stays presentation/audit-only.
assert.match(checkpoint,/\[0,80,220,600,1200\]/,'Checkpoint reapply burst must stay finite.');
assert.doesNotMatch(checkpoint,/MutationObserver/,'V5.5 stable checkpoint must not add a DOM observer.');
assert.doesNotMatch(checkpoint,/cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(|fetch\(/,
  'V5.5 stable checkpoint must not make network/data calls.');
assert.doesNotMatch(checkpoint,/localStorage|sessionStorage/,
  'V5.5 stable checkpoint must not persist application state.');
assert.doesNotMatch(checkpoint,/grade_practice_response|request_practice_hint|finalize_exam_attempt|submit_practice_session|save_exam_attempt|get_student_questions|exam_paper_settings/i,
  'V5.5 stable checkpoint must not alter grading, retrieval, submission or Exam publication behavior.');

// Checkpoint record is anchored to the accepted V5.5D production baseline.
assert.match(releaseDoc,/ab90f2b2e5d2078346794a6cd977ec542ea02fd0/);
for (const phrase of ['V5.5A','V5.5B','V5.5C','V5.5D','No Supabase migration','Version 5.5 • Stable Release']) {
  assert(releaseDoc.includes(phrase),`V5.5 release checkpoint record is missing: ${phrase}`);
}

console.log('V5.5 Stable Release checkpoint checks passed.');
console.log('- V5.5 title, badge, release note and Release Audit identity aligned');
console.log('- accepted V5.5A-D Past Paper Practice chain retained');
console.log('- checkpoint remains presentation/audit-only with no database or student-behavior changes');
