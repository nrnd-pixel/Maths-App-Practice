const assert = require('assert');
const fs = require('fs');
const path = require('path');

const siteRoot = path.resolve(__dirname,'..');
const modulePath = path.join(siteRoot,'v54a-resource-bank-visibility.js');
const loaderPath = path.join(siteRoot,'v40-release.js');
const performancePath = path.join(siteRoot,'v52b1-question-bank-performance.js');
const d6Path = path.join(siteRoot,'v53d6-resource-bank-status-clarity.js');

const mod = require(modulePath);
const performance = require(performancePath);
const source = fs.readFileSync(modulePath,'utf8');
const loader = fs.readFileSync(loaderPath,'utf8');
const d6 = fs.readFileSync(d6Path,'utf8');

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
assert.deepStrictEqual(mod.filterRowsByEligibility(rows,'eligible').map(row=>row.id),['a','b']);
assert.deepStrictEqual(mod.filterRowsByEligibility(rows,'ineligible').map(row=>row.id),['c','d']);
assert.deepStrictEqual(mod.filterRowsByEligibility(rows,'all').map(row=>row.id),['a','b','c','d']);

assert.strictEqual(performance.PAGE_SIZE,50,'V5.4A must preserve the accepted V5.2B.1 50-card paging boundary');
assert(source.includes('practice_eligible === true'),'Eligibility must use practice_eligible explicitly');
assert(source.includes('Unified Practice resource bank'),'Question Bank must expose the unified resource-bank summary');
assert(source.includes('Practice resource'),'Cards must show an eligible Practice-resource status');
assert(source.includes('Not in Practice'),'Cards must show an ineligible Practice-resource status');
assert(source.includes('v54a-eligibility-filter'),'Question Bank must expose the Practice eligibility filter');
assert(source.includes('teacherQuestions = eligibleRows'),'Eligibility must be applied to the full in-memory bank before the paginated renderer');
assert(source.includes('updateFilteredUi'),'Filtered paging/count metadata must be corrected after the full-bank filter');
assert(source.includes('page.total'),'Filtered count must come from the paginated filtered result');
assert(source.includes("meta.querySelector('.v53d6-practice-eligibility-badge')"),'V5.4A must reuse the D6 topical status badge instead of duplicating it');
assert(source.includes("if (sourceCategory(row) === 'topical')"),'Topical rows must never receive a V5.4A fallback badge');
assert(source.includes('ROOT.V53D6ResourceBankStatusClarity?.decorate?.()'),'V5.4A must paint D6 topical status before decorating Question Bank cards');
assert(source.includes('statusBadge(meta,row)'),'Card decoration must pass source context into the badge guard');
assert(d6.includes('v53d6-practice-eligibility-badge'),'Accepted D6 topical Practice-status badge must remain present');

assert(!source.includes("cloud.from('questions').update"),'V5.4A must remain read-only');
assert(!source.includes('cloud.rpc('),'V5.4A must not add RPC writes or retrieval routes');
assert(!source.includes('new MutationObserver('),'V5.4A must not add a permanent DOM observer');
assert(!source.includes('grade_practice_response'),'V5.4A must not alter grading');
assert(!source.includes('submit_practice_session'),'V5.4A must not alter Practice submission');
assert(!source.includes('get_student_'),'V5.4A must not alter student retrieval or recommendation routes');
assert(!source.includes('exam_attempt'),'V5.4A must not alter Exam Mode');
assert(!/practice_eligible\s*=(?!=)/.test(source),'V5.4A must not mutate Practice eligibility');

assert(loader.includes("loadScriptOnce('v53d6-resource-bank-status-clarity.js?v=53d6-1', 'data-v53d6-resource-bank-status-clarity');"),'Accepted D6 loader must remain present');
assert(loader.includes("loadScriptOnce('v54a-resource-bank-visibility.js?v=54a-1', 'data-v54a-resource-bank-visibility');"),'V5.4A loader wiring must be present');
assert(loader.indexOf('v53d6-resource-bank-status-clarity.js') < loader.indexOf('v54a-resource-bank-visibility.js'),'V5.4A must load after D6 so it can reuse D6 topical status elements');

console.log('V5.4A unified Teacher Resource Bank visibility checks passed.');
