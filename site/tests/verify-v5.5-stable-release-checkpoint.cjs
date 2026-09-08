const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');

const config = read('config.js');
const checkpoint = read('v55-stable-release-checkpoint.js');
const core = read('past-paper-core.js');
const resume = read('past-paper-resume.js');
const results = read('past-paper-results.js');
const releaseDoc = fs.readFileSync(path.join(site,'..','CHANGELOG.md'),'utf8');

new vm.Script(checkpoint,{filename:'v55-stable-release-checkpoint.js'});

// Historical V5.5 checkpoint identity delegates the current title/badge to version.js.
assert.match(checkpoint,/MathAppVersion\?\.CURRENT_RELEASE/);
assert.match(checkpoint,/MathAppVersion\?\.applyIdentity/);
assert.doesNotMatch(checkpoint,/const TITLE = 'Math Practice V5\.5'|const BADGE = 'Version 5\.5/);
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

// The accepted V5.5 behavior is now owned by core -> resume -> results; checkpoint still loads last.
for (const loader of [
  './past-paper-core.js',
  './past-paper-resume.js',
  './past-paper-results.js',
  './v55-stable-release-checkpoint.js'
]) {
  assert(config.includes(loader),`V5.5 active loader missing: ${loader}`);
}
assert.match(config,/\.\/v54-stable-release-checkpoint\.js'[\s\S]*\.\/past-paper-core\.js'/,
  'Historical V5.4 checkpoint must remain before consolidated V5.5 core.');
assert.match(config,/\.\/past-paper-core\.js'[\s\S]*\.\/past-paper-resume\.js'[\s\S]*\.\/past-paper-results\.js'[\s\S]*\.\/v55-stable-release-checkpoint\.js'/,
  'V5.5 core -> resume -> results must load before the stable checkpoint.');

// Browser checkpoint checks correspond to the historical installation markers retained by the consolidated owners.
assert.match(core,/__v55aPastPaperPracticeInstalled/);
assert.match(core,/__v55bFullPaperPracticeInstalled/);
assert.match(resume,/__v55cResumePastPaperPracticeInstalled/);
assert.match(resume,/__v55c1ResumeButtonBridgeInstalled/);
assert.match(results,/__v55dPastPaperResultAttributionInstalled/);
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

// Historical checkpoint record remains preserved in the consolidated changelog.
assert.match(releaseDoc,/ab90f2b2e5d2078346794a6cd977ec542ea02fd0/);
for (const phrase of ['V5.5A','V5.5B','V5.5C','V5.5D','No Supabase migration','Version 5.5 • Stable Release']) {
  assert(releaseDoc.includes(phrase),`V5.5 release checkpoint record is missing: ${phrase}`);
}

// Phase 4 V55 consolidation guards are invoked from this maintained verifier so
// Consolidated CI cannot skip the new loader/lifecycle and exhaustive stale-reference checks.
require('./verify-phase4-past-paper-v55-checkpoint1-integrity.cjs');
require('./verify-phase4-past-paper-v55-dormant-reference-integrity.cjs');

console.log('V5.5 Stable Release checkpoint checks passed.');
console.log('- historical V5.5 checkpoint uses the shared current title/badge source');
console.log('- accepted V5.5A-D behavior retained under core/resume/results ownership');
console.log('- checkpoint remains presentation/audit-only with no database or student-behavior changes');
