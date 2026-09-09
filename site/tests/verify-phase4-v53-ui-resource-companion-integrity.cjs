'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const SITE=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(SITE,file),'utf8');
const eligibility=read('practice-eligibility-ui.js');
const clarity=read('practice-ui-resource-clarity.js');
const historicalA=read('v53a-practice-eligibility.js');
const historicalC=read('v53c-two-mode-student-ui.js');
const historicalD6=read('v53d6-resource-bank-status-clarity.js');
const loader=read('v40-release.js');
const v52c2=read('v52c2-topical-result-ux.js');
const resourceBankUi=read('resource-bank-ui.js');

function indexOfRequired(text,token,label){
  const index=text.indexOf(token);
  assert.ok(index>=0,`${label} must exist`);
  return index;
}

// Pure relocation/consolidation equivalence: V53A is copied byte-for-byte apart
// from trailing newline normalization; V53C then V53D6 are copied in that order.
assert.equal(eligibility.trimEnd(),historicalA.trimEnd(),'active Practice eligibility owner must preserve historical V53A implementation exactly');
const d6Marker='/* V5.3D6 — Resource Bank Status Clarity.';
const d6Start=indexOfRequired(clarity,d6Marker,'V53D6 section');
const activeC=clarity.slice(0,d6Start).trimEnd();
const activeD6=clarity.slice(d6Start).trimEnd();
assert.equal(activeC,historicalC.trimEnd(),'active clarity owner must preserve historical V53C implementation exactly');
assert.equal(activeD6,historicalD6.trimEnd(),'active clarity owner must preserve historical V53D6 implementation exactly');

// Loader topology is non-negotiable: A remains before the engine; C/D6 remain
// after the engine and before the consolidated V54 UI owner. No historical entry remains active.
const a=indexOfRequired(loader,"loadScriptOnce('practice-eligibility-ui.js', 'data-practice-eligibility-ui')",'Practice eligibility UI loader');
const engine=indexOfRequired(loader,"loadScriptOnce('practice-selection-engine.js', 'data-practice-selection-engine')",'Practice selection engine loader');
const clarityIndex=indexOfRequired(loader,"loadScriptOnce('practice-ui-resource-clarity.js', 'data-practice-ui-resource-clarity')",'Practice UI/resource clarity loader');
const v54=indexOfRequired(loader,"loadScriptOnce('resource-bank-ui.js', 'data-resource-bank-ui')",'V54 consolidated UI loader');
assert.ok(a<engine && engine<clarityIndex && clarityIndex<v54,'loader order must remain eligibility UI -> Practice engine -> UI/resource clarity -> consolidated V54 UI');
for(const retired of [
  'v53a-practice-eligibility.js',
  'v53c-two-mode-student-ui.js',
  'v53d6-resource-bank-status-clarity.js'
]) assert.equal(loader.includes(`loadScriptOnce('${retired}`),false,`${retired} must be dormant`);

// V53A compatibility surface and bounded teacher write boundary.
assert.ok(eligibility.includes('ROOT.__v53aPracticeEligibilityInstalled = true'),'V53A install flag must remain exact');
assert.ok(eligibility.includes("Object.defineProperty(window,'V53APracticeEligibility'"),'V53A public API must remain exact');
assert.ok(eligibility.includes('v53a-eligibility-toggle'),'V54B click contract class must remain exact');
assert.ok(eligibility.includes("cloud.rpc('get_topical_practice_eligibility_states_v53a')"),'V53A read RPC must remain exact');
assert.ok(eligibility.includes("cloud.rpc('save_topical_practice_eligibility_v53a'"),'V53A write RPC must remain exact');
assert.equal(eligibility.includes("cloud.from('questions').update"),false,'V53A must not bypass its guarded RPC writer');
assert.equal(eligibility.includes('multipartKey'),false,'V53A must not own Practice multipart identity');
assert.equal(/\bshuffle\s*=/.test(eligibility),false,'V53A must not own Practice selection ordering');
assert.equal(/\bgetQuestions\s*=/.test(eligibility),false,'V53A must not wrap Practice retrieval globals');
assert.equal(/\bstartPractice\s*=/.test(eligibility),false,'V53A must not wrap Practice launch globals');
assert.ok(resourceBankUi.includes("event.target?.closest?.('.tab[data-panel=\"questions-panel\"],#v52b-refresh,.v53a-eligibility-toggle')"),'consolidated V54B must continue listening for the exact V53A eligibility-toggle contract');

// V53C capture semantics: public API/flag and window-capture interception stay exact.
assert.ok(clarity.includes('ROOT.__v53cTwoModeStudentUiInstalled = true'),'V53C install flag must remain exact');
assert.ok(clarity.includes("Object.defineProperty(window,'V53CTwoModeStudentUi'"),'V53C public API must remain exact');
assert.ok(clarity.includes("window.addEventListener('click',onWindowCapture,true)"),'V53C must install its click handler on window capture');
assert.ok(clarity.includes('event.stopImmediatePropagation()'),'V53C must stop the legacy capture route immediately');
assert.ok(clarity.includes("result?.dataset.v52c2TopicalResult!=='1'"),'V53C Again interception must stay scoped to topical results');
assert.ok(v52c2.includes("document.addEventListener('click',onCaptureClick,true)"),'legacy V52C.2 document-capture handler must remain intact underneath V53C');

// V53D6 -> consolidated V54A is a synchronous API + DOM-node contract, not just presentation.
assert.ok(clarity.includes('ROOT.__v53d6ResourceBankStatusClarityInstalled = true'),'V53D6 install flag must remain exact');
assert.ok(clarity.includes("Object.defineProperty(window,'V53D6ResourceBankStatusClarity'"),'V53D6 public API must remain exact');
assert.ok(/const api=Object\.freeze\(\{[\s\S]*\bdecorate\b[\s\S]*\}\);/.test(activeD6),'V53D6 public API must continue exposing decorate()');
assert.ok(clarity.includes('v53d6-practice-eligibility-badge'),'exact V53D6 badge class must remain present');
assert.ok(resourceBankUi.includes('ROOT.V53D6ResourceBankStatusClarity?.decorate?.()'),'consolidated V54A must synchronously invoke V53D6.decorate()');
assert.ok(resourceBankUi.includes("meta.querySelector('.v53d6-practice-eligibility-badge')"),'consolidated V54A must reuse the exact V53D6 badge');
assert.ok(resourceBankUi.includes("if (sourceCategory(row) === 'topical')"),'consolidated V54A must not create a fallback topical badge before D6 paints');
assert.equal(activeD6.includes('cloud.rpc('),false,'V53D6 must remain RPC-free');
assert.equal(/\bshuffle\s*=/.test(activeD6),false,'V53D6 must not own Practice selection ordering');
assert.equal(activeD6.includes('multipartKey'),false,'V53D6 must not own Practice multipart identity');

require('./verify-phase4-v53-ui-resource-companion-protected-sha.cjs');
require('./verify-phase4-v53-ui-resource-companion-dormant-reference-integrity.cjs');
console.log('Phase 4 V53 UI/resource companion integrity guard passed.');
