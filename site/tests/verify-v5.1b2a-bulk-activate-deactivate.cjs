const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const sourcePath = path.join(__dirname,'..','v51-question-bank-bulk-status.js');
const source = fs.readFileSync(sourcePath,'utf8');

const profiles = new Map([
  ['6|2019|paper2',{key:'6|2019|paper2',status:'incomplete',examYear:2019,paper:'Paper 2'}],
  ['6|2020|paper2',{key:'6|2020|paper2',status:'pass',examYear:2020,paper:'Paper 2'}]
]);

const qa = {
  qaFlags(row){ return (row._flags || []).map(key=>({key,label:key==='metadata'?'Metadata: question number':key})); },
  paperKey(row){ return `6|${row.exam_year}|paper2`; },
  buildQaContext(){ return {profileByKey:profiles}; }
};

const sandbox = { window:{V51QuestionBankQA:qa} };
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'v51-question-bank-bulk-status.js'});
const bulk = sandbox.window.V51QuestionBankBulkStatus;
assert(bulk,'V51QuestionBankBulkStatus API should be exposed');

const rows = [
  {id:'q28',exam_year:2019,paper:'Paper 2',question_number:'28',active:false,_flags:[]},
  {id:'bad',exam_year:2020,paper:'Paper 2',question_number:'15',active:false,_flags:['metadata']},
  {id:'active',exam_year:2020,paper:'Paper 2',question_number:'16',active:true,_flags:[]},
  {id:'inactive-clean',exam_year:2020,paper:'Paper 2',question_number:'17',active:false,_flags:[]}
];
const context = qa.buildQaContext(rows);

const selected = new Set(['q28','bad','active','inactive-clean']);
const activatePlan = bulk.buildPlan(rows,selected,true,context);
assert.strictEqual(activatePlan.selected.length,4);
assert.strictEqual(activatePlan.changing.length,3,'Only currently inactive rows should be activation targets');
assert.strictEqual(activatePlan.blockers.length,1,'Direct QA issues must block activation');
assert.strictEqual(activatePlan.blockers[0].row.id,'bad');
assert.strictEqual(activatePlan.canRun,false,'Activation with a direct QA blocker must not run');
assert.strictEqual(activatePlan.paperIssues.length,1,'Incomplete 2019 paper should be an advisory warning');
assert.strictEqual(activatePlan.paperIssues[0].examYear,2019);

const q28Only = bulk.buildPlan(rows,new Set(['q28']),true,context);
assert.strictEqual(q28Only.blockers.length,0,'Inactive status alone must not be an activation blocker');
assert.strictEqual(q28Only.paperIssues.length,1,'Activating a row from an incomplete paper should warn');
assert.strictEqual(q28Only.canRun,true,'A clean inactive row can be activated after confirmation');

const deactivatePlan = bulk.buildPlan(rows,selected,false,context);
assert.strictEqual(deactivatePlan.changing.length,1,'Only currently active rows should be deactivation targets');
assert.strictEqual(deactivatePlan.changing[0].id,'active');
assert.strictEqual(deactivatePlan.blockers.length,0,'Deactivation should not be blocked by activation QA rules');
assert.strictEqual(deactivatePlan.canRun,true);

const noChangeActivate = bulk.buildPlan(rows,new Set(['active']),true,context);
assert.strictEqual(noChangeActivate.canRun,false);
assert.strictEqual(noChangeActivate.changing.length,0);

const confirmText = bulk.confirmationText(q28Only);
assert(confirmText.includes('Activate 1 question?'));
assert(confirmText.includes('Only the questions.active status will change'));
assert(confirmText.includes('No questions will be deleted'));
assert(confirmText.includes('no Exam Setting will be created or enabled'));
assert(confirmText.includes('configured Supabase question bank'));

assert(source.includes("cloud.from('questions').update({active:!!targetActive}).in('id',ids)"),'B2A should use one status-only Supabase update');
assert(!/cloud\.from\(['\"]questions['\"]\)\.delete\s*\(/.test(source),'B2A must not delete question rows');
assert(!/cloud\.from\(['\"]questions['\"]\)\.insert\s*\(/.test(source),'B2A must not insert question rows');
assert(!/cloud\.from\(['\"]questions['\"]\)\.upsert\s*\(/.test(source),'B2A must not upsert question rows');
assert(!source.includes('storage.from('),'B2A must not change Storage');
assert(!source.includes("from('exam_paper_settings')"),'B2A must not change Exam Settings');
assert(source.includes('Select all filtered'));
assert(source.includes('Activation blocked'));
assert(source.includes('Cloud Teacher'));

console.log('V5.1B2A bulk activate/deactivate checks passed.');
