const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname,'..','..');
const enginePath = path.join(root,'site','practice-selection-engine.js');
const migrationPath = path.join(root,'supabase','v53b_unified_practice_retrieval.sql');
const loaderPath = path.join(root,'site','v40-release.js');

const engineText = fs.readFileSync(enginePath,'utf8');
const migration = fs.readFileSync(migrationPath,'utf8');
const loader = fs.readFileSync(loaderPath,'utf8');
const api = require(enginePath).V53BUnifiedPractice;

assert(engineText.includes('get_student_practice_questions_v53b'));
assert(engineText.includes('grade_practice_response_v53b'));
assert(engineText.includes('request_practice_hint_v53b'));
assert(engineText.includes('submit_practice_session_v53b'));
assert(engineText.includes('begin_student_ai_help_request_v53b'));

let routed = api.routeRpc('get_student_questions',{p_access_token:'t',p_year_level:6,p_exam_year:null,p_paper:null});
assert.strictEqual(routed.name,'get_student_practice_questions_v53b');
assert.deepStrictEqual(routed.args,{p_access_token:'t',p_year_level:6});

routed = api.routeRpc('get_student_questions',{p_access_token:'t',p_year_level:6,p_exam_year:2025,p_paper:'Paper 1'});
assert.strictEqual(routed.name,'get_student_questions','Exam retrieval must remain on the established RPC.');

assert.strictEqual(api.routeRpc('grade_practice_response_v3',{}).name,'grade_practice_response_v53b');
assert.strictEqual(api.routeRpc('request_practice_hint_v3',{}).name,'request_practice_hint_v53b');
assert.strictEqual(api.routeRpc('submit_practice_session_v3',{}).name,'submit_practice_session_v53b');
assert.strictEqual(api.routeRpc('begin_student_ai_help_request',{p_mode:'practice'}).name,'begin_student_ai_help_request_v53b');

const examA = api.unifiedMultipartKey({exam_year:2025,paper:'Paper 1',parent_question_number:'5',source_type:'past_paper',source:'A'});
const examB = api.unifiedMultipartKey({exam_year:2025,paper:'Paper 1',parent_question_number:'5',source_type:'past_paper',source:'B'});
assert.strictEqual(examA,examB,'Exam multipart grouping must preserve year/paper identity.');

const topicalA = api.unifiedMultipartKey({exam_year:null,paper:'',parent_question_number:'181',source_type:'topical_exercise',source:'Topical Exercise Paper 2 Extra'});
const topicalB = api.unifiedMultipartKey({exam_year:null,paper:'',parent_question_number:'181',source_type:'topical_exercise',source:'Another Topical Set'});
assert.notStrictEqual(topicalA,topicalB,'Different resource-bank sources must never collide on the same multipart parent number.');
assert(topicalA.includes('topical exercise paper 2 extra'));

for (const name of [
  'get_student_practice_questions_v53b',
  'grade_practice_response_v53b',
  'request_practice_hint_v53b',
  'submit_practice_session_v53b',
  'begin_student_ai_help_request_v53b'
]) assert(migration.includes(name),`Missing ${name} migration contract.`);

assert(migration.includes('q.practice_eligible'));
assert(migration.includes('set search_path to \'\''));
assert(migration.includes('to anon, authenticated'));
assert(!migration.includes('create or replace function public.get_student_questions('),'V5.3B must not replace the Exam/legacy get_student_questions RPC.');
assert(!migration.includes('create or replace function public.grade_practice_response_v3('),'V5.3B must keep the established Practice RPC intact for rollback safety.');

const loaderHits = (loader.match(/practice-selection-engine\.js/g) || []).length;
assert.strictEqual(loaderHits,1,'Consolidated V53 Practice engine must be loaded exactly once.');
assert(loader.includes("data-practice-selection-engine"));
assert(!loader.includes("loadScriptOnce('v53b-unified-practice-retrieval.js"),'Historical V53B source must be dormant.');

require('./verify-phase4-v53-practice-selection-engine-integrity.cjs');
console.log('V5.3B unified Practice retrieval invariants passed through consolidated engine.');
