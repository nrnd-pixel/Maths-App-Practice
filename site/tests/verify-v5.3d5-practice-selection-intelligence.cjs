const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname,'..','..');
const modulePath = path.join(root,'site','v53d5-practice-selection-intelligence.js');
const migrationPath = path.join(root,'supabase','v53d5_practice_selection_intelligence.sql');
const loaderPath = path.join(root,'site','v40-release.js');

const source = fs.readFileSync(modulePath,'utf8');
const migration = fs.readFileSync(migrationPath,'utf8');
const loader = fs.readFileSync(loaderPath,'utf8');
const api = require(modulePath);

assert.strictEqual(api.isAdaptiveContext({strand:'all',topic:'all',difficulty:'all'}),true,'Mixed + Any should enable D5 intelligence');
assert.strictEqual(api.isAdaptiveContext({strand:'number',topic:'all',difficulty:'all'}),false,'Explicit strand must bypass D5 intelligence');
assert.strictEqual(api.isAdaptiveContext({strand:'all',topic:'Fractions',difficulty:'all'}),false,'Explicit topic must bypass D5 intelligence');
assert.strictEqual(api.isAdaptiveContext({strand:'all',topic:'all',difficulty:'standard'}),false,'Explicit difficulty must bypass D5 intelligence');
assert(source.includes("if (!isAdaptiveContext(context) && typeof previousShuffle === 'function') return previousShuffle(items);"),'Runtime must preserve D3 selector for explicit student filters');

assert.strictEqual(api.evidenceLevel(40,3,3),2,'<60 with enough evidence should be needs-attention');
assert.strictEqual(api.evidenceLevel(70,3,3),1,'60–79 with enough evidence should be developing');
assert.strictEqual(api.evidenceLevel(90,3,3),0,'>=80 should not receive weak-area weighting');
assert.strictEqual(api.evidenceLevel(40,2,3),0,'Insufficient evidence must remain neutral');

const skillNeed = api.rowLearningNeed({practice_skill_scored_responses:2,practice_skill_percent:45,practice_topic_scored_responses:10,practice_topic_percent:90});
assert.strictEqual(skillNeed.level,2,'Skill evidence should take priority when it has enough responses');
assert.strictEqual(skillNeed.source,'skill');
const topicNeed = api.rowLearningNeed({practice_skill_scored_responses:1,practice_skill_percent:20,practice_topic_scored_responses:3,practice_topic_percent:70});
assert.strictEqual(topicNeed.level,1,'Topic evidence should be used when skill evidence is sparse');
assert.strictEqual(topicNeed.source,'topic');

function q(id,topic,skill,difficulty='standard',extra={}){
  return {id,strand:'number',topic,skill,difficulty,practice_seen_count:0,...extra};
}
const fixedRng = () => 0.5;

const repeatVsWeak = api.adaptiveOrderPracticeItems([
  q('seen-weak','Algebra','Solve', 'standard', {practice_seen_count:1,practice_skill_scored_responses:3,practice_skill_percent:20,practice_last_seen_at:'2026-01-01T00:00:00Z'}),
  q('unseen-neutral','Fractions','Equivalent', 'standard', {practice_seen_count:0,practice_topic_scored_responses:3,practice_topic_percent:95})
],{strand:'all',topic:'all',difficulty:'all',count:2},fixedRng);
assert.strictEqual(repeatVsWeak[0].id,'unseen-neutral','D3 unseen-first protection must remain stronger than weak-area weighting');

const weighted = api.adaptiveOrderPracticeItems([
  q('weak-a','Algebra','Skill A','standard',{practice_skill_scored_responses:3,practice_skill_percent:30}),
  q('weak-b','Algebra','Skill B','standard',{practice_skill_scored_responses:3,practice_skill_percent:30}),
  q('neutral-a','Fractions','Skill C','standard',{practice_topic_scored_responses:3,practice_topic_percent:90}),
  q('neutral-b','Decimals','Skill D','standard',{practice_topic_scored_responses:3,practice_topic_percent:90})
],{strand:'all',topic:'all',difficulty:'all',count:4},fixedRng);
assert.deepStrictEqual(weighted.slice(0,2).map(x=>x.id),['weak-a','weak-b'],'Needs-attention topics should receive a modest weighted head start');
assert.strictEqual(weighted[2].id,'neutral-a','Weighting must rotate back to other topics rather than monopolise the session');

const skillDiversity = api.adaptiveOrderPracticeItems([
  q('same-a1','Fractions','Equivalent fractions'),
  q('same-a2','Fractions','Equivalent fractions'),
  q('same-b1','Fractions','Compare fractions')
],{strand:'all',topic:'all',difficulty:'all',count:3},fixedRng);
assert.deepStrictEqual(skillDiversity.slice(0,2).map(x=>x.id),['same-a1','same-b1'],'Within the same topic, a different skill should be preferred before repeating the same skill');

const challengePool = [
  q('s1','Fractions','A','standard'),q('s2','Fractions','B','standard'),q('s3','Fractions','C','standard'),q('s4','Fractions','D','standard'),
  q('c1','Fractions','E','challenge'),q('c2','Fractions','F','challenge'),q('c3','Fractions','G','challenge')
];
const challengeOrdered = api.adaptiveOrderPracticeItems(challengePool,{strand:'all',topic:'all',difficulty:'all',count:5},fixedRng);
assert(challengeOrdered.slice(0,5).filter(x=>x.difficulty==='challenge').length <= api.challengeLimit(5),'First requested items must respect the soft Challenge cap when non-Challenge alternatives exist');
assert.strictEqual(api.challengeLimit(5),1);
assert.strictEqual(api.challengeLimit(10),2);

const routed = api.routeRpc('get_student_practice_questions_v53b',{p_access_token:'ticket',p_year_level:6});
assert.strictEqual(routed.name,'get_student_practice_questions_v53d5','Ordinary Practice retrieval must route to D5');
assert.deepStrictEqual(routed.args,{p_access_token:'ticket',p_year_level:6});
const examRoute = api.routeRpc('get_student_questions',{p_access_token:'ticket',p_year_level:6,p_exam_year:2025,p_paper:'Paper 1'});
assert.strictEqual(examRoute.name,'get_student_questions','Exam retrieval must remain untouched');

assert(source.includes('practice_topic_scored_responses'),'Client must understand topic learning evidence');
assert(source.includes('practice_skill_scored_responses'),'Client must understand skill learning evidence');
assert(source.includes('tries >= 80'),'Install retry loop must be bounded');
assert(source.includes('clearInterval(timer)'),'Install retry loop must stop');
assert(!source.includes('MutationObserver'),'D5 must not add a permanent DOM observer');
assert(!source.includes('grade_practice_response'),'D5 must not alter grading');
assert(!source.includes('submit_practice_session'),'D5 must not alter submission');

assert(migration.includes('get_student_practice_questions_v53d5'),'Migration must define a versioned D5 retrieval RPC');
assert(migration.includes('q.practice_eligible = true'),'D5 retrieval must use the unified Practice eligibility boundary');
assert(migration.includes("'practice_topic_scored_responses'"),'RPC must return aggregate topic evidence');
assert(migration.includes("'practice_skill_scored_responses'"),'RPC must return aggregate skill evidence');
assert(migration.includes("security definer\nset search_path to ''"),'Security-definer RPC must pin an empty search_path');
assert(migration.includes('revoke all on function public.get_student_practice_questions_v53d5(text,smallint) from public'),'PUBLIC execute must be revoked');
assert(migration.includes('grant execute on function public.get_student_practice_questions_v53d5(text,smallint) to anon, authenticated'),'Bearer-ticket client roles must receive explicit execute grants');
assert(!migration.includes("'final_answer'"),'D5 retrieval must not expose previous answer text');
assert(!migration.includes("'correct_answer_snapshot'"),'D5 retrieval must not expose previous correct-answer snapshots');
assert(!migration.includes('create or replace function public.get_student_practice_questions_v53d3'),'D3 rollback RPC must remain untouched');
assert(!/update\s+public\.questions[\s\S]*active\s*=/i.test(migration),'D5 must not activate questions');

assert(loader.includes("loadScriptOnce('v53d5-practice-selection-intelligence.js?v=53d5-1', 'data-v53d5-practice-selection-intelligence');"),'Stable release loader must include the D5 selector');

console.log('V5.3D5 Practice selection intelligence regression checks passed.');
