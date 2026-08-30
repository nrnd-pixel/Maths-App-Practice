const fs = require('fs');
const path = require('path');
const assert = require('assert');

const featurePath = path.join(__dirname,'..','v52-topical-exercise-foundation.js');
const source = fs.readFileSync(featurePath,'utf8');
const api = require(featurePath);

assert.strictEqual(api.TOPICAL_SOURCE_TYPE,'topical_exercise','V5.2A source type identity must stay stable');

const baseRow = {
  year_level:6,
  strand:'number',
  topic:'Fractions',
  difficulty:'standard',
  marks:1,
  exam_year:null,
  paper:'',
  question_number:'12',
  source_type:'topical_exercise',
  source:'Fractions Topical Exercise 2',
  question_text:'Find 3/4 of 20.',
  answer:'15',
  active:false,
  response_type:'number',
  response_config:{tolerance:0},
  parent_question_number:null,
  part_label:null,
  part_order:null,
  group_prompt:null,
  image_url:''
};

assert.deepStrictEqual(api.validationErrors(baseRow),[],'A valid inactive topical row should pass V5.2A-specific validation');
assert(api.validationErrors({...baseRow,active:true}).some(x=>/remain inactive/i.test(x)),'V5.2A must block active topical rows');
assert(api.validationErrors({...baseRow,source:''}).some(x=>/source\/set name is required/i.test(x)),'V5.2A must require a topical set identity');
assert(api.validationErrors({...baseRow,question_number:''}).some(x=>/question number is required/i.test(x)),'V5.2A must require a topical question number');
assert(api.validationErrors({...baseRow,exam_year:2025}).some(x=>/must not use exam year/i.test(x)),'V5.2A must keep topical rows out of exam metadata');
assert(api.validationErrors({...baseRow,paper:'Paper 1'}).some(x=>/must not use exam paper/i.test(x)),'V5.2A must keep topical rows out of exam-paper metadata');

assert.strictEqual(
  api.questionFingerprint(baseRow),
  'topical|6|fractionstopicalexercise2|12',
  'Topical duplicate identity must use year + source/set + question number'
);
assert.notStrictEqual(
  api.questionFingerprint({...baseRow,source:'Decimals Topical Exercise 2'}),
  api.questionFingerprint(baseRow),
  'Different topical sets must not collide'
);

const partA = {...baseRow,question_number:'5(a)',parent_question_number:'5',part_label:'a',part_order:1,group_prompt:'Answer both parts.'};
const partB = {...baseRow,question_number:'5(b)',parent_question_number:'5',part_label:'b',part_order:2,group_prompt:'Answer both parts.'};
assert.deepStrictEqual(api.multipartImportErrors(partA,[partA,partB]),[],'Valid topical multipart siblings should pass');
assert(api.multipartImportErrors({...partB,part_order:1},[partA]).some(x=>/Part order 1/i.test(x)),'Topical multipart part order must be unique');
assert(api.multipartImportErrors({...partB,part_label:'a'},[partA]).some(x=>/Part label a/i.test(x)),'Topical multipart part labels must be unique');
assert.strictEqual(api.logicalQuestionNumber(partA),'5','Topical multipart rows must collapse to the parent logical number');

const audit = api.buildPackageAudit([baseRow,partA,partB]);
assert(audit && audit.ready,'A clean single-set inactive topical package should pass the foundation audit');
assert.strictEqual(audit.studentExposure,'off','V5.2A student exposure must remain off');
assert.strictEqual(audit.physicalRows,3,'Topical audit must preserve physical-row count');
assert.strictEqual(audit.logicalQuestions,2,'Topical audit must distinguish logical questions from multipart rows');
assert.strictEqual(audit.marks,3,'Topical audit must total package marks');

const mixed = api.buildPackageAudit([baseRow,{...baseRow,question_number:'13',source_type:'practice'}]);
assert(mixed && !mixed.ready && mixed.issues.some(x=>/topical_exercise rows only/i.test(x)),'Mixed source-type packages must be blocked');
const multiSource = api.buildPackageAudit([baseRow,{...baseRow,question_number:'13',source:'Another topical set'}]);
assert(multiSource && !multiSource.ready && multiSource.issues.some(x=>/exactly one Source\/set name/i.test(x)),'A topical package must have one set identity');
const activePackage = api.buildPackageAudit([{...baseRow,active:true}]);
assert(activePackage && !activePackage.ready && activePackage.issues.some(x=>/inactive/i.test(x)),'Active topical packages must be blocked');

const post = api.buildPostImportAudit(
  {source:baseRow.source,yearLevel:6,fingerprints:[api.questionFingerprint(baseRow)]},
  [baseRow]
);
assert(post && post.pass,'Post-import verification should pass when the expected inactive row is present');
assert(!api.buildPostImportAudit(
  {source:baseRow.source,yearLevel:6,fingerprints:[api.questionFingerprint(baseRow)]},
  [{...baseRow,active:true}]
).pass,'Post-import verification must fail if a topical row becomes active');

assert(source.includes("window.questionValidationErrors = topicalValidationErrors"),'V5.2A must extend the established validator additively');
assert(source.includes("window.questionFingerprint = questionFingerprintV52"),'V5.2A must extend duplicate identity additively');
assert(source.includes("window.multipartImportErrors = multipartImportErrorsV52"),'V5.2A must extend multipart grouping additively');
assert(source.includes("document.getElementById('import-btn')?.addEventListener('click',guardTopicalImport,true)"),'Direct import must respect the topical package guard');
assert(source.includes("document.getElementById('v51a5-import-paper')?.addEventListener('click',guardTopicalImport,true)"),'One-confirmation import must respect the topical package guard');

assert(!source.includes('cloud.from('),'V5.2A foundation must not access database tables directly');
assert(!source.includes('cloud.rpc('),'V5.2A foundation must not call RPCs directly');
assert(!source.includes('localStorage.setItem'),'V5.2A foundation must not write local storage');
assert(!source.includes('localStorage.removeItem'),'V5.2A foundation must not delete local storage');
assert(!source.includes('correctResponse'),'V5.2A foundation must not change grading');
assert(!source.includes('start_or_resume_exam_attempt'),'V5.2A foundation must not change Exam attempt creation/resume');
assert(!source.includes('save_exam_attempt'),'V5.2A foundation must not change Exam autosave');
assert(!source.includes('finalize_exam_attempt'),'V5.2A foundation must not change Exam submission');
assert(!source.includes('get_student_questions'),'V5.2A foundation must not alter student question retrieval');

console.log('V5.2A Topical Exercise Foundation checks passed.');