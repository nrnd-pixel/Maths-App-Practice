const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'v58d-content-workflow-consolidation.js'),'utf8');
const config=fs.readFileSync(path.join(root,'config.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const packagePreview=fs.readFileSync(path.join(root,'v51-paper-package-preview.js'),'utf8');
const paperProfile=fs.readFileSync(path.join(root,'v51-paper-profile-validator.js'),'utf8');
const integrity=fs.readFileSync(path.join(root,'v51-post-import-integrity.js'),'utf8');
const qa=fs.readFileSync(path.join(root,'v51-question-bank-qa.js'),'utf8');
const review=fs.readFileSync(path.join(root,'v51-question-review-workflow.js'),'utf8');
const history=fs.readFileSync(path.join(root,'v51-question-change-history.js'),'utf8');
const topical=fs.readFileSync(path.join(root,'v52-teacher-topical-library.js'),'utf8');
const topicalPublish=fs.readFileSync(path.join(root,'v52c-topical-publication.js'),'utf8');
const resourceBank=fs.readFileSync(path.join(root,'v54a-resource-bank-visibility.js'),'utf8');
const eligibility=fs.readFileSync(path.join(root,'v54b-practice-eligibility-controls.js'),'utf8');
const workspace=fs.readFileSync(path.join(root,'v58b-teacher-workspace-consolidation.js'),'utf8');

function assert(condition,message){ if(!condition) throw new Error(message); }
new vm.Script(source,{filename:'v58d-content-workflow-consolidation.js'});

assert(source.includes('V5.8D — Content Workflow Consolidation'),'missing V5.8D identity');
assert(source.includes("const IMPORT_ID='v58d-content-workflow-import'"),'missing Import-panel workflow id');
assert(source.includes("const QUESTIONS_ID='v58d-content-workflow-questions'"),'missing Question Bank workflow id');
assert(source.includes("const WORKSPACE_SHORTCUT_ID='v58d-workspace-content-workflow'"),'missing Teacher Workspace shortcut id');
assert(source.includes("const STATUS_CLASS='v58d-content-workflow-status'"),'dual workflow status must use a class');
assert(!source.includes("const STATUS_ID='v58d-content-workflow-status'"),'duplicate workflow status ids must not be introduced');

for(const [key,title] of [
  ['import','Import'],['validate','Validate'],['review','Review'],
  ['practice','Practice availability'],['publish','Publish topical set'],['audit','Audit history']
]){
  assert(source.includes(`key:'${key}'`),`missing content workflow step: ${key}`);
  assert(source.includes(`title:'${title}'`),`missing content workflow title: ${title}`);
}

assert(source.includes('Ordinary Practice / past-paper Practice:'),'missing ordinary Practice route guidance');
assert(source.includes('Topical exercises:'),'missing topical route guidance');
assert(source.includes('Exam publication remains under Exam Settings'),'Exam publication must remain explicitly outside the promoted workflow');
assert(source.includes('Skip Step 5'),'ordinary Practice must not be forced through topical publication');

assert(index.includes('data-panel="questions-panel"'),'stable Question Bank tab missing');
assert(index.includes('data-panel="import-panel"'),'stable Bulk Import tab missing');
assert(packagePreview.includes("panel.id = 'v51a4-package-panel'"),'existing package preview target changed');
assert(paperProfile.includes("panel.id = 'v51-paper-profile-audit'"),'existing paper profile target changed');
assert(integrity.includes("root.id = 'v51a6-integrity-panel'"),'existing post-import integrity target changed');
assert(qa.includes("panel.id = 'v51b1-question-bank-qa'"),'existing Question Bank QA target changed');
assert(review.includes("panel.id = 'v51b2c-review-workflow'"),'existing review workflow target changed');
assert(history.includes("panel.id = 'v51b2d-question-history'"),'existing correction-history target changed');
assert(topical.includes("panel.id = 'v52b-topical-library'"),'existing Topical Exercise Library target changed');
assert(topicalPublish.includes('Publish to students'),'existing topical publication owner changed');
assert(resourceBank.includes("const SUMMARY_ID = 'v54a-resource-bank-summary'"),'existing Practice resource summary target changed');
assert(eligibility.includes('Teacher Practice eligibility controls'),'existing Practice eligibility owner changed');
assert(workspace.includes("title:'Content'"),'accepted V5.8B Content group missing');

for(const selector of [
  '#v51a4-package-panel','#v51-paper-profile-audit','#v51a6-integrity-panel',
  '#v51b1-question-bank-qa','#v51b2c-review-workflow','#v54a-resource-bank-summary',
  '#v52b-topical-library','#v51b2d-question-history'
]){
  assert(source.includes(selector),`V5.8D missing delegation target: ${selector}`);
}

assert(source.includes("tab.click()"),'workflow must delegate through existing teacher tabs');
assert(source.includes('scrollIntoView?.'),'workflow must navigate to existing tool owners');
assert(source.includes('button.addEventListener(\'click\',openWorkflow)'),'Teacher Workspace shortcut must open V5.8D without altering V5.8B ownership');
assert(!source.includes('.appendChild(tab)'),'workflow must not reparent existing teacher tabs');
assert(!source.includes('exam-settings-panel'),'deferred Exam Settings must not become a V5.8D navigation target');

for(const forbidden of [
  'cloud.rpc(',
  'cloud.from(',
  'supabase.',
  'fetch(',
  'localStorage.',
  'sessionStorage.',
  'grade_practice_response',
  'request_practice_hint',
  'submit_practice_session',
  'finalize_exam_attempt',
  'save_question_practice_eligibility_v54b',
  'save_topical_exercise_setting_v52c'
]){
  assert(!source.includes(forbidden),`V5.8D must remain navigation/presentation only: ${forbidden}`);
}

const loader="'./v58d-content-workflow-consolidation.js'";
assert(config.includes(loader),'config.js must load V5.8D');
assert(config.indexOf(loader)>config.indexOf("'./v58c-parent-summary-workspace-shortcut.js'"),'V5.8D must load after accepted V5.8C');
assert(config.indexOf(loader)>config.indexOf("'./v58b-teacher-workspace-consolidation.js'"),'V5.8D must load after accepted V5.8B');

console.log('V5.8D Content Workflow Consolidation regression: PASS');
