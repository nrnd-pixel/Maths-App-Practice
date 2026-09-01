const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname,'..','..');
const modulePath = path.join(root,'site','v53d5-practice-selection-intelligence.js');
const retiredRpcPath = path.join(root,'supabase','v53d5_practice_selection_intelligence.sql');
const loaderPath = path.join(root,'site','v40-release.js');

const source = fs.readFileSync(modulePath,'utf8');
const loader = fs.readFileSync(loaderPath,'utf8');
const api = require(modulePath);

assert.strictEqual(api.isAdaptiveContext({strand:'all',topic:'all',difficulty:'all'}),true,'Mixed + Any should enable D5 intelligence');
assert.strictEqual(api.isAdaptiveContext({strand:'number',topic:'all',difficulty:'all'}),false,'Explicit strand must bypass D5 intelligence');
assert.strictEqual(api.isAdaptiveContext({strand:'all',topic:'Fractions',difficulty:'all'}),false,'Explicit topic must bypass D5 intelligence');
assert.strictEqual(api.isAdaptiveContext({strand:'all',topic:'all',difficulty:'standard'}),false,'Explicit difficulty must bypass D5 intelligence');
assert(source.includes("if (!isAdaptiveContext(context)) return d3Order(source,rng);"),'Explicit filters must delegate to D3 ordering');

assert.deepStrictEqual(api.recommendationNeed({focus_strand:'number',focus_topic:'Algebra',performance_percent:40}),{
  level:2,key:'number|algebra',strand:'number',topic:'algebra',percent:40
});
assert.strictEqual(api.recommendationNeed({focus_strand:'number',focus_topic:'Algebra',performance_percent:70}).level,1);
assert.strictEqual(api.recommendationNeed({focus_strand:'number',focus_topic:'Algebra',performance_percent:85}).level,0);
assert.strictEqual(api.weakAreaLimit(5),2);
assert.strictEqual(api.weakAreaLimit(10),4);
assert.strictEqual(api.challengeLimit(5),1);
assert.strictEqual(api.challengeLimit(10),2);

function q(id,topic,skill,difficulty='standard',extra={}){
  return {id,strand:'number',topic,skill,difficulty,practice_seen_count:0,...extra};
}
const fixedRng = () => 0.5;

const repeatVsWeak = api.adaptiveOrderPracticeItems([
  q('seen-weak','Algebra','Solve','standard',{practice_seen_count:1,practice_last_seen_at:'2026-01-01T00:00:00Z'}),
  q('unseen-neutral','Fractions','Equivalent','standard',{practice_seen_count:0})
],{strand:'all',topic:'all',difficulty:'all',count:2},{focus_strand:'number',focus_topic:'Algebra',performance_percent:20},fixedRng);
assert.strictEqual(repeatVsWeak[0].id,'unseen-neutral','D3 unseen-first protection must remain stronger than weak-area weighting');

const weighted = api.adaptiveOrderPracticeItems([
  q('weak-a','Algebra','Skill A'),
  q('weak-b','Algebra','Skill B'),
  q('neutral-a','Fractions','Skill C'),
  q('neutral-b','Decimals','Skill D')
],{strand:'all',topic:'all',difficulty:'all',count:4},{focus_strand:'number',focus_topic:'Algebra',performance_percent:30},fixedRng);
assert.strictEqual(weighted[0].topic,'Algebra','Needs-attention focus should receive a controlled head start');
assert(weighted.slice(0,4).some(x=>x.topic!=='Algebra'),'Weak-area weighting must not monopolise Mixed Practice');
assert(weighted.slice(0,4).filter(x=>x.topic==='Algebra').length <= api.weakAreaLimit(4),'Weak-area selections must stay within the session cap');

const skillDiversity = api.adaptiveOrderPracticeItems([
  q('same-a1','Fractions','Equivalent fractions'),
  q('same-a2','Fractions','Equivalent fractions'),
  q('same-b1','Fractions','Compare fractions')
],{strand:'all',topic:'all',difficulty:'all',count:3},null,fixedRng);
assert.deepStrictEqual(skillDiversity.slice(0,2).map(x=>x.id),['same-a1','same-b1'],'Within one topic, a different skill should be preferred before repeating the same skill');

const difficultyPool = [
  q('s1','Fractions','S1','standard'),q('s2','Fractions','S2','standard'),q('s3','Fractions','S3','standard'),
  q('s4','Fractions','S4','standard'),q('s5','Fractions','S5','standard'),q('s6','Fractions','S6','standard'),
  q('f1','Fractions','F1','foundation'),q('f2','Fractions','F2','foundation'),
  q('c1','Fractions','C1','challenge'),q('c2','Fractions','C2','challenge')
];
const difficultyOrdered = api.adaptiveOrderPracticeItems(difficultyPool,{strand:'all',topic:'all',difficulty:'all',count:5},null,fixedRng);
const firstFive = difficultyOrdered.slice(0,5);
assert(firstFive.some(x=>x.difficulty==='foundation'),'Mixed Practice should reflect available Foundation questions rather than serving Standard only');
assert(firstFive.filter(x=>x.difficulty==='challenge').length <= api.challengeLimit(5),'First requested items must respect the Challenge cap');

const targets = api.difficultyTargets(difficultyPool,5);
assert(Math.abs(targets.standard-3) < 1e-9);
assert(Math.abs(targets.foundation-1) < 1e-9);
assert(Math.abs(targets.challenge-1) < 1e-9);

assert.strictEqual(api.cacheRecommendation({focus_topic:'Algebra'}).focus_topic,'Algebra');
assert.strictEqual(api.getCachedRecommendation().focus_topic,'Algebra');
assert.strictEqual(api.cacheRecommendation(null),null);

assert(source.includes("'get_student_practice_recommendation'"),'D5 must reuse the accepted D4 recommendation contract');
assert(source.includes('Promise.all(['),'D5 must prefetch recommendation evidence alongside ordinary Practice retrieval');
assert(!source.includes('get_student_practice_questions_v53d5'),'D5 must not resurrect the retired question-metadata RPC');
assert(!fs.existsSync(retiredRpcPath),'D5 release must not add the retired v53d5 question-metadata migration');
assert(!source.includes('grade_practice_response'),'D5 must not alter grading');
assert(!source.includes('submit_practice_session'),'D5 must not alter submission');
assert(!source.includes('MutationObserver'),'D5 must not add a permanent DOM observer');
assert(source.includes('tries >= 80'),'Install retry loop must be bounded');
assert(source.includes('clearInterval(timer)'),'Install retry loop must stop');

assert(loader.includes("loadScriptOnce('v53d5-practice-selection-intelligence.js?v=53d5-1', 'data-v53d5-practice-selection-intelligence');"),'Stable release loader must include the D5 selector');

console.log('V5.3D5 Practice selection intelligence regression checks passed.');
