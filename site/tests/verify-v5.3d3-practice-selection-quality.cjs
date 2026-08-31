const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(__dirname,'..');
const repoRoot = path.resolve(siteRoot,'..');
const read = rel => fs.readFileSync(path.join(repoRoot,rel),'utf8');
const selection = require('../v53d3-practice-selection-quality.js');

const sql = read('supabase/v53d3_practice_question_history.sql');
const release = read('site/v40-release.js');
const v53b = read('site/v53b-unified-practice-retrieval.js');
const d1 = read('site/v53d1-teacher-practice-pool-alignment.js');

const ordinary = selection.routeRpc('get_student_questions',{
  p_access_token:'ticket',p_year_level:6,p_exam_year:null,p_paper:null
});
assert.equal(ordinary.name,'get_student_practice_questions_v53d3',
  'Ordinary Practice must use the repeat-aware V5.3D3 retrieval RPC.');
assert.deepEqual(ordinary.args,{p_access_token:'ticket',p_year_level:6});

const directV53b = selection.routeRpc('get_student_practice_questions_v53b',{
  p_access_token:'ticket',p_year_level:6
});
assert.equal(directV53b.name,'get_student_practice_questions_v53d3',
  'The V5.3B retrieval alias must safely upgrade to V5.3D3.');

const exam = selection.routeRpc('get_student_questions',{
  p_access_token:'ticket',p_year_level:6,p_exam_year:2025,p_paper:'Paper 1'
});
assert.equal(exam.name,'get_student_questions','Exam retrieval must remain unchanged.');
assert.equal(selection.routeRpc('get_student_topical_questions_v52c',{}).name,'get_student_topical_questions_v52c',
  'The hidden V5.2C rollback route must remain untouched.');

const at = (id,topic,seen,lastSeen=null) => ({
  id,strand:'thinking',topic,practice_seen_count:seen,practice_last_seen_at:lastSeen
});
const ordered = selection.orderPracticeItems([
  at('a1','Topic A',0),
  at('a2','Topic A',0),
  at('b1','Topic B',0),
  at('c-recent','Topic C',1,'2026-08-30T00:00:00Z'),
  at('c-old','Topic C',1,'2026-01-01T00:00:00Z'),
  at('d2','Topic D',2,'2026-01-01T00:00:00Z')
],() => 0.5);

assert.deepEqual(ordered.slice(0,3).map(q=>q.id),['a1','b1','a2'],
  'Unseen questions must come first and balance topics before repeating a topic.');
assert.deepEqual(ordered.slice(3,5).map(q=>q.id),['c-old','c-recent'],
  'Within the same exposure tier, the least-recently-seen question must come first.');
assert.equal(ordered.at(-1).id,'d2','More frequently seen questions must be deferred.');

const multipart = {
  _kind:'multipart',strand:'geometry',topic:'Angles',parts:[
    at('p1','Angles',0),
    at('p2','Angles',2,'2026-08-29T00:00:00Z')
  ]
};
assert.deepEqual(selection.itemHistory(multipart),{
  seenCount:2,lastSeenMs:Date.parse('2026-08-29T00:00:00Z')
},'Multipart history must rank the whole logical question by its most-exposed part.');
assert.equal(selection.balanceKey({strand:' Number ','topic':' Fractions  '}),'number|fractions');

const legacy = [{id:'x'},{id:'y'},{id:'z'}];
assert.deepEqual(selection.orderPracticeItems(legacy,() => 0),['y','z','x'],
  'Arrays without V5.3D3 history metadata must retain randomized fallback behavior.');

assert.match(sql,/get_student_practice_questions_v53d3/i);
assert.match(sql,/q\.practice_eligible\s*=\s*true/i,
  'D3 retrieval must keep the unified Practice eligibility boundary.');
assert.match(sql,/count\(distinct\s+sa\.session_id\)/i,
  'Exposure count must use saved Practice sessions rather than answer attempts.');
assert.match(sql,/coalesce\(ps\.practice_mode,''\)\s*<>\s*'exam'/i,
  'Exam evidence must not influence ordinary-Practice repeat avoidance.');
assert.match(sql,/'practice_seen_count'/i);
assert.match(sql,/'practice_last_seen_at'/i);
assert.doesNotMatch(sql,/sa\.correct|sa\.final_answer|sa\.response_payload/i,
  'D3 retrieval must expose only aggregate exposure metadata, not prior answers or correctness.');
assert.match(sql,/security definer/i);
assert.match(sql,/set search_path to ''/i);
assert.match(sql,/revoke all on function public\.get_student_practice_questions_v53d3\(text,smallint\) from public/i);
assert.match(sql,/grant execute on function public\.get_student_practice_questions_v53d3\(text,smallint\) to anon, authenticated/i);

assert.match(release,/v53b-unified-practice-retrieval\.js\?v=53b-1/,
  'V5.3B rollback bridge must remain loaded.');
assert.match(release,/v53d1-teacher-practice-pool-alignment\.js\?v=53d1-3/,
  'Accepted V5.3D1 assignment alignment must remain loaded.');
assert.match(release,/v53d3-practice-selection-quality\.js\?v=53d3-1', 'data-v53d3-practice-selection-quality'/,
  'D3 selection quality must be wired into the release loader.');
assert.match(v53b,/grade_practice_response_v53b/,
  'Accepted V5.3B grading must remain authoritative.');
assert.match(d1,/start_student_practice_assignment_v53d1/,
  'Accepted V5.3D1 assignment flow must remain authoritative.');

console.log('V5.3D3 Practice selection quality verification passed.');
console.log('- ordinary Practice retrieval carries per-student exposure history only');
console.log('- unseen and less-seen questions are preferred before repeats');
console.log('- topics are balanced within the active exposure tier');
console.log('- older exposures are preferred before recent repeats');
console.log('- multipart questions are ranked as one logical item');
console.log('- Exam, grading and targeted-assignment contracts remain unchanged');
