'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'../..');
const SITE=path.join(ROOT,'site');
const read=name=>fs.readFileSync(path.join(SITE,name),'utf8');
const canonical=text=>String(text).replace(/\n+$/,'');
const concat=files=>files.map(name=>canonical(read(name))).join('\n\n');

const groups=Object.freeze({
  'paper-import-management.js':[
    'v51-paper-profile-validator.js','v51-bulk-question-image-upload.js','v51-bulk-question-image-cleanup.js',
    'v51-bulk-question-image-safety.js','v51-paper-package-preview.js','v51-paper-package-preview-status.js',
    'v51-one-confirmation-paper-import.js','v51-post-import-integrity.js'
  ],
  'question-bank-selection-qa.js':['v51-question-bank-qa.js','v51-question-bank-bulk-status.js'],
  'question-bank-metadata-review.js':['v51-question-bank-bulk-metadata.js','v51-question-review-workflow.js'],
  'question-bank-audit-multipart.js':['v51-question-change-history.js','v51-multipart-question-management.js'],
  'student-exam-ui.js':['v51-student-exam-paper-library.js','v51-student-exam-resume-progress.js']
});

for(const [owner,sources] of Object.entries(groups)){
  assert.equal(canonical(read(owner)),concat(sources),`${owner} must remain exact historical source-body concatenation; only EOF separator newlines may differ`);
  new vm.Script(read(owner),{filename:owner});
}

const release=read('v40-release.js');
const ordered=[
  "loadScriptOnce('paper-import-management.js', 'data-paper-import-management')",
  "loadScriptOnce('v52-topical-exercise-foundation.js?v=52a-1', 'data-v52a-topical-exercise-foundation')",
  "loadScriptOnce('v52b1-question-bank-observer-gate.js?v=52b1-2', 'data-v52b1-question-bank-observer-gate')",
  "loadScriptOnce('question-bank-selection-qa.js', 'data-question-bank-selection-qa')",
  "loadScriptOnce('v52-topical-activation-guard.js?v=52a-1', 'data-v52a-topical-activation-guard')",
  "loadScriptOnce('question-bank-metadata-review.js', 'data-question-bank-metadata-review')",
  "loadScriptOnce('v52-teacher-topical-library.js?v=52b-1', 'data-v52b-teacher-topical-library')",
  "loadScriptOnce('question-bank-audit-multipart.js', 'data-question-bank-audit-multipart')",
  "loadScriptOnce('v51-exam-publication-safety.js?v=51b3-1', 'data-v51-exam-publication-safety')",
  "loadScriptOnce('v51-exam-publication-ui-polish.js?v=51b3-ui-3', 'data-v51-exam-publication-ui-polish')",
  "loadScriptOnce('student-exam-ui.js', 'data-student-exam-ui')",
  "loadScriptOnce('v50-security-hardening.js?v=50rc2-1', 'data-v50-security-hardening')",
  "loadScriptOnce('v52b1-question-bank-performance.js?v=52b1-3', 'data-v52b1-question-bank-performance')",
  "loadScriptOnce('topical-legacy-student-route.js', 'data-topical-legacy-student-route')",
  "loadScriptOnce('practice-selection-engine.js', 'data-practice-selection-engine')",
  "loadScriptOnce('resource-bank-ui.js', 'data-resource-bank-ui')",
  "loadScriptOnce('resource-bank-bulk.js', 'data-resource-bank-bulk')"
];
let last=-1;
for(const token of ordered){
  const index=release.indexOf(token);
  assert.ok(index>last,`${token} must remain loaded once in the approved topology`);
  assert.equal(release.indexOf(token,index+1),-1,`${token} must not be duplicated`);
  last=index;
}
for(const sources of Object.values(groups)){
  for(const retired of sources){
    assert.ok(!release.includes(`loadScriptOnce('${retired}`),`${retired} must remain dormant/reference only`);
  }
}

const selection=read('question-bank-selection-qa.js');
const review=read('question-bank-metadata-review.js');
const multipart=read('question-bank-audit-multipart.js');
const importOwner=read('paper-import-management.js');

for(const contract of [
  "Object.defineProperty(window,'V51QuestionBankQA'",
  "Object.defineProperty(window,'V51QuestionBankBulkStatus'",
  'buildQaContext','matchesQaFilter','buildPlan','clearSelection',
  'v51b2a-bulk-status','v51b2a-summary','v51b2a-select','v51b2aId'
]) assert.ok(selection.includes(contract),`${contract} V51 selection/QA contract must remain`);

assert.ok(selection.includes('function renderSummary()'),'B2A renderSummary callback identity must remain exact for V52B1 classification');
assert.ok(selection.includes('function render(){'),'B1 render callback identity must remain exact');
assert.ok(selection.includes('buildQaContext'),'B1 render source marker must remain for V52B1 callback-source classification');
assert.ok(review.includes('function renderAll()'),'B2C renderAll callback identity must remain exact for V52B1 classification');
assert.ok(multipart.includes('window.V51MultipartQuestionManagement=api'),'multipart global API must remain');
assert.ok(multipart.includes('renderGroup'),'V51MultipartQuestionManagement.renderGroup() must remain');

assert.ok(importOwner.includes('const originalAlert = window.alert'),'A5 must still capture window.alert temporarily');
assert.ok(importOwner.includes('window.alert = originalAlert'),'A5 must restore window.alert in finally');

const observerGate=read('v52b1-question-bank-observer-gate.js');
assert.ok(observerGate.includes("id === 'questions-cards'"),'V52B1 questions-cards suppression boundary must remain');
assert.ok(observerGate.includes("source.includes('renderSelectionState') && source.includes('bind')"),'V52B1 B2D body-observer signature gate must remain exact');

const b3=read('v51-exam-publication-safety.js');
const b3ui=read('v51-exam-publication-ui-polish.js');
assert.ok(b3.includes('async function hardenedLoadExamSettingsEditor()'),'B3 named hardened loader must remain exact');
assert.ok(b3.includes('async function hardenedSaveExamSetting(card)'),'B3 named hardened saver must remain exact');
assert.ok(b3.includes('loadExamSettingsEditor = hardenedLoadExamSettingsEditor'),'B3 must remain loadExamSettingsEditor owner');
assert.ok(b3.includes('saveExamSetting = hardenedSaveExamSetting'),'B3 must remain saveExamSetting owner');
assert.ok(b3ui.includes("fn.name === 'hardenedLoadExamSettingsEditor'"),'B3 UI polish function-name safety check must remain exact');

const bulk=read('resource-bank-bulk.js');
assert.ok(bulk.includes('V51QuestionBankBulkStatus'),'V54 bulk must continue consuming the canonical V51 selection owner');
assert.ok(bulk.includes('buildPlan?.(rows,undefined,false)?.selected'),'V54 bulk canonical selection access must remain exact');

const performance=read('v52b1-question-bank-performance.js');
for(const marker of ["name === 'renderSummary'","name === 'renderAll'","source.includes('buildQaContext')",'V51MultipartQuestionManagement?.renderGroup?.()']){
  assert.ok(performance.includes(marker),`${marker} V52B1 downstream coupling must remain`);
}

const workflow=read('v58d-content-workflow-consolidation.js');
for(const anchor of ['v51a4-package-panel','v51-paper-profile-audit','v51a6-integrity-panel','v51b1-question-bank-qa','v51b2c-review-workflow','v51b2d-question-history']){
  assert.ok(workflow.includes(anchor),`${anchor} V58D workflow anchor must remain`);
}

console.log('Phase 4 V51 integrity passed: exact source equivalence, loader topology, callback identities, canonical selection API, B3 ownership and downstream contracts preserved.');
