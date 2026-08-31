const assert = require('assert');
const fs = require('fs');
const path = require('path');

const modulePath = path.join(__dirname,'..','v53d5-practice-selection-intelligence.js');
const source = fs.readFileSync(modulePath,'utf8');

globalThis.V53D3PracticeSelection = {
  orderPracticeItems(items){ return [...items].reverse(); },
  itemHistory(item){
    const rows = item?._kind === 'multipart' && Array.isArray(item.parts) ? item.parts : [item];
    let seenCount = 0;
    let lastSeenMs = 0;
    for (const row of rows.filter(Boolean)){
      seenCount = Math.max(seenCount,Number(row.practice_seen_count || 0));
      const t = Date.parse(row.practice_last_seen_at || '');
      if (Number.isFinite(t)) lastSeenMs = Math.max(lastSeenMs,t);
    }
    return {seenCount,lastSeenMs};
  }
};

const api = require(modulePath);

function q(id,topic,{strand='number',difficulty='standard',skill=id,seen=0,lastSeen=''}={}){
  return {
    id,topic,strand,difficulty,skill,
    practice_seen_count:seen,
    practice_last_seen_at:lastSeen
  };
}

const rec = {
  focus_strand:'number',
  focus_topic:'Algebra',
  reason:'needs_attention'
};

assert(api.isBroadMixedState({strand:'all',topic:'all',difficulty:'all'}));
assert(!api.isBroadMixedState({strand:'number',topic:'all',difficulty:'all'}));
assert(!api.isBroadMixedState({strand:'all',topic:'Algebra',difficulty:'all'}));
assert(!api.isBroadMixedState({strand:'all',topic:'all',difficulty:'challenge'}));

assert(api.isOrdinaryPracticeRequest('get_student_questions',{p_exam_year:null,p_paper:''}));
assert(api.isOrdinaryPracticeRequest('get_student_practice_questions_v53d3',{}));
assert(!api.isOrdinaryPracticeRequest('get_student_questions',{p_exam_year:2025,p_paper:'Paper 1'}));
assert(!api.isOrdinaryPracticeRequest('get_student_topical_questions_v52c',{}));

assert.strictEqual(api.focusTarget(5,rec),2);
assert.strictEqual(api.focusTarget(10,rec),4);
assert.strictEqual(api.focusTarget(20,rec),5);
assert.strictEqual(api.challengeCap(5),1);
assert.strictEqual(api.challengeCap(10),2);
assert.strictEqual(api.challengeCap(20),4);
assert(api.difficultyRank('foundation','needs_attention') < api.difficultyRank('standard','needs_attention'));
assert(api.difficultyRank('standard','developing') < api.difficultyRank('challenge','developing'));

const repeatPriority = api.adaptiveOrder([
  q('seen-focus','Algebra',{seen:1,difficulty:'foundation'}),
  q('unseen-other','Fractions',{seen:0})
],{targetCount:1,recommendation:rec,broadMixed:true},()=>0.1);
assert.strictEqual(repeatPriority[0].id,'unseen-other','Unseen material must outrank a previously seen weak-area question');

const controlled = api.adaptiveOrder([
  q('f1','Algebra',{difficulty:'foundation'}),
  q('f2','Algebra',{difficulty:'standard'}),
  q('f3','Algebra',{difficulty:'challenge'}),
  q('f4','Algebra',{difficulty:'standard'}),
  q('n1','Fractions'),
  q('n2','Decimals'),
  q('n3','Percentages'),
  q('n4','Ratio'),
  q('n5','Whole Numbers')
],{targetCount:5,recommendation:rec,broadMixed:true},()=>0.1).slice(0,5);
assert.strictEqual(controlled.filter(item => item.topic === 'Algebra').length,2,'A 5-question Mixed session should cap the weak-area target at two questions');
assert.strictEqual(controlled[0].id,'f1','Needs-attention focus should prefer Foundation before Standard/Challenge when exposure is equal');

const challengePool = api.adaptiveOrder([
  q('c1','Angles',{difficulty:'challenge'}),
  q('c2','Fractions',{difficulty:'challenge'}),
  q('c3','Decimals',{difficulty:'challenge'}),
  q('s1','Algebra',{difficulty:'standard'}),
  q('s2','Ratio',{difficulty:'standard'}),
  q('s3','Measurement',{difficulty:'standard'})
],{targetCount:5,recommendation:null,broadMixed:true},()=>0.1).slice(0,5);
assert(challengePool.filter(item => item.difficulty === 'challenge').length <= 1,'Any-difficulty Mixed Practice should cap Challenge questions at 20% for five questions');

const explicit = [q('a','Algebra'),q('b','Fractions'),q('c','Decimals')];
assert.deepStrictEqual(
  api.adaptiveOrder(explicit,{targetCount:3,recommendation:rec,broadMixed:false},()=>0.1).map(item => item.id),
  ['c','b','a'],
  'Explicit filters must fall back to the accepted V5.3D3 ordering path'
);

const multipart = {
  _kind:'multipart',
  strand:'number',topic:'Fractions',difficulty:'standard',skill:'Multipart fractions',
  parts:[
    q('p1','Fractions',{seen:1,lastSeen:'2026-08-01T00:00:00Z'}),
    q('p2','Fractions',{seen:3,lastSeen:'2026-08-20T00:00:00Z'})
  ]
};
assert.strictEqual(api.itemHistory(multipart).seenCount,3,'Multipart history must use the highest sibling exposure count');
assert.strictEqual(api.itemHistory(multipart).lastSeenMs,Date.parse('2026-08-20T00:00:00Z'));

assert(source.includes("previousRpc('get_student_practice_recommendation'"),'D5 must reuse the accepted D4 recommendation contract');
assert(source.includes('get_student_practice_questions_v53d3'),'D5 must compose with the accepted D3 retrieval route');
assert(!source.includes('grade_practice_response'),'D5 must not change grading');
assert(!source.includes('submit_practice_session'),'D5 must not change Practice submission');
assert(!source.includes('request_practice_hint'),'D5 must not change hints');
assert(!source.includes('practice_eligible ='),'D5 must not mutate eligibility');
assert(!source.includes('MutationObserver'),'D5 must not add a permanent DOM observer');

console.log('V5.3D5 Practice selection intelligence regression: PASS');
