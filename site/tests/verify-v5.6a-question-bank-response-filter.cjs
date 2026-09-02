const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const source = fs.readFileSync(path.join(site,'v56a-question-bank-response-filter.js'),'utf8');
const config = fs.readFileSync(path.join(site,'config.js'),'utf8');

new vm.Script(source,{filename:'v56a-question-bank-response-filter.js'});
const api = require(path.join(site,'v56a-question-bank-response-filter.js'));

assert.equal(api.responseType({response_type:null}),'text');
assert.equal(api.responseType({response_type:' Drawing '}),'drawing');
assert.equal(api.matchesResponseType({response_type:'drawing'},'teacher_review'),true);
assert.equal(api.matchesResponseType({response_type:'manual'},'teacher_review'),true);
assert.equal(api.matchesResponseType({response_type:'number'},'teacher_review'),false);
assert.equal(api.matchesResponseType({response_type:'drawing'},'auto_graded'),false);
assert.equal(api.matchesResponseType({response_type:'manual'},'auto_graded'),false);
assert.equal(api.matchesResponseType({response_type:'fraction'},'auto_graded'),true);
assert.equal(api.matchesResponseType({response_type:''},'text'),true);
assert.equal(api.matchesResponseType({response_type:'drawing'},'drawing'),true);
assert.equal(api.matchesResponseType({response_type:'manual'},'drawing'),false);

const rows = [
  {id:'a',response_type:'drawing'},
  {id:'b',response_type:'manual'},
  {id:'c',response_type:'number'},
  {id:'d',response_type:null}
];
assert.deepEqual(api.filterRows(rows,'teacher_review').map(row=>row.id),['a','b']);
assert.deepEqual(api.filterRows(rows,'auto_graded').map(row=>row.id),['c','d']);
assert.deepEqual(api.filterRows(rows,'all').map(row=>row.id),['a','b','c','d']);

for (const phrase of [
  'Requires teacher review — Drawing + Manual',
  'Drawing',
  'Manual / teacher response',
  'Auto-graded only',
  'Remove selected from Practice',
  'leaves Exam availability unchanged'
]) {
  assert(source.includes(phrase),`V5.6A UI is missing: ${phrase}`);
}

assert.match(source,/__v52b1QuestionBankPerformanceInstalled/,
  'Response filter must wait for the established 50-row Question Bank wrapper.');
assert.match(source,/__v54fBulkSelectionScopeSafetyInstalled/,
  'Response filter must wait for existing bulk-selection scope safety.');
assert.match(source,/select\.disabled = selected > 0/,
  'Response-type scope must lock while a bulk selection exists.');
assert.match(source,/teacherQuestions = filterRows\(original,filter\)/,
  'Filtered render must constrain the existing Question Bank renderer rather than replacing it.');
assert.match(source,/finally[\s\S]*teacherQuestions = original/,
  'Full teacherQuestions dataset must be restored after each filtered render.');

assert.doesNotMatch(source,/cloud\.from\(|cloud\.rpc\(|\bfetch\s*\(|\.update\s*\(|\.insert\s*\(|\.delete\s*\(/i,
  'V5.6A filter must not perform database/network writes.');
assert.doesNotMatch(source,/practice_eligible\s*=|active\s*=|exam_paper_settings/i,
  'V5.6A filter must not mutate Practice eligibility, active status or Exam publication.');

assert.match(config,/\.\/v55-stable-release-checkpoint\.js'[\s\S]*\.\/v56a-question-bank-response-filter\.js'/,
  'V5.6A must load after the signed-off V5.5 stable checkpoint.');

console.log('V5.6A Question Bank response-type filter checks passed.');
console.log('- drawing/manual teacher-review filtering and auto-graded filtering verified');
console.log('- existing paging and selection-safety boundaries retained');
console.log('- filter is read-only and does not change Practice or Exam availability by itself');
