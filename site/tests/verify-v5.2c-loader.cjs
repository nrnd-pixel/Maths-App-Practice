const fs=require('fs');
const path=require('path');
const assert=require('assert');
const {ownerSource,ORDER,MARKERS}=require('./v52c-consolidated-test-helper.cjs');

const loader=fs.readFileSync(path.join(__dirname,'..','v40-release.js'),'utf8');

const existingKeys=[
  "loadScriptOnce('v51-exam-publication-ui-polish.js?v=51b3-ui-3', 'data-v51-exam-publication-ui-polish')",
  "loadScriptOnce('v52-teacher-topical-library.js?v=52b-1', 'data-v52b-teacher-topical-library')",
  "loadScriptOnce('v52b1-question-bank-performance.js?v=52b1-3', 'data-v52b1-question-bank-performance')",
  "loadScriptOnce('v52b1-large-import-timeout-recovery.js?v=52b1-1', 'data-v52b1-large-import-timeout-recovery')",
  "loadScriptOnce('v52-topical-exercise-foundation.js?v=52a-1', 'data-v52a-topical-exercise-foundation')",
  "loadScriptOnce('v52b1-question-bank-observer-gate.js?v=52b1-2', 'data-v52b1-question-bank-observer-gate')"
];
for(const line of existingKeys) assert(loader.includes(line),`Existing stable loader entry changed: ${line}`);

const consolidated="loadScriptOnce('topical-legacy-student-route.js', 'data-topical-legacy-student-route')";
assert(loader.includes(consolidated),'Consolidated V5.2C route loader missing');
assert.strictEqual(loader.split(consolidated).length-1,1,'Consolidated V5.2C route must load exactly once');
assert(loader.indexOf(consolidated)>loader.indexOf(existingKeys[3]),'Consolidated V5.2C route must load after V52B1 timeout recovery');
assert(loader.indexOf(consolidated)<loader.indexOf("loadScriptOnce('practice-eligibility-ui.js'"),'Consolidated V5.2C route must retain the historical phase before V53A');

let last=-1;
for(const name of ORDER){
  const index=ownerSource.indexOf(MARKERS[name]);
  assert(index>=0,`Consolidated owner missing ${name} section`);
  assert(index>last,`Consolidated V5.2C section order changed at ${name}`);
  last=index;
}

const foundationIndex=loader.indexOf(existingKeys[4]);
const observerIndex=loader.indexOf(existingKeys[5]);
const qaIndex=loader.indexOf("loadScriptOnce('question-bank-selection-qa.js', 'data-question-bank-selection-qa')");
assert(foundationIndex>=0&&observerIndex>foundationIndex&&qaIndex>observerIndex,
  'V52B1 observer gate must remain immediately in the accepted early loader phase between foundation and V51 Question Bank QA');

console.log('V5.2C consolidated loader preservation checks passed.');