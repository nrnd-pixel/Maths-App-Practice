const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname,'..','..');
const modulePath = path.join(root,'site','v53d5-practice-selection-intelligence.js');
const migrationPath = path.join(root,'supabase','v53d5_practice_selection_intelligence.sql');
const loaderPath = path.join(root,'site','v40-release.js');

const api = require(modulePath);
const source = fs.readFileSync(modulePath,'utf8');
const migration = fs.readFileSync(migrationPath,'utf8');
const loader = fs.readFileSync(loaderPath,'utf8');

assert.strictEqual(api.shouldUseIntelligence({strand:'all',topic:'all',difficulty:'all'}),true,'Mixed + Any difficulty must enable D5');
assert.strictEqual(api.shouldUseIntelligence({strand:'number',topic:'all',difficulty:'all'}),false,'Explicit strand must bypass D5');
assert.strictEqual(api.shouldUseIntelligence({strand:'all',topic:'all',difficulty:'foundation'}),false,'Explicit difficulty must bypass D5');
assert.strictEqual(api.shouldUseIntelligence({strand:'number',topic:'Decimals',difficulty:'standard'}),false,'Explicit targeted Practice must bypass D5');

assert.strictEqual(api.isOrdinaryPracticeQuestionRequest('get_student_questions',{p_exam_year:null,p_paper:null}),true);
assert.strictEqual(api.isOrdinaryPracticeQuestionRequest('get_student_questions',{p_exam_year:2025,p_paper:'Paper 1'}),false,'Exam retrieval must not trigger D5');
assert.strictEqual(api.isOrdinaryPracticeQuestionRequest('get_student_practice_questions_v53d3',{}),true);

assert(api.topicWeight({performance_percent:40}) > api.topicWeight({performance_percent:70}),'Needs-attention topics should receive more weight than developing topics');
assert(api.topicWeight({performance_percent:70}) > api.topicWeight({performance_percent:90}),'Developing topics should receive more weight than consolidated topics');
assert(api.difficultyTargets({performance_percent:40}).challenge < api.difficultyTargets({performance_percent:90}).challenge,'Weak topics must strongly delay Challenge questions');

const profile = {
  year_level:6,
  topics:[
    {strand:'number',topic:'Weak',performance_percent:20,scored_responses:6,eligible_questions:10},
    {strand:'number',topic:'Strong',performance_percent:95,scored_responses:6,eligible_questions:10}
  ]
};

const make = (id,topic,difficulty='standard',skill='skill',seen=0,last='') => ({
  id,strand:'number',topic,difficulty,skill,
  practice_seen_count:seen,
  practice_last_seen_at:last
});

// D3 invariant: unseen beats weak-area weighting.
let ordered = api.orderIntelligentMixed([
  make('weak-seen','Weak','standard','w',1,'2026-08-01T00:00:00Z'),
  make('strong-unseen','Strong','standard','s',0,'')
],profile,()=>0.4);
assert.strictEqual(ordered[0].id,'strong-unseen','D5 must never choose a seen question while an unseen one exists');

// Equal exposure: weak topic gets the gentle first preference.
ordered = api.orderIntelligentMixed([
  make('weak-unseen','Weak'),
  make('strong-unseen-2','Strong')
],profile,()=>0.4);
assert.strictEqual(ordered[0].id,'weak-unseen','Weak topic should win an equal-exposure tie');

// Weighted fairness: an untouched strong/unknown topic still appears before the weak topic monopolises the session.
ordered = api.orderIntelligentMixed([
  make('weak-a','Weak'),
  make('weak-b','Weak'),
  make('strong-a','Strong')
],profile,()=>0.4);
assert.strictEqual(ordered[0].topic,'Weak');
assert.strictEqual(ordered[1].topic,'Strong','Weak weighting must remain gentle rather than monopolising Mixed Practice');

// Skill variety within one topic/difficulty.
ordered = api.orderIntelligentMixed([
  make('skill-a1','Weak','standard','Skill A'),
  make('skill-a2','Weak','standard','Skill A'),
  make('skill-b1','Weak','standard','Skill B')
],profile,()=>0.4);
assert.notStrictEqual(ordered[0].skill,ordered[1].skill,'D5 should prefer a different skill before repeating the same skill when equally eligible');

// Weak-topic difficulty safety: Challenge should remain behind available Foundation/Standard questions.
const weakDifficultyPool = [
  make('f1','Weak','foundation','f1'),make('f2','Weak','foundation','f2'),make('f3','Weak','foundation','f3'),
  make('s1','Weak','standard','s1'),make('s2','Weak','standard','s2'),make('s3','Weak','standard','s3'),
  make('c1','Weak','challenge','c1'),make('c2','Weak','challenge','c2')
];
ordered = api.orderIntelligentMixed(weakDifficultyPool,profile,()=>0.4);
assert(!ordered.slice(0,5).some(q => q.difficulty === 'challenge'),'Challenge must not be over-served to a weak topic');

// Profile contract: aggregate only, unified-bank eligibility, source-aware logical counts, secure token gate.
assert(migration.includes('get_student_practice_selection_profile_v53d5'));
assert(migration.includes('q.practice_eligible = true'),'D5 profile must use the unified Practice bank');
assert(migration.includes('practice_logical_item_key_v53d1'),'D5 profile must count source-aware logical items');
assert(!migration.includes('q.active = true'),'D5 must not fall back to legacy active-only availability');
assert(migration.includes("set search_path to ''"),'D5 SECURITY DEFINER function must pin an empty search_path');
assert(migration.includes('revoke all on function public.get_student_practice_selection_profile_v53d5(text) from public'));
assert(!migration.includes('final_answer') && !migration.includes('correct_answer_snapshot'),'D5 profile must not expose raw student answers');

// Browser bridge scope and release wiring.
assert(source.includes("previousRpc('get_student_practice_selection_profile_v53d5'"),'D5 must fetch only the aggregate selection profile alongside ordinary Practice retrieval');
assert(source.includes('shouldUseIntelligence(session)'),'D5 must guard its selection/profile behavior by Mixed + Any difficulty');
assert(!source.includes('start_or_resume_exam_attempt'),'D5 must not touch Exam Mode');
assert(loader.includes("v53d5-practice-selection-intelligence.js?v=53d5-1"),'D5 release loader wiring is required');
assert(loader.includes("data-v53d5-practice-selection-intelligence"),'D5 loader identity must be stable');

console.log('V5.3D5 Practice selection intelligence regression: PASS');
