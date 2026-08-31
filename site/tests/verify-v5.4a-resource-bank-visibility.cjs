const assert = require('assert');
const mod = require('../v54a-resource-bank-visibility.js');

const rows = [
  {id:'a',practice_eligible:true,source_type:'past_paper',review_status:'none',active:true},
  {id:'b',practice_eligible:true,source_type:'topical_exercise',review_status:'reviewed',active:false},
  {id:'c',practice_eligible:false,source_type:'topical_exercise',review_status:'reviewed',active:false},
  {id:'d',practice_eligible:false,source_type:'teacher',review_status:'needs_review',active:false}
];

assert.strictEqual(mod.isEligible(rows[0]),true);
assert.strictEqual(mod.isEligible(rows[2]),false);
assert.strictEqual(mod.sourceCategory(rows[1]),'topical');
assert.strictEqual(mod.sourceCategory(rows[0]),'past_paper');
assert.strictEqual(mod.reviewState(rows[1]),'reviewed');
assert.strictEqual(mod.reviewState(rows[3]),'needs_review');
assert.strictEqual(mod.reviewState(rows[0]),'none');

assert.deepStrictEqual(mod.resourceStats(rows),{
  total:4,
  eligible:2,
  ineligible:2,
  eligibleReviewed:1,
  eligibleTopical:1,
  activeTopical:0
});

assert.strictEqual(mod.matchesEligibility(rows[0],'eligible'),true);
assert.strictEqual(mod.matchesEligibility(rows[2],'eligible'),false);
assert.strictEqual(mod.matchesEligibility(rows[2],'ineligible'),true);
assert.strictEqual(mod.matchesEligibility(rows[0],'all'),true);

const fs = require('fs');
const source = fs.readFileSync(require.resolve('../v54a-resource-bank-visibility.js'),'utf8');
assert(source.includes('practice_eligible === true'),'Eligibility must use practice_eligible explicitly');
assert(source.includes('Practice resource'),'Cards must show an eligible resource badge');
assert(source.includes('Not in Practice'),'Cards must show an ineligible resource badge');
assert(source.includes('v54a-eligibility-filter'),'Question Bank must expose the Practice eligibility filter');
assert(source.includes('v54a-resource-bank-summary'),'Question Bank must expose a resource-bank summary');
assert(source.includes('Practice eligibility filter applied'),'Filtered Question Bank count must visibly reflect the eligibility filter');
assert(source.includes("#questions-cards .qcard:not(.hidden)"),'Filtered count must use the final visible-card state after existing filters');
assert(!source.includes("cloud.from('questions').update"),'V5.4A must remain read-only');
assert(!source.includes('cloud.rpc('),'V5.4A must not add RPC writes or retrieval routes');
assert(!source.includes('new MutationObserver('),'V5.4A must not add a permanent DOM observer');

const d5 = fs.readFileSync(require.resolve('../v53d5-practice-selection-intelligence.js'),'utf8');
assert(d5.includes('adaptiveOrder'),'V5.3D5 selection intelligence must remain present');
const exam = fs.readFileSync(require.resolve('../v53b-unified-practice-retrieval.js'),'utf8');
assert(exam.includes("input.p_exam_year == null"),'Exam routing boundary must remain explicit');

console.log('V5.4A resource bank visibility regression passed.');
