const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(__dirname,'..');
const repoRoot = path.resolve(siteRoot,'..');
const read = rel => fs.readFileSync(path.join(repoRoot,rel),'utf8');
const selection = require('../v53d5-practice-selection-intelligence.js');

const sql = read('supabase/v53d5_practice_selection_intelligence.sql');
const release = read('site/v40-release.js');
const d3 = read('site/v53d3-practice-selection-quality.js');
const d4 = read('site/v53d4-student-recommendation-alignment.js');

const mixed = {strand:'all',topic:'all',difficulty:'all',count:10};
assert.equal(selection.shouldUseIntelligence(mixed),true,
  'D5 intelligence should run only for true Mixed Practice with Any difficulty.');
assert.equal(selection.shouldUseIntelligence({...mixed,strand:'number'}),false,
  'An explicit strand must remain authoritative.');
assert.equal(selection.shouldUseIntelligence({...mixed,topic:'Fractions'}),false,
  'An explicit topic must remain authoritative.');
assert.equal(selection.shouldUseIntelligence({...mixed,difficulty:'foundation'}),false,
  'An explicit difficulty must remain authoritative.');

assert.equal(selection.isOrdinaryPracticeQuestionRequest('get_student_questions',{
  p_exam_year:null,p_paper:null
}),true);
assert.equal(selection.isOrdinaryPracticeQuestionRequest('get_student_questions',{
  p_exam_year:2025,p_paper:'Paper 1'
}),false,'Exam retrieval must not be intercepted by D5.');
assert.equal(selection.isOrdinaryPracticeQuestionRequest('get_student_topical_questions_v52c',{}),false,
  'The hidden topical rollback route must remain untouched.');

const row = (id,topic,{seen=0,last=null,percent=null,scored=0,difficulty='standard',skill='Skill A',strand='number'}={}) => ({
  id,strand,topic,skill,difficulty,
  practice_seen_count:seen,
  practice_last_seen_at:last,
  practice_topic_percent:percent,
  practice_topic_scored_responses:scored
});

const deterministicD3 = {
  itemHistory(item){
    const rows = item?._kind === 'multipart' ? item.parts : [item];
    return rows.reduce((acc,q) => ({
      seenCount:Math.max(acc.seenCount,Number(q.practice_seen_count||0)),
      lastSeenMs:Math.max(acc.lastSeenMs,Date.parse(q.practice_last_seen_at||'')||0)
    }),{seenCount:0,lastSeenMs:0});
  },
  orderPracticeItems(items){ return [...items].reverse(); }
};

const explicit = [row('a','A'),row('b','B')];
assert.deepEqual(
  selection.orderIntelligentMixed(explicit,{...mixed,strand:'number'},() => 0.5,deterministicD3).map(q=>q.id),
  ['b','a'],
  'Explicit filters must fall back to the accepted D3 ordering contract.'
);

const repeatCase = [
  row('seen-weak','Weak',{seen:1,percent:0,scored:5}),
  row('unseen-mastered','Mastered',{seen:0,percent:100,scored:5})
];
assert.equal(
  selection.orderIntelligentMixed(repeatCase,{...mixed,count:1},() => 0.5,deterministicD3)[0].id,
  'unseen-mastered',
  'D3 repeat avoidance must remain stronger than weak-area weighting.'
);

const weakPool = [];
for(let i=1;i<=10;i++) weakPool.push(row(`w${i}`,`Weak ${i}`,{percent:20,scored:4,skill:`W${i}`}));
for(let i=1;i<=10;i++) weakPool.push(row(`n${i}`,`Neutral ${i}`,{percent:null,scored:0,skill:`N${i}`}));
const weakOrder = selection.orderIntelligentMixed(weakPool,mixed,() => 0.5,deterministicD3).slice(0,10);
const weakChosen = weakOrder.filter(q => Number(q.practice_topic_scored_responses)>=2 && Number(q.practice_topic_percent)<80).length;
assert.equal(weakChosen,6,
  'Weak/developing content must be boosted but capped at 60% when alternatives exist.');

const challengePool = [];
for(let i=1;i<=6;i++) challengePool.push(row(`c${i}`,`Challenge ${i}`,{difficulty:'challenge',skill:`C${i}`}));
for(let i=1;i<=12;i++) challengePool.push(row(`s${i}`,`Standard ${i}`,{difficulty:'standard',skill:`S${i}`}));
const challengeOrder = selection.orderIntelligentMixed(challengePool,mixed,() => 0.5,deterministicD3).slice(0,10);
assert.ok(challengeOrder.filter(q => q.difficulty==='challenge').length <= 2,
  'Challenge content must not exceed 20% of a Mixed/Any session when same-exposure alternatives exist.');

const skillPool = [
  row('a1','Fractions',{skill:'Equivalent fractions'}),
  row('a2','Fractions',{skill:'Equivalent fractions'}),
  row('b1','Fractions',{skill:'Fraction of a quantity'})
];
const skillOrder = selection.orderIntelligentMixed(skillPool,{...mixed,count:3},() => 0.5,deterministicD3);
assert.deepEqual(skillOrder.slice(0,2).map(q=>q.id),['a1','b1'],
  'Within the same topic/exposure tier, D5 should diversify skills before repeating a skill.');

const multipart = {
  _kind:'multipart',strand:'geometry',topic:'Angles',difficulty:'standard',parts:[
    row('p1','Angles',{strand:'geometry',skill:'Angle A',seen:0,percent:40,scored:3}),
    row('p2','Angles',{strand:'geometry',skill:'Angle B',seen:2,last:'2026-08-30T00:00:00Z',percent:40,scored:3})
  ]
};
assert.equal(selection.itemHistory(multipart,deterministicD3).seenCount,2,
  'Multipart repeat history must still be ranked as one logical item.');
assert.equal(selection.topicEvidence(multipart).percent,40,
  'Multipart learning evidence must remain topic-aware without exposing part answers.');

assert.equal(selection.challengeCap(5),1);
assert.equal(selection.challengeCap(10),2);
assert.equal(selection.weakAreaCap(5),3);
assert.equal(selection.weakAreaCap(10),6);
assert.equal(selection.learningWeight({percent:40,scored:3}),1.5);
assert.equal(selection.learningWeight({percent:70,scored:3}),1.2);
assert.equal(selection.learningWeight({percent:90,scored:3}),0.9);
assert.equal(selection.learningWeight({percent:20,scored:1}),1,
  'One scored response is not enough evidence to adapt a topic.');

assert.match(sql,/get_student_practice_questions_v53d5/i);
assert.match(sql,/q\.practice_eligible\s*=\s*true/i,
  'D5 retrieval must keep the unified Practice eligibility boundary.');
assert.match(sql,/'practice_seen_count'/i);
assert.match(sql,/'practice_last_seen_at'/i);
assert.match(sql,/'practice_topic_percent'/i);
assert.match(sql,/'practice_topic_scored_responses'/i);
assert.match(sql,/coalesce\(ps\.practice_mode,''\)\s*<>\s*'exam'/i,
  'Exam sessions must remain excluded from repeat-exposure history.');
assert.doesNotMatch(sql,/final_answer|response_payload|accepted_answers/i,
  'D5 must not return prior student answers or answer keys as learning metadata.');
assert.match(sql,/security definer/i);
assert.match(sql,/set search_path to ''/i);
assert.match(sql,/revoke all on function public\.get_student_practice_questions_v53d5\(text,smallint\) from public/i);
assert.match(sql,/grant execute on function public\.get_student_practice_questions_v53d5\(text,smallint\) to anon, authenticated/i);

assert.match(release,/v53d3-practice-selection-quality\.js\?v=53d3-1/,
  'Accepted D3 repeat-aware selection must remain loaded before D5.');
assert.match(release,/v53d4-student-recommendation-alignment\.js\?v=53d4-1/,
  'Accepted D4 recommendation alignment must remain loaded.');
assert.match(release,/v53d5-practice-selection-intelligence\.js\?v=53d5-1', 'data-v53d5-practice-selection-intelligence'/,
  'D5 selection intelligence must be wired into the release loader.');
assert.match(d3,/practice_seen_count/,
  'D3 repeat-history foundation must remain intact.');
assert.match(d4,/get_student_practice_recommendation_v53d4/,
  'D4 Recommended Practice must remain intact.');

console.log('V5.3D5 Practice selection intelligence verification passed.');
console.log('- intelligence applies only to true Mixed Practice + Any difficulty');
console.log('- unseen/less-seen questions remain the strongest selection priority');
console.log('- weak/developing topics receive a bounded boost');
console.log('- Challenge density is capped when same-exposure alternatives exist');
console.log('- skill variety improves within topic/exposure ties');
console.log('- explicit filters, Exam, grading, assignments and D4 recommendations remain unchanged');
