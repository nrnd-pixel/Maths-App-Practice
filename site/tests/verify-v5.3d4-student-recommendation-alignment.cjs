const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(__dirname,'..');
const repoRoot = path.resolve(siteRoot,'..');
const read = rel => fs.readFileSync(path.join(repoRoot,rel),'utf8');
const bridge = require('../v53d4-student-recommendation-alignment.js');

const sql = read('supabase/v53d4_student_recommendation_alignment.sql');
const release = read('site/v40-release.js');
const d3 = read('site/v53d3-practice-selection-quality.js');
const d1 = read('site/v53d1-teacher-practice-pool-alignment.js');

const routed = bridge.routeRpc('get_student_practice_recommendation',{p_access_token:'ticket'});
assert.deepEqual(routed,{
  name:'get_student_practice_recommendation_v53d4',
  args:{p_access_token:'ticket'}
},'Student Practice recommendation must route to the unified-resource-bank V5.3D4 RPC.');

const ordinary = bridge.routeRpc('get_student_practice_questions_v53d3',{p_access_token:'ticket',p_year_level:6});
assert.equal(ordinary.name,'get_student_practice_questions_v53d3',
  'D4 must not alter the accepted D3 Practice retrieval route.');
const exam = bridge.routeRpc('get_student_questions',{p_access_token:'ticket',p_year_level:6,p_exam_year:2025,p_paper:'Paper 1'});
assert.equal(exam.name,'get_student_questions','D4 must not alter Exam retrieval.');
assert.equal(bridge.routeRpc('grade_practice_response_v53b',{}).name,'grade_practice_response_v53b',
  'D4 must not alter Practice grading.');
assert.equal(bridge.routeRpc('start_student_practice_assignment_v53d1',{}).name,'start_student_practice_assignment_v53d1',
  'D4 must not alter targeted Practice assignments.');

assert.match(sql,/get_student_practice_recommendation_v53d4\(p_access_token text\)/i);
assert.match(sql,/q\.practice_eligible\s*=\s*true/i,
  'D4 recommendation availability must use the unified Practice eligibility boundary.');
assert.doesNotMatch(sql,/q\.active\s*=\s*true/i,
  'D4 recommendation availability must not fall back to the legacy active-only pool.');
assert.match(sql,/practice_logical_item_key_v53d1\(/i,
  'D4 recommendation counts must use the source-aware logical-question key.');

assert.match(sql,/if v_percent < 60 then\s+v_reason := 'needs_attention'/i,
  'The existing needs-attention recommendation threshold must be preserved.');
assert.match(sql,/elsif v_percent < 80 then\s+v_reason := 'developing'/i,
  'The existing developing recommendation threshold must be preserved.');
assert.match(sql,/else\s+v_reason := 'consolidation'/i,
  'The existing consolidation recommendation state must be preserved.');
assert.match(sql,/if v_topic_items >= 5 then/i,
  'The existing topic-vs-strand recommendation scope threshold must be preserved.');
assert.match(sql,/v_recommended_count := least\(5,/i,
  'The existing maximum five-question recommendation size must be preserved.');

[
  'year_level','reason','focus_strand','focus_topic','performance_percent',
  'scored_responses','focus_topic_questions','practice_scope','practice_strand',
  'practice_topic','available_questions','recommended_count'
].forEach(field => assert.match(sql,new RegExp(`'${field}'`,'i'),`Recommendation output field ${field} must be preserved.`));

assert.match(sql,/security definer/i);
assert.match(sql,/set search_path to ''/i);
assert.match(sql,/revoke all on function public\.get_student_practice_recommendation_v53d4\(text\) from public/i);
assert.match(sql,/grant execute on function public\.get_student_practice_recommendation_v53d4\(text\) to anon, authenticated, service_role/i);

assert.match(release,/v53d3-practice-selection-quality\.js\?v=53d3-1', 'data-v53d3-practice-selection-quality'/,
  'Accepted D3 selection quality must remain loaded.');
assert.match(release,/v53d4-student-recommendation-alignment\.js\?v=53d4-1', 'data-v53d4-student-recommendation-alignment'/,
  'D4 student recommendation alignment must be wired into the release loader.');
assert.match(d3,/get_student_practice_questions_v53d3/,
  'Accepted D3 repeat-aware Practice selection must remain authoritative.');
assert.match(d1,/start_student_practice_assignment_v53d1/,
  'Accepted D1 targeted assignment flow must remain authoritative.');

assert.doesNotMatch(sql,/update\s+public\.questions|delete\s+from\s+public\.questions|insert\s+into\s+public\.questions/i,
  'D4 recommendation alignment must remain read-only with respect to the question bank.');
assert.doesNotMatch(sql,/is_topical_published|topical_exercise_publication|active\s*=/i,
  'D4 must not mutate or redefine topical publication/activation boundaries.');

console.log('V5.3D4 student recommendation alignment verification passed.');
console.log('- student recommendation availability uses the unified Practice resource bank');
console.log('- source-aware multipart logical counts are preserved');
console.log('- recommendation evidence, thresholds and output shape remain unchanged');
console.log('- D3 selection, D1 assignments, grading and Exam routes remain untouched');
