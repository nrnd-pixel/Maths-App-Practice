const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname,'..');
const modulePath = path.join(root,'v54e-bulk-practice-eligibility.js');
const sqlPath = path.resolve(root,'../supabase/v54e_bulk_practice_eligibility_controls.sql');
const releasePath = path.join(root,'v40-release.js');
const bulkStatusPath = path.join(root,'v51-question-bank-bulk-status.js');
const d1Path = path.join(root,'v53d1-teacher-practice-pool-alignment.js');
const v54bPath = path.join(root,'v54b-practice-eligibility-controls.js');

const source = fs.readFileSync(modulePath,'utf8');
const sql = fs.readFileSync(sqlPath,'utf8');
const release = fs.readFileSync(releasePath,'utf8');
const bulkStatus = fs.readFileSync(bulkStatusPath,'utf8');
const d1 = fs.readFileSync(d1Path,'utf8');
const v54b = fs.readFileSync(v54bPath,'utf8');
const api = require(modulePath);

const rows = [
  {id:'single-a',year_level:6,source_type:'past_paper',source:'2019 P2',exam_year:2019,paper:'2',question_number:'28',parent_question_number:'',practice_eligible:false},
  {id:'group-b1',year_level:6,source_type:'past_paper',source:'2020 P2',exam_year:2020,paper:'2',question_number:'21(a)',parent_question_number:'21',practice_eligible:true},
  {id:'group-b2',year_level:6,source_type:'past_paper',source:'2020 P2',exam_year:2020,paper:'2',question_number:'21(b)',parent_question_number:'21',practice_eligible:true},
  {id:'topical-c',year_level:6,source_type:'topical_exercise',source:'Topical Set',question_number:'1',parent_question_number:'',practice_eligible:true}
];
const key = row => row.parent_question_number
  ? `group|${row.year_level}|${row.exam_year}|${row.paper}|${row.parent_question_number}`
  : `single|${row.id}`;

const addPlan = api.buildPlan(rows,[rows[0],rows[1]],true,key);
assert.strictEqual(addPlan.logicalQuestions,2,'Single + one multipart part must resolve to two logical questions');
assert.strictEqual(addPlan.logicalRows,3,'Multipart selection must expand to all physical parts');
assert.strictEqual(addPlan.changingLogicalQuestions,1,'Only the currently ineligible logical question should need Add');
assert.strictEqual(addPlan.changingRows,1,'Only the ineligible single physical row should change on Add');
assert.strictEqual(addPlan.representativeIds.length,2,'RPC payload should contain one representative ID per logical question');
assert.strictEqual(addPlan.canRun,true);

const removePlan = api.buildPlan(rows,[rows[0],rows[1],rows[2]],false,key);
assert.strictEqual(removePlan.logicalQuestions,2,'Selecting multiple parts must deduplicate the multipart logical question');
assert.strictEqual(removePlan.logicalRows,3);
assert.strictEqual(removePlan.changingLogicalQuestions,1,'Only the eligible multipart logical question should need Remove');
assert.strictEqual(removePlan.changingRows,2,'Both multipart physical rows must change together');
assert.strictEqual(removePlan.representativeIds.length,2);

const topicalPlan = api.buildPlan(rows,[rows[0],rows[3]],true,key);
assert.strictEqual(topicalPlan.topical.length,1,'Topical selections must be identified');
assert.strictEqual(topicalPlan.canRun,false,'Any topical selection must block the bulk Practice operation');
assert(/Topical resource questions cannot be changed here/.test(api.confirmationText(addPlan)),'Confirmation must restate topical safety boundary');
assert(/legacy active remains unchanged/.test(api.confirmationText(addPlan)),'Confirmation must state that active is unchanged');

assert(source.includes('V51QuestionBankBulkStatus'),'V5.4E must reuse the established V5.1 Question Bank selection');
assert(source.includes('buildPlan?.(rows,undefined,false)?.selected'),'V5.4E must read the existing private selection through the established buildPlan result');
assert(source.includes('V53D1TeacherPracticePoolAlignment?.logicalQuestionKey'),'V5.4E must reuse the accepted V5.3D1 logical-question key');
assert(source.includes("cloud.rpc('save_questions_practice_eligibility_v54e'"),'V5.4E UI must use the atomic teacher bulk RPC');
assert(source.includes('bulkSelectionApi()?.clearSelection?.()'),'Successful bulk Practice writes must clear the established selection');
assert(!source.includes("cloud.from('questions').update"),'V5.4E must not bypass the server contract with direct Question Bank writes');
assert(!source.includes('new MutationObserver'),'V5.4E must not add a permanent DOM observer');
assert(!source.includes('const selectedIds = new Set'),'V5.4E must not create a second Question Bank selection store');
assert(!source.includes('save_topical_practice_eligibility_v53a'),'V5.4E must not mutate topical whole-set eligibility');
assert(!source.includes('grade_practice_response'),'V5.4E must not alter grading');
assert(!source.includes('exam_paper_settings'),'V5.4E must not alter Exam publication');

assert(sql.includes('create or replace function public.save_questions_practice_eligibility_v54e'),'V5.4E migration must create the bulk RPC');
assert(sql.includes('if not public.is_teacher()'),'Bulk RPC must enforce teacher access internally');
assert(sql.includes("set search_path to ''"),'Bulk RPC must pin an empty search_path');
assert(sql.includes('unnest(coalesce(p_question_ids'), 'Bulk RPC must normalize the selected UUID array');
assert(sql.includes('v_requested_rows > 500'),'Bulk RPC must bound request size');
assert(sql.includes("= 'topical_exercise'"),'Bulk RPC must detect and reject topical selections');
assert(sql.includes('practice_logical_item_key_v53d1'),'Bulk RPC must reuse the accepted source-aware logical-question key');
assert(sql.includes('g.year_level = q.year_level'),'Bulk expansion must preserve the V5.4B year-level boundary');
assert(sql.includes('set practice_eligible = v_target'),'Bulk RPC must change Practice eligibility');
assert(!/set\s+active\s*=/i.test(sql),'Bulk RPC must never change legacy active');
assert(sql.includes('active_unchanged'), 'Bulk RPC response must explicitly preserve active');
assert(sql.includes('atomic'), 'Bulk RPC response must identify the atomic transaction contract');
assert(sql.includes('revoke all on function public.save_questions_practice_eligibility_v54e(uuid[],boolean) from public'),'PUBLIC execute must be revoked');
assert(sql.includes('revoke all on function public.save_questions_practice_eligibility_v54e(uuid[],boolean) from anon'),'anon execute must be revoked');
assert(sql.includes('to authenticated, service_role'),'Only authenticated/service_role browser contract must remain');

assert(bulkStatus.includes('selected:Object.freeze(selected.slice())'),'Established bulk selector must expose its selection through buildPlan');
assert(bulkStatus.includes('clearSelection'),'Established bulk selector must retain clear-selection behavior');
assert(d1.includes('function logicalQuestionKey(question)'),'Accepted V5.3D1 logical identity helper must remain intact');
assert(v54b.includes("cloud.rpc('save_question_practice_eligibility_v54b'"),'Accepted V5.4B single-question writer must remain intact');

const d = release.indexOf("v54d-topical-resource-simplification.js?v=54d-1");
const e = release.indexOf("v54e-bulk-practice-eligibility.js?v=54e-1");
assert(d >= 0 && e > d,'Release loader must preserve V5.4D → V5.4E composition order');

console.log('V5.4E bulk Practice eligibility checks passed.');
