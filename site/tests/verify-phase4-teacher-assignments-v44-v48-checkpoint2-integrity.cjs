const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(siteRoot, name), 'utf8');

const release = read('v40-release.js');
const interventions = read('assignment-interventions.js');
const queueSupport = read('assignment-intervention-queue-support.js');
const history = read('assignment-intervention-history.js');
const deadlines = read('assignment-deadlines.js');

const retired = [
  'v44-action-center-practice.js',
  'v44-shared-focus-groups.js',
  'v44-intervention-follow-through.js',
  'v44-intervention-highlight-clarity.js',
  'v45-intervention-outcomes.js',
  'v46-intervention-export.js',
  'v47-intervention-history.js',
  'v47-follow-up-from-history.js',
  'v47-class-intervention-overview.js',
  'v48-teacher-deadline-monitoring.js',
  'v48-student-deadline-experience.js',
  'v48-deadline-follow-up.js',
];

const active = [
  'assignment-interventions.js',
  'v45-intervention-queue.js',
  'assignment-intervention-queue-support.js',
  'assignment-intervention-history.js',
  'assignment-deadlines.js',
];

// 1) Historical owners stay dormant while the four phase-preserving owners are staged once.
for (const name of retired) {
  assert.equal(release.includes(name), false, `${name} must be dormant in the active loader`);
  assert.equal(fs.existsSync(path.join(siteRoot, name)), true, `${name} must remain in the repository as a dormant reference`);
}
for (const name of active) {
  assert.equal((release.match(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1,
    `${name} must be staged exactly once`);
}

// 2) Preserve the real release-phase order exactly: V44 -> external V45A -> V45B/V46 -> V47 -> V48.
let previous = -1;
for (const name of active) {
  const index = release.indexOf(name);
  assert.ok(index > previous, `${name} must remain after its previous phase dependency`);
  previous = index;
}
assert.match(release, /loadScriptOnce\('v45-intervention-queue\.js\?v=45a-1', 'data-v45a-intervention-queue'\)/,
  'Untouched V45A must remain the external queue owner in its existing loader phase');

// 3) New modules are exact concatenations of the historical owners plus checkpoint boundary comments.
function expectedCombined(files, boundaries) {
  let value = read(files[0]);
  for (let i = 1; i < files.length; i += 1) {
    value += `\n\n/* Phase 4 checkpoint 2 boundary: ${boundaries[i - 1]} */\n\n` + read(files[i]);
  }
  return value;
}
assert.equal(interventions, expectedCombined([
  'v44-action-center-practice.js',
  'v44-shared-focus-groups.js',
  'v44-intervention-follow-through.js',
  'v44-intervention-highlight-clarity.js',
], ['V44B', 'V44C', 'V44C clarity']), 'V44 source must remain character-for-character equivalent');
assert.equal(queueSupport, expectedCombined([
  'v45-intervention-outcomes.js',
  'v46-intervention-export.js',
], ['V46A']), 'V45B/V46 source must remain character-for-character equivalent');
assert.equal(history, expectedCombined([
  'v47-intervention-history.js',
  'v47-follow-up-from-history.js',
  'v47-class-intervention-overview.js',
], ['V47B', 'V47C']), 'V47 source must remain character-for-character equivalent');
assert.equal(deadlines, expectedCombined([
  'v48-teacher-deadline-monitoring.js',
  'v48-student-deadline-experience.js',
  'v48-deadline-follow-up.js',
], ['V48B', 'V48C']), 'V48 source must remain character-for-character equivalent');

// 4) The preserved V43B DOM contract remains the only assignment-builder coupling.
for (const token of ['#v43b-student-options', '#v43b-strand', '#v43b-topic', '#v43b-count']) {
  assert.ok(interventions.includes(token), `V44 must preserve ${token}`);
  assert.ok(history.includes(token), `V47 follow-up must preserve ${token}`);
}
for (const token of ['#v43b-practice-assignment-admin', '.v43b-toggle[data-id]', '.v43b-card']) {
  assert.ok(interventions.includes(token), `V44 review path must preserve ${token}`);
}
assert.match(deadlines, /ASSIGNMENT_SECTION_ID = 'v43b-practice-assignment-admin'/);
assert.match(deadlines, /ASSIGNMENT_LIST_ID = 'v43b-list'/);

// 5) These consumers do not acquire assignment-renderer or Practice lifecycle ownership.
for (const [name, source] of [['interventions', interventions], ['queue support', queueSupport], ['history', history], ['deadlines', deadlines]]) {
  assert.doesNotMatch(source, /renderClassAdmin\s*=\s*(?:async\s*)?function|ROOT\.renderClassAdmin\s*=/,
    `${name} must not wrap/own renderClassAdmin`);
  assert.doesNotMatch(source, /(?:ROOT\.)?(?:startPractice|nextQuestion|finishPractice)\s*=\s*(?:async\s*)?function/,
    `${name} must not own the Practice lifecycle`);
}

// 6) V45B displays authoritative recorded outcome fields only; no invented improvement metric or writes.
assert.match(queueSupport, /practice_session_id/);
assert.match(queueSupport, /Completed Practice outcome:/);
assert.match(queueSupport, /first_try_percent/);
assert.match(queueSupport, /mastery_percent/);
assert.match(queueSupport, /hints_used/);
assert.doesNotMatch(queueSupport, /improvement_(?:score|percent)|score_improvement|mastery_delta/,
  'Completed outcomes must not invent a new improvement score');
const v45b = queueSupport.slice(0, queueSupport.indexOf('/* Phase 4 checkpoint 2 boundary: V46A */'));
assert.doesNotMatch(v45b, /\.insert\(|\.update\(|\.delete\(|cloud\.rpc\(/,
  'Completed outcome decoration must remain read-only');

// 7) V46 export is a browser export only: no assignment creation/update and no analytics mutation.
const v46 = queueSupport.slice(queueSupport.indexOf('/* Phase 4 checkpoint 2 boundary: V46A */'));
assert.match(v46, /v45bOutcomeSession/);
assert.match(v46, /v45-intervention-queue-tools/);
assert.match(v46, /Export queue CSV/);
assert.match(v46, /saveCsv\(/);
assert.doesNotMatch(v46, /cloud\.rpc\(|cloud\.from\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(/,
  'Queue export must not create/update assignments or write analytics data');
assert.doesNotMatch(v46, /(?:^|[;\n])\s*(?:analyticsVisibleRows|analyticsContext|teacherResults)\s*=(?!=)/m,
  'Queue export must not assign over analytics evidence');

// 8) Deadline write remains restricted to target date metadata and preserves the event/observer chain.
assert.match(deadlines, /const payload = \{[\s\S]*?closes_at:value,[\s\S]*?updated_at:new Date\(\)\.toISOString\(\)[\s\S]*?\}/);
assert.match(deadlines, /math-practice-assignments-changed/);
assert.match(deadlines, /window\.addEventListener\('math-practice-assignments-changed'/);
assert.match(deadlines, /listObserver\.observe\(list,\{childList:true\}\)/);
assert.doesNotMatch(deadlines, /payload\s*=\s*\{[^}]*\bactive\s*:/,
  'Deadline editing must not change assignment active/access state');

// 9) Student deadline layer continues to decorate the existing assignment cards without a second data path.
const v48bMarker = '/* Phase 4 checkpoint 2 boundary: V48B */';
const v48cMarker = '/* Phase 4 checkpoint 2 boundary: V48C */';
const v48b = deadlines.slice(deadlines.indexOf(v48bMarker), deadlines.indexOf(v48cMarker));
for (const token of ['v42b-student-practice-assignments', 'v42b-student-card', 'v42b-start-practice-assignment']) {
  assert.ok(v48b.includes(token), `Student deadline layer must preserve ${token}`);
}
assert.doesNotMatch(v48b, /cloud\.|fetch\(|XMLHttpRequest/,
  'Student deadline experience must not create a second assignment-data request');

// 10) Frozen/external dependency set is explicit here; byte identity is audited against main at checkpoint end.
const protectedRuntime = [
  'assignments-core.js', 'assignments-student.js', 'assignments-teacher.js',
  'v45-intervention-queue.js',
  'past-paper-core.js', 'past-paper-resume.js', 'past-paper-results.js',
  'v57b-teacher-assignment-management.js', 'v57c-student-continue-learning-home.js',
  'gamification-core.js', 'gamification-student.js', 'gamification-teacher.js',
  'v58a-student-first-use-experience.js', 'v58b-teacher-workspace-consolidation.js',
  'v58c-parent-friendly-student-report.js', 'v58c-parent-summary-workspace-shortcut.js',
  'v58d-content-workflow-consolidation.js', 'v581a-practice-cloud-result-reconciliation.js',
  'v58-stable-release-checkpoint.js',
];
for (const name of protectedRuntime) assert.equal(fs.existsSync(path.join(siteRoot, name)), true, `Protected runtime ${name} must remain present`);
const supabaseRoot = path.resolve(siteRoot, '..', 'supabase');
const sqlFiles = fs.readdirSync(supabaseRoot).filter(name => name.endsWith('.sql'));
assert.ok(sqlFiles.length > 0, 'Protected Supabase SQL set must be non-empty');

// 11) The maintained V5.8 gate must also execute the exact approved-main Git-object audit.
require('./verify-phase4-teacher-assignments-checkpoint2-protected-sha.cjs');

console.log('Phase 4 teacher assignments V44-V48 checkpoint 2 integrity passed.');
console.log('- four phase-preserving owners retain exact historical source behavior');
console.log('- untouched V45A remains between V44 and V45B/V46');
console.log('- V43B DOM, read-only outcomes/export, and deadline event contracts are preserved');
console.log(`- protected audit scope explicitly includes ${protectedRuntime.length} runtime files and ${sqlFiles.length} Supabase SQL files`);