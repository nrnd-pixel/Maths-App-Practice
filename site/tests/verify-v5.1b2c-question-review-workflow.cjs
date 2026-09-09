const {section}=require('./v51-owner-section-helper.cjs');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const source = section('question-bank-metadata-review.js','/* V5.1B2C — Persistent Question Bank review workflow.',null);
const sql = fs.readFileSync(path.join(__dirname,'..','..','supabase','v51b2c_question_review_workflow.sql'),'utf8');
const sandbox = { window:{} };
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'question-bank-metadata-review.js'});
const review = sandbox.window.V51QuestionReviewWorkflow;
assert(review,'V51QuestionReviewWorkflow API should be exposed');

const rows = [
  {id:'q28',exam_year:2019,paper:'Paper 2',question_number:'28',active:false,review_status:'none',review_note:''},
  {id:'active',exam_year:2020,paper:'Paper 2',question_number:'1',active:true,review_status:'none',review_note:''},
  {id:'needs',exam_year:2020,paper:'Paper 2',question_number:'2',active:false,review_status:'needs_review',review_note:'Check source'},
  {id:'reviewed',exam_year:2020,paper:'Paper 2',question_number:'3',active:false,review_status:'reviewed',review_note:'Checked'}
];

let plan = review.buildReviewPlan(rows,new Set(['q28']),'needs_review','Triangle ratio invalid');
assert.strictEqual(plan.canRun,true,'Inactive question with a note can be marked Needs Review');
assert.deepStrictEqual(JSON.parse(JSON.stringify(plan.patch)),{review_status:'needs_review',review_note:'Triangle ratio invalid'});
assert.strictEqual(plan.changing.length,1);

plan = review.buildReviewPlan(rows,new Set(['active']),'needs_review','Check this');
assert.strictEqual(plan.canRun,false,'Active questions must not be marked Needs Review');
assert(plan.blockers.some(x=>x.includes('Deactivate before marking Needs Review')));

plan = review.buildReviewPlan(rows,new Set(['q28']),'needs_review','');
assert.strictEqual(plan.canRun,false,'Needs Review must require a note');
assert(plan.blockers.some(x=>x.includes('review note is required')));

plan = review.buildReviewPlan(rows,new Set(['needs']),'reviewed','');
assert.strictEqual(plan.canRun,true,'Needs Review can be resolved as Reviewed');
assert.deepStrictEqual(JSON.parse(JSON.stringify(plan.patch)),{review_status:'reviewed'},'Blank Reviewed note must preserve the existing note');

plan = review.buildReviewPlan(rows,new Set(['needs']),'none','ignored');
assert.strictEqual(plan.canRun,true,'Review state can be cleared');
assert.deepStrictEqual(JSON.parse(JSON.stringify(plan.patch)),{review_status:'none',review_note:''});

plan = review.buildReviewPlan(rows,new Set(['reviewed']),'reviewed','');
assert.strictEqual(plan.canRun,false,'Already-reviewed unchanged rows should be excluded');
assert.strictEqual(plan.changing.length,0);

const stats = review.reviewStats(rows);
assert.deepStrictEqual(JSON.parse(JSON.stringify(stats)),{none:2,needsReview:1,reviewed:1,total:4});

const confirm = review.confirmationText(review.buildReviewPlan(rows,new Set(['q28']),'needs_review','Check'));
assert(confirm.includes('Only review_status and'));
assert(confirm.includes('Active status'));
assert(confirm.includes('will not change'));

assert(source.includes("cloud.from('questions').update(plan.patch).in('id',ids)"),'B2C should use one review-only update');
assert(!/update\s*\(\s*\{[^}]*active\s*:/s.test(source),'B2C must not write active status');
assert(!source.includes("from('exam_paper_settings')"),'B2C must not change Exam Settings');
assert(!source.includes('storage.from('),'B2C must not change Storage');
assert(!source.includes('.insert('),'B2C must not insert questions');
assert(!source.includes('.upsert('),'B2C must not upsert questions');
assert(source.includes('guardActivationClick'),'B2C must guard B2A activation');
assert(source.includes("review_status)==='needs_review'"),'Activation guard must recognize unresolved review state');
assert(source.includes('Deactivate before marking Needs Review'),'Needs Review must require inactive state');
assert(source.includes('All review states'),'Review-state filter should exist');

assert(sql.includes('add column if not exists review_status text not null default \'none\''),'Migration must add review_status with safe default');
assert(sql.includes("add column if not exists review_note text not null default ''"),'Migration must add review_note');
assert(sql.includes("check (review_status in ('none','needs_review','reviewed'))"),'Migration must constrain review state values');

console.log('V5.1B2C question review workflow checks passed.');
