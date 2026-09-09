'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const SITE=path.resolve(__dirname,'..');
const engine=fs.readFileSync(path.join(SITE,'practice-selection-engine.js'),'utf8');
const loader=fs.readFileSync(path.join(SITE,'v40-release.js'),'utf8');

function indexOfRequired(text,token,label){
  const index=text.indexOf(token);
  assert.ok(index>=0,`${label} must exist`);
  return index;
}

// Loader boundary after the companion-layer checkpoint: consolidated V53A stays
// before the engine; consolidated V53C/D6 stays after it; V54 remains downstream.
const a=indexOfRequired(loader,"loadScriptOnce('practice-eligibility-ui.js",'V53A consolidated loader');
const consolidated=indexOfRequired(loader,"loadScriptOnce('practice-selection-engine.js'",'Practice selection engine loader');
const clarity=indexOfRequired(loader,"loadScriptOnce('practice-ui-resource-clarity.js'",'V53C/D6 consolidated loader');
const v54=indexOfRequired(loader,"loadScriptOnce('resource-bank-ui.js', 'data-resource-bank-ui')",'V54 consolidated UI loader');
assert.ok(a<consolidated && consolidated<clarity && clarity<v54,'loader order must remain V53A owner -> engine -> V53C/D6 owner -> V54');
for(const retired of [
  'v53b-unified-practice-retrieval.js',
  'v53d3-practice-selection-quality.js',
  'v53d4-student-recommendation-alignment.js',
  'v53d5-practice-selection-intelligence.js'
]) assert.equal(loader.includes(`loadScriptOnce('${retired}`),false,`${retired} must be dormant`);

// Historical observable contracts.
for(const flag of [
  '__v53bUnifiedPracticeInstalled',
  '__v53d3PracticeSelectionInstalled',
  '__v53d4StudentRecommendationInstalled',
  '__v53d5PracticeSelectionInstalled'
]) assert.match(engine,new RegExp(`ROOT\\.${flag}\\s*=\\s*true`),`${flag} must remain available`);
for(const api of [
  'V53BUnifiedPractice',
  'V53D3PracticeSelection',
  'V53D4StudentRecommendation',
  'V53D5PracticeSelection'
]) assert.match(engine,new RegExp(`publishApi\\('${api}'`),`${api} must remain published`);
for(const marker of [
  '__v53bUnifiedPracticeRpcBridge',
  '__v53d3PracticeSelectionRpcBridge',
  '__v53d4StudentRecommendationRpcBridge',
  '__v53d5PracticeSelectionRpcBridge'
]) assert.ok(engine.includes(marker),`${marker} must remain available`);

// Deterministic wrapper composition must be explicit and synchronous once cloud exists.
const chainStart=indexOfRequired(engine,'function installRpcChain()','coordinated RPC installer');
const chainText=engine.slice(chainStart,engine.indexOf('\n  function install(){',chainStart));
const b=chainText.indexOf('installBBridge()');
const d3=chainText.indexOf('installD3Bridge()');
const d4=chainText.indexOf('installD4Bridge()');
const d5=chainText.indexOf('installD5BridgeAndFinalize()');
assert.ok(b>=0 && b<d3 && d3<d4 && d4<d5,'RPC bridge order must be B -> D3 -> D4 -> D5');

// D4 must already be installed before D5 captures previousRpc.
const d5Start=indexOfRequired(engine,'function installD5BridgeAndFinalize()','D5 finalizer');
const d5End=engine.indexOf('\n  function installRpcChain()',d5Start);
const d5Text=engine.slice(d5Start,d5End);
const d4Barrier=indexOfRequired(d5Text,'cloud.__v53d4StudentRecommendationRpcBridge !== true','D4 readiness barrier');
const capture=indexOfRequired(d5Text,'const previousRpc = cloud.rpc.bind(cloud)','D5 previousRpc capture');
assert.ok(d4Barrier<capture,'D4 readiness must be verified before D5 captures previousRpc');

// Aggregate D5 marker must be the final readiness publication, after final shuffle.
const finalShuffle=d5Text.lastIndexOf('installFinalShuffle()');
const aggregateMarker=d5Text.lastIndexOf("Object.defineProperty(cloud,'__v53d5PracticeSelectionRpcBridge'");
assert.ok(finalShuffle>=0 && aggregateMarker>finalShuffle,'D5 bridge marker must be published only after final shuffle installation');
assert.match(engine,/cloud\.__v53bUnifiedPracticeRpcBridge === true[\s\S]*cloud\.__v53d3PracticeSelectionRpcBridge === true[\s\S]*cloud\.__v53d4StudentRecommendationRpcBridge === true[\s\S]*cloud\.__v53d5PracticeSelectionRpcBridge === true/,'aggregate settlement must verify the complete chain');

// D3 may define its ordering helper but the active engine must not contain the old
// independent retry-time installSelection() pattern that repeatedly reclaims shuffle.
assert.equal(/function installSelection\s*\(/.test(engine),false,'active engine must not have a separate D3/D5 installSelection owner');
assert.equal(/setInterval\s*\([\s\S]{0,500}installSelection\s*\(/.test(engine),false,'active engine must not retry shuffle ownership through D3');
assert.match(engine,/function installFinalShuffle\s*\(/,'one final D5 shuffle installer must exist');

// B owns multipart grouping exactly once in the coordinated installer.
assert.match(engine,/function installMultipartKeyOnce\s*\(/,'single multipart installer must exist');
assert.equal((engine.match(/^\s*multipartKey\s*=\s*unifiedMultipartKey\s*;/gm)||[]).length,1,'lexical multipartKey assignment must have one B-owned site');
assert.equal((engine.match(/^\s*ROOT\.multipartKey\s*=\s*unifiedMultipartKey\s*;/gm)||[]).length,1,'ROOT multipartKey assignment must have one B-owned site');

// Routing isolation contracts retained from the historical B/D3 modules.
for(const token of [
  "input.p_exam_year == null",
  "input.p_paper == null || trim(input.p_paper) === ''",
  "name:'get_student_practice_questions_v53b'",
  "name:'get_student_practice_questions_v53d3'",
  "if (!topical && rpcName === 'grade_practice_response_v3')",
  "if (!topical && rpcName === 'request_practice_hint_v3')",
  "if (!topical && rpcName === 'submit_practice_session_v3')"
]) assert.ok(engine.includes(token),`routing isolation contract missing: ${token}`);

require('./verify-phase4-v53-practice-selection-protected-sha.cjs');
require('./verify-phase4-v53-practice-selection-dormant-reference-integrity.cjs');
console.log('Phase 4 V53 deterministic Practice selection engine integrity guard passed.');
