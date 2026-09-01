const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname,'..');
const api = require(path.join(root,'v54f-bulk-selection-scope-safety.js'));
const source = fs.readFileSync(path.join(root,'v54f-bulk-selection-scope-safety.js'),'utf8');
const release = fs.readFileSync(path.join(root,'v40-release.js'),'utf8');

assert.strictEqual(api.lockModel(0).locked,false,'No selection must leave Question Bank scope unlocked.');
assert.strictEqual(api.lockModel(3).locked,true,'A non-empty selection must lock Question Bank scope.');
assert.strictEqual(api.lockModel(3).count,3,'Lock model must preserve the selected count.');
assert.match(api.lockModel(3).message,/Clear selection/i,'Locked copy must tell the teacher how to change scope safely.');

for (const id of [
  'question-search','question-year','question-strand','question-exam-year','question-paper','question-status',
  'v51b1-qa-filter','v51b1-source-filter','v51b2c-review-filter','v54a-eligibility-filter'
]){
  assert.ok(api.FILTER_IDS.includes(id),`Scope lock must cover ${id}.`);
}

assert.strictEqual(api.SCOPE_BUTTON_SELECTOR,'.v52b-view,.v52b-select,#v52b-clear-focus','Topical set scope controls must be guarded.');
assert.match(source,/V51QuestionBankBulkStatus/,'V5.4F must reuse the established B2A selection state.');
assert.match(source,/v51b2a-clear-selection/,'Leaving Question Bank must clear through the established selection control.');
assert.match(source,/tab\.dataset\.panel !== 'questions-panel'/,'Leaving Question Bank must clear an armed selection.');
assert.match(source,/stopImmediatePropagation/,'Topical scope changes must be blocked while a selection is armed.');
assert.match(source,/v54f-selection-locked/,'The Question Bank must expose a locked visual state.');
assert.match(source,/aria-disabled/,'Topical scope controls must communicate their locked state accessibly.');
assert.doesNotMatch(source,/MutationObserver/,'V5.4F must not add a new MutationObserver.');
assert.doesNotMatch(source,/cloud\.|\.rpc\(|from\(['"]questions['"]\)|localStorage|sessionStorage/,'V5.4F must remain presentation/interaction only.');
assert.doesNotMatch(source,/practice_eligible\s*=|active\s*=|renderQuestions\s*=/,'V5.4F must not mutate question data or replace renderQuestions.');

const e = release.indexOf("loadScriptOnce('v54e-bulk-practice-eligibility.js?v=54e-1', 'data-v54e-bulk-practice-eligibility');");
const f = release.indexOf("loadScriptOnce('v54f-bulk-selection-scope-safety.js?v=54f-1', 'data-v54f-bulk-selection-scope-safety');");
assert.ok(e >= 0,'V5.4E loader must remain present.');
assert.ok(f > e,'V5.4F must load after V5.4E.');

console.log('V5.4F bulk selection scope safety checks passed.');
