const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname,'..');
const modulePath=path.join(root,'resource-bank-bulk.js');
const all=fs.readFileSync(modulePath,'utf8');
const e0=all.indexOf('/* V5.4E — Bulk Practice eligibility controls.');
const f0=all.indexOf('/* V5.4F — Bulk selection scope safety.');
assert(e0>=0&&f0>e0,'Consolidated bulk owner must preserve E→F order');
const source=all.slice(f0);
const release=fs.readFileSync(path.join(root,'v40-release.js'),'utf8');
global.window=global;
require(modulePath);
const api=global.V54FBulkSelectionScopeSafety;

assert.strictEqual(api.lockModel(0).locked,false);
assert.strictEqual(api.lockModel(3).locked,true);
assert.strictEqual(api.lockModel(3).count,3);
assert.match(api.lockModel(3).message,/Clear selection/i);
for (const id of [
  'question-search','question-year','question-strand','question-exam-year','question-paper','question-status',
  'v51b1-qa-filter','v51b1-source-filter','v51b2c-review-filter','v54a-eligibility-filter'
]) assert.ok(api.FILTER_IDS.includes(id),`Scope lock must cover ${id}.`);
assert.strictEqual(api.SCOPE_BUTTON_SELECTOR,'.v52b-view,.v52b-select,#v52b-clear-focus');
assert.match(source,/V51QuestionBankBulkStatus/);
assert.match(source,/v51b2a-clear-selection/);
assert.match(source,/tab\.dataset\.panel !== 'questions-panel'/);
assert.match(source,/stopImmediatePropagation/);
assert.match(source,/v54f-selection-locked/);
assert.match(source,/aria-disabled/);
assert.doesNotMatch(source,/MutationObserver/);
assert.doesNotMatch(source,/cloud\.|\.rpc\(|from\(['"]questions['"]\)|localStorage|sessionStorage/);
assert.doesNotMatch(source,/practice_eligible\s*=|active\s*=|renderQuestions\s*=/);
assert.match(source,/addEventListener\('click',[\s\S]*true\);/,'Scope guard must remain capture-phase');
assert(release.includes("loadScriptOnce('resource-bank-bulk.js', 'data-resource-bank-bulk');"));
console.log('V5.4F bulk selection scope safety checks passed against consolidated owner.');
