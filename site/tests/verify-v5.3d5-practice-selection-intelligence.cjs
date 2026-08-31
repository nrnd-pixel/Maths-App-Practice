const assert = require('assert');
const fs = require('fs');
const path = require('path');

const d3 = require('../v53d3-practice-selection-quality.js');
const d5 = require('../v53d5-practice-selection-intelligence.js');

const source = fs.readFileSync(path.join(__dirname,'..','v53d5-practice-selection-intelligence.js'),'utf8');
const loader = fs.readFileSync(path.join(__dirname,'..','v40-release.js'),'utf8');

function row(id,{strand='number',topic='Fractions',difficulty='standard',seen=0,lastSeen='',reason='needs_attention',scope='topic',focusStrand='number',focusTopic='Algebra',scored=6}={}){
  return {
    id,
    strand,
    topic,
    difficulty,
    practice_seen_count:seen,
    practice_last_seen_at:lastSeen,
    v53d5_focus_reason:reason,
    v53d5_focus_scope:scope,
    v53d5_focus_strand:focusStrand,
    v53d5_focus_topic:focusTopic,
    v53d5_focus_percent:40,
    v53d5_focus_scored_responses:scored
  };
}

const mixed = {strand:'all',topic:'all',difficulty:'all',count:10};
assert.strictEqual(d5.isBroadMixedState(mixed),true,'Broad Mixed Practice should enable D5 intelligence');
assert.strictEqual(d5.isBroadMixedState({...mixed,difficulty:'challenge'}),false,'Explicit difficulty must bypass D5');
assert.strictEqual(d5.isBroadMixedState({...mixed,strand:'number'}),false,'Explicit strand must bypass D5');
assert.strictEqual(d5.isBroadMixedState({...mixed,topic:'Fractions'}),false,'Explicit topic must bypass D5');

assert.strictEqual(d5.hasAdaptiveFocus({reason:'needs_attention',strand:'number',scoredResponses:2}),true,'Needs-attention evidence with two responses should qualify');
assert.strictEqual(d5.hasAdaptiveFocus({reason:'developing',strand:'number',scoredResponses:3}),true,'Developing evidence should qualify');
assert.strictEqual(d5.hasAdaptiveFocus({reason:'needs_attention',strand:'number',scoredResponses:1}),false,'One response must not drive Mixed Practice');
assert.strictEqual(d5.hasAdaptiveFocus({reason:'consolidation',strand:'number',scoredResponses:20}),false,'Consolidation must not receive weak-area weighting');

const enriched = d5.enrichQuestionRows([{id:'q1'}],{
  reason:'needs_attention',practice_scope:'topic',practice_strand:'number',practice_topic:'Algebra',performance_percent:25,scored_responses:8
});
assert.strictEqual(enriched[0].v53d5_focus_topic,'Algebra','Recommendation topic should be attached to question rows');
assert.strictEqual(enriched[0].v53d5_focus_scored_responses,8,'Recommendation evidence count should be attached');

// Repeat avoidance remains the top priority: an unseen non-focus item must beat a seen focus item.
const repeatSafety = [
  row('seen-focus',{topic:'Algebra',seen:1,lastSeen:'2026-08-01T00:00:00Z'}),
  row('unseen-other',{topic:'Fractions',seen:0})
];
const repeatOrdered = d5.orderIntelligentItems(repeatSafety,{...mixed,count:1},()=>0,d3);
assert.strictEqual(repeatOrdered[0].id,'unseen-other','D5 must not override D3 unseen-first behavior with weak-area weighting');

// With alternatives, a 10-question broad session should devote exactly four slots to the weak focus (40%).
const focusPool = [];
for(let i=0;i<10;i++) focusPool.push(row(`focus-${i}`,{topic:'Algebra',seen:0}));
for(let i=0;i<10;i++) focusPool.push(row(`other-${i}`,{strand:i%2?'measurement':'geometry',topic:`Other ${i}`,seen:0}));
const focusOrdered = d5.orderIntelligentItems(focusPool,mixed,()=>0,d3).slice(0,10);
const focusCount = focusOrdered.filter(q => q.topic === 'Algebra').length;
assert.strictEqual(focusCount,4,'Weak-area boost should be capped at 40% when alternatives are available');

// Challenge density is capped at 20% in broad Mixed Practice when same-tier non-Challenge alternatives exist.
const challengePool = [];
for(let i=0;i<10;i++) challengePool.push(row(`challenge-${i}`,{strand:'geometry',topic:`Challenge ${i}`,difficulty:'challenge',reason:'consolidation',scored:20}));
for(let i=0;i<10;i++) challengePool.push(row(`standard-${i}`,{strand:'measurement',topic:`Standard ${i}`,difficulty:'standard',reason:'consolidation',scored:20}));
const challengeOrdered = d5.orderIntelligentItems(challengePool,mixed,()=>0,d3).slice(0,10);
assert(challengeOrdered.filter(q => q.difficulty === 'challenge').length <= 2,'Broad 10-question Practice should contain at most two Challenge questions when alternatives exist');

// Explicit choices must retain the exact accepted D3 ordering contract.
const explicitState = {strand:'number',topic:'all',difficulty:'standard',count:10};
const explicitPool = [
  row('a',{topic:'Fractions',seen:2,lastSeen:'2026-08-10T00:00:00Z'}),
  row('b',{topic:'Decimals',seen:0}),
  row('c',{topic:'Algebra',seen:1,lastSeen:'2026-08-05T00:00:00Z'})
];
const d3Expected = d3.orderPracticeItems(explicitPool,()=>0);
const d5Explicit = d5.orderIntelligentItems(explicitPool,explicitState,()=>0,d3);
assert.deepStrictEqual(d5Explicit.map(q=>q.id),d3Expected.map(q=>q.id),'Explicit Practice filters must fall straight back to V5.3D3 ordering');

assert(source.includes("get_student_practice_recommendation_v53d4"),'D5 must reuse the accepted D4 recommendation contract');
assert(source.includes("get_student_practice_questions_v53d3"),'D5 must compose with the accepted D3 question retrieval path');
assert(source.includes("Math.floor(target*0.2)"),'D5 must keep the 20% Challenge guard');
assert(source.includes("Math.ceil(target*0.4)"),'D5 must keep the 40% weak-area ceiling');
assert(!source.includes("active = true"),'D5 must not restore legacy active-only Practice availability');
assert(!source.includes("grade_practice_response"),'D5 must not alter grading');
assert(!source.includes("submit_practice_session"),'D5 must not alter submission');
assert(!source.includes("start_or_resume_exam"),'D5 must not alter Exam Mode');
assert(!source.includes('new MutationObserver('),'D5 must not add a permanent DOM observer');

assert(loader.indexOf('v53d3-practice-selection-quality.js') < loader.indexOf('v53d5-practice-selection-intelligence.js') || !loader.includes('v53d5-practice-selection-intelligence.js'),'D5 must load after D3');
assert(loader.indexOf('v53d4-student-recommendation-alignment.js') < loader.indexOf('v53d5-practice-selection-intelligence.js') || !loader.includes('v53d5-practice-selection-intelligence.js'),'D5 must load after D4');

console.log('V5.3D5 Practice selection intelligence regression passed.');
