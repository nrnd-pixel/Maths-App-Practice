const assert = require('assert');
const fs = require('fs');
const path = require('path');

const modulePath = path.join(__dirname,'..','practice-selection-engine.js');
const source = fs.readFileSync(modulePath,'utf8');
const d5LogicStart = source.indexOf('// V5.3D5 — adaptive Mixed Practice selection');
const d5LogicEnd = source.indexOf('// Compatibility API publication happens immediately');
const d5InstallStart = source.indexOf('function installD5BridgeAndFinalize()');
const d5InstallEnd = source.indexOf('\n  function installRpcChain()', d5InstallStart);
assert(d5LogicStart >= 0 && d5LogicEnd > d5LogicStart,'D5 adaptive logic section must remain identifiable');
assert(d5InstallStart >= 0 && d5InstallEnd > d5InstallStart,'D5 coordinated installer section must remain identifiable');
const d5Source = `${source.slice(d5LogicStart,d5LogicEnd)}\n${source.slice(d5InstallStart,d5InstallEnd)}`;

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

const api = require(modulePath).V53D5PracticeSelection;

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
  q('s3','Measurement',{difficulty:'standard'}),
  q('s4','Percentages',{difficulty:'standard'}),
  q('s5','Whole Numbers',{difficulty:'standard'})
],{targetCount:5,recommendation:null,broadMixed:true},()=>0.1).slice(0,5);
assert(challengePool.filter(item => item.difficulty === 'challenge').length <= 1,'Any-difficulty Mixed Practice should cap Challenge questions at 20% when equivalent unseen non-Challenge alternatives are available');

const exposureBeatsCap = api.adaptiveOrder([
  q('uc1','Angles',{difficulty:'challenge',seen:0}),
  q('uc2','Fractions',{difficulty:'challenge',seen:0}),
  q('seen-standard','Decimals',{difficulty:'standard',seen:1})
],{targetCount:2,recommendation:null,broadMixed:true},()=>0.1).slice(0,2);
assert(exposureBeatsCap.every(item => item.difficulty === 'challenge'),'Repeat avoidance must remain stronger than the Challenge cap when the only non-Challenge alternative has already been seen');

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

assert(d5Source.includes("previousRpc('get_student_practice_recommendation'"),'D5 must reuse the accepted D4 recommendation contract through its captured previousRpc');
assert(source.includes('get_student_practice_questions_v53d3'),'D5 must compose with the accepted D3 retrieval route');
assert(d5Source.includes('const broadMixed = isBroadMixedState(currentState())'),'D5 must load recommendation context only for true broad Mixed Practice');
assert(d5Source.includes('accessToken && broadMixed'),'Explicit Practice filters must not pay the extra recommendation-RPC cost');
assert(!d5Source.includes('grade_practice_response'),'D5 must not change grading');
assert(!d5Source.includes('submit_practice_session'),'D5 must not change Practice submission');
assert(!d5Source.includes('request_practice_hint'),'D5 must not change hints');
assert(!d5Source.includes('practice_eligible ='),'D5 must not mutate eligibility');
assert(!d5Source.includes('MutationObserver'),'D5 must not add a permanent DOM observer');
assert(!source.includes('function installSelection('),'consolidated engine must eliminate the old independent D3/D5 shuffle installer');
assert(source.indexOf('cloud.__v53d4StudentRecommendationRpcBridge !== true') < source.indexOf('const previousRpc = cloud.rpc.bind(cloud)', source.indexOf('function installD5BridgeAndFinalize()')),'D4 must be established before D5 captures previousRpc');

console.log('V5.3D5 Practice selection intelligence regression through consolidated engine: PASS');
