const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');
const config = read('config.js');
const release = read('v40-release.js');
const polish = read('release-audit-ui.js');
const audit = polish;
const checkpoint = read('v54-stable-release-checkpoint.js');
const versionSource = read('version.js');
const ui = read('resource-bank-ui.js');
const bulk = read('resource-bank-bulk.js');

new vm.Script(checkpoint,{filename:'v54-stable-release-checkpoint.js'});
new vm.Script(versionSource,{filename:'version.js'});
new vm.Script(ui,{filename:'resource-bank-ui.js'});
new vm.Script(bulk,{filename:'resource-bank-bulk.js'});

assert.match(config,/\.\/version\.js'/);
assert.match(polish,/MathAppVersion\?\.applyIdentity/);
assert.match(checkpoint,/MathAppVersion\?\.CURRENT_RELEASE/);
assert.match(checkpoint,/MathAppVersion\?\.applyIdentity/);
assert.doesNotMatch(polish,/const TITLE = 'Math Practice V5\.4'|const BADGE = 'Version 5\.4/);
assert.doesNotMatch(checkpoint,/const TITLE = 'Math Practice V5\.4'|const BADGE = 'Version 5\.4/);
assert.match(polish,/phase:'V5\.4Stable'/);
assert.match(audit,/V5\.4 Release Audit/);
assert.match(audit,/stable V5\.4 baseline/);
assert.match(checkpoint,/V5\.4 Stable Release:/);
assert.match(config,/\.\/v40-start-shell\.js'[\s\S]*\.\/v54-stable-release-checkpoint\.js'/,'V5.4 checkpoint must load after start shell.');

for (const phrase of [
  'Practice and Exam','unified Practice resource bank','past-paper and topical-exercise questions',
  'individual and bulk Practice eligibility controls','compact 50-card Question Bank browsing',
  'safe bulk-selection scope','whole-set topical management','Deterministic grading','AI-free Exam Mode'
]) assert(checkpoint.includes(phrase),`V5.4 release note is missing: ${phrase}`);

assert(release.includes("loadScriptOnce('resource-bank-ui.js', 'data-resource-bank-ui');"),'A-D consolidated owner must load');
assert(release.includes("loadScriptOnce('resource-bank-bulk.js', 'data-resource-bank-bulk');"),'E-F consolidated owner must load');
assert(release.includes("loadScriptOnce('v52b1-question-bank-performance.js?v=52b1-3', 'data-v52b1-question-bank-performance');"),'V54G performance owner must remain untouched');
for(const marker of [
  '/* V5.4A — Unified Teacher Resource Bank visibility.','/* V5.4B — Teacher Practice eligibility controls.',
  '/* V5.4C — Compact Teacher Question Bank browsing.','/* V5.4D — Topical Resource Library simplification.'
]) assert(ui.includes(marker),`Consolidated UI owner missing ${marker}`);
for(const marker of ['/* V5.4E — Bulk Practice eligibility controls.','/* V5.4F — Bulk selection scope safety.'])
  assert(bulk.includes(marker),`Consolidated bulk owner missing ${marker}`);
for(const token of ['V54AResourceBankVisibility','V54BPracticeEligibilityControls','V54CCompactQuestionBank','V54DTopicalResourceSimplification'])
  assert(ui.includes(token),`Consolidated UI owner missing ${token}`);
for(const token of ['V54EBulkPracticeEligibility','V54FBulkSelectionScopeSafety'])
  assert(bulk.includes(token),`Consolidated bulk owner missing ${token}`);

assert.match(checkpoint,/V50ProductionPolish\?\.refresh/);
assert.match(checkpoint,/\[0,80,220,600\]/);
assert.doesNotMatch(checkpoint,/MutationObserver/);
assert.doesNotMatch(checkpoint,/cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(|fetch\(/);
assert.doesNotMatch(checkpoint,/localStorage|sessionStorage/);
assert.doesNotMatch(checkpoint,/grade_practice_response|request_practice_hint|finalize_exam_attempt|submit_practice_session|save_exam_attempt|get_student_questions|exam_paper_settings/i);

console.log('V5.4 Stable Release checkpoint checks passed.');
console.log('- historical checkpoint remains presentation-only and byte-frozen');
console.log('- consolidated V54A-F owners plus untouched V54G performance revision retained');
