'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {ownerSource,ORDER,MARKERS,section}=require('./v52c-consolidated-test-helper.cjs');

const ROOT=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');
const release=read('v40-release.js');

const historical=Object.freeze({
  publication:'v52c-topical-publication.js',
  student:'v52c-student-topical-library.js',
  mount:'v52c1-topical-library-mount-hotfix.js',
  hint:'v52c-topical-hint-bridge.js',
  result:'v52c2-topical-result-ux.js'
});

let previous=-1;
for(const name of ORDER){
  const start=ownerSource.indexOf(MARKERS[name]);
  assert(start>=0,`active V52C owner must contain ${name} section`);
  assert(start>previous,`active V52C owner order changed at ${name}`);
  previous=start;
  assert.equal(section(name),read(historical[name]),`${name} section must remain byte-equivalent to historical accepted source`);
}

const newLoader="loadScriptOnce('topical-legacy-student-route.js', 'data-topical-legacy-student-route');";
assert.equal(release.split(newLoader).length-1,1,'active consolidated V52C owner must load exactly once');
for(const filename of Object.values(historical)){
  assert(!release.includes(filename),`${filename} must be dormant and absent from the active release loader`);
}

const before="loadScriptOnce('v52b1-large-import-timeout-recovery.js?v=52b1-1', 'data-v52b1-large-import-timeout-recovery');";
const after="loadScriptOnce('practice-eligibility-ui.js', 'data-practice-eligibility-ui');";
assert(release.indexOf(before)>=0&&release.indexOf(newLoader)>release.indexOf(before)&&release.indexOf(after)>release.indexOf(newLoader),
  'consolidated V52C owner must retain the exact historical phase between V52B1 support and V53A');

const foundation="loadScriptOnce('v52-topical-exercise-foundation.js?v=52a-1', 'data-v52a-topical-exercise-foundation');";
const observer="loadScriptOnce('v52b1-question-bank-observer-gate.js?v=52b1-2', 'data-v52b1-question-bank-observer-gate');";
const qa="loadScriptOnce('v51-question-bank-qa.js?v=51b1-1', 'data-v51-question-bank-qa');";
const foundationIndex=release.indexOf(foundation);
const observerIndex=release.indexOf(observer);
const qaIndex=release.indexOf(qa);
assert(foundationIndex>=0&&observerIndex>foundationIndex&&qaIndex>observerIndex,
  'V52B1 observer gate must retain its accepted early loader position immediately after foundation and before V51 QA');
const betweenFoundationAndObserver=release.slice(foundationIndex+foundation.length,observerIndex).trim();
assert.equal(betweenFoundationAndObserver,'','no loader entry may be inserted between V52 foundation and the V52B1 observer gate');

assert(ownerSource.includes('ROOT.__v52cTopicalPublicationInstalled = true;'),'publication install flag must be preserved');
assert(ownerSource.includes('ROOT.__v52cStudentTopicalLibraryInstalled = true;'),'student library install flag must be preserved');
assert(ownerSource.includes('ROOT.__v52c1TopicalLibraryMountInstalled = true;'),'mount install flag must be preserved');
assert(ownerSource.includes('ROOT.__v52cTopicalHintBridgeInstalled = true;'),'hint bridge install flag must be preserved');
assert(ownerSource.includes('ROOT.__v52c2TopicalResultUxInstalled = true;'),'result UX install flag must be preserved');
assert(ownerSource.includes("Object.defineProperty(window,'V52CTopicalPublication'"),'publication API compatibility global must be preserved');
assert(ownerSource.includes("Object.defineProperty(window,'V52CStudentTopicalLibrary'"),'student library API compatibility global must be preserved');
assert(ownerSource.includes("Object.defineProperty(window, 'V52C1TopicalLibraryMount'"),'mount API compatibility global must be preserved');
assert(ownerSource.includes("Object.defineProperty(window,'V52CTopicalHintBridge'"),'hint API compatibility global must be preserved');
assert(ownerSource.includes("Object.defineProperty(window,'V52C2TopicalResultUx'"),'result API compatibility global must be preserved');

assert(ownerSource.includes('new MutationObserver(() => {\n      if (ensureMounted()) observer.disconnect();'),'C1 must retain its MutationObserver-dependent deferred mount path');
assert(!ownerSource.includes('ROOT.MutationObserver ='),'consolidated V52C owner must not introduce a second global MutationObserver wrapper');
assert(!ownerSource.includes('window.MutationObserver ='),'consolidated V52C owner must not introduce a second global MutationObserver wrapper');

assert(ownerSource.includes("cloud.rpc('get_student_topical_questions_v52c'"),'dedicated topical retrieval RPC must be preserved');
assert(ownerSource.includes("cloud.rpc('grade_topical_response_v52c'"),'dedicated topical grading RPC must be preserved');
assert(ownerSource.includes("cloud.rpc('request_topical_hint_v52c'"),'dedicated topical hint RPC must be preserved');
assert(ownerSource.includes("cloud.rpc('submit_topical_practice_session_v52c'"),'dedicated topical submission RPC must be preserved');
assert(ownerSource.includes("cloud.rpc('renew_student_practice_access_v52c2'"),'topical ticket rotation RPC must be preserved');

console.log('Phase 4 V52C legacy student route integrity checks passed.');
