const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const source = fs.readFileSync(path.join(site,'v56a-question-bank-response-filter.js'),'utf8');
const config = fs.readFileSync(path.join(site,'config.js'),'utf8');
const ui = fs.readFileSync(path.join(site,'resource-bank-ui.js'),'utf8');
const bulk = fs.readFileSync(path.join(site,'resource-bank-bulk.js'),'utf8');

new vm.Script(source,{filename:'v56a-question-bank-response-filter.js'});
const api = require(path.join(site,'v56a-question-bank-response-filter.js'));

assert.equal(api.responseType({response_type:null}),'text');
assert.equal(api.responseType({response_type:' Drawing '}),'drawing');
assert.equal(api.sourceType({source_type:' Topical Exercise '}),'topical_exercise');
assert.equal(api.isTopical({source_type:'topical_exercise'}),true);
assert.equal(api.isTopical({source_type:'past_paper'}),false);
assert.equal(api.matchesResponseType({response_type:'drawing'},'teacher_review'),true);
assert.equal(api.matchesResponseType({response_type:'manual'},'teacher_review'),true);
assert.equal(api.matchesResponseType({response_type:'number'},'teacher_review'),false);
assert.equal(api.matchesResponseType({response_type:'drawing'},'auto_graded'),false);
assert.equal(api.matchesResponseType({response_type:'manual'},'auto_graded'),false);
assert.equal(api.matchesResponseType({response_type:'fraction'},'auto_graded'),true);
assert.equal(api.matchesResponseType({response_type:''},'text'),true);
assert.equal(api.matchesResponseType({response_type:'drawing'},'drawing'),true);
assert.equal(api.matchesResponseType({response_type:'manual'},'drawing'),false);
assert.equal(api.matchesResponseType({response_type:'drawing',source_type:'past_paper'},'drawing_practice'),true);
assert.equal(api.matchesResponseType({response_type:'drawing',source_type:'topical_exercise'},'drawing_practice'),false);
assert.equal(api.matchesResponseType({response_type:'manual',source_type:'past_paper'},'teacher_review_practice'),true);
assert.equal(api.matchesResponseType({response_type:'manual',source_type:'topical_exercise'},'teacher_review_practice'),false);
const rows=[
  {id:'a',response_type:'drawing',source_type:'past_paper'}, {id:'b',response_type:'manual',source_type:'past_paper'},
  {id:'c',response_type:'number',source_type:'past_paper'}, {id:'d',response_type:null,source_type:'past_paper'},
  {id:'e',response_type:'drawing',source_type:'topical_exercise'}, {id:'f',response_type:'manual',source_type:'topical_exercise'}
];
assert.deepEqual(api.filterRows(rows,'teacher_review').map(row=>row.id),['a','b','e','f']);
assert.deepEqual(api.filterRows(rows,'teacher_review_practice').map(row=>row.id),['a','b']);
assert.deepEqual(api.filterRows(rows,'drawing_practice').map(row=>row.id),['a']);
assert.deepEqual(api.filterRows(rows,'auto_graded').map(row=>row.id),['c','d']);
assert.deepEqual(api.filterRows(rows,'all').map(row=>row.id),['a','b','c','d','e','f']);

for(const phrase of ['Requires teacher review — non-topical only','Drawing — non-topical only','Drawing — all sources','Manual / teacher response','Auto-graded only','Remove selected from Practice','Topical Exercise rows are excluded'])
  assert(source.includes(phrase),`V5.6A UI is missing: ${phrase}`);
assert.match(source,/__v52b1QuestionBankPerformanceInstalled/);
assert.match(source,/__v54fBulkSelectionScopeSafetyInstalled/,'V56A must wait for V54F readiness flag');
assert.match(source,/select\.disabled = selected > 0/);
assert.match(source,/teacherQuestions = filterRows\(original,filter\)/);
assert.match(source,/finally[\s\S]*teacherQuestions = original/);
assert.doesNotMatch(source,/cloud\.from\(|cloud\.rpc\(|\bfetch\s*\(|\.update\s*\(|\.insert\s*\(|\.delete\s*\(/i);
assert.doesNotMatch(source,/practice_eligible\s*=|active\s*=|exam_paper_settings/i);
assert.match(config,/\.\/v55-stable-release-checkpoint\.js'[\s\S]*\.\/v56a-question-bank-response-filter\.js'/);

// Bind the readiness/listener assertions to the active consolidated V54 owners.
assert(bulk.includes('__v54fBulkSelectionScopeSafetyInstalled'),'Consolidated bulk owner must publish exact V54F readiness flag');
assert(ui.includes('v54b-practice-toggle'),'Consolidated UI owner must retain V54B listener class');
assert(bulk.includes('v54e-add-practice')&&bulk.includes('v54e-remove-practice'),'Consolidated bulk owner must retain V54E button IDs');
assert(source.includes('.v54b-practice-toggle')&&source.includes('#v54e-add-practice')&&source.includes('#v54e-remove-practice'),'V56A listeners must remain bound to exact V54 contracts');

console.log('V5.6A Question Bank response-type filter checks passed.');
console.log('- consolidated V54F readiness and V54B/E listener contracts verified');
