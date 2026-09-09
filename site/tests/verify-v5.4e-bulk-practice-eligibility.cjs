const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname,'..');
const modulePath = path.join(root,'resource-bank-bulk.js');
const uiPath = path.join(root,'resource-bank-ui.js');
const sqlPath = path.resolve(root,'../supabase/v54e_bulk_practice_eligibility_controls.sql');
const releasePath = path.join(root,'v40-release.js');
const bulkStatusPath = path.join(root,'question-bank-selection-qa.js');
const assignmentsCorePath = path.join(root,'assignments-core.js');

const all=fs.readFileSync(modulePath,'utf8');
const e0=all.indexOf('/* V5.4E — Bulk Practice eligibility controls.');
const f0=all.indexOf('/* V5.4F — Bulk selection scope safety.');
assert(e0>=0&&f0>e0,'Consolidated bulk owner must preserve E→F order');
const source=all.slice(e0,f0);
const ui=fs.readFileSync(uiPath,'utf8');
const b0=ui.indexOf('/* V5.4B — Teacher Practice eligibility controls.');
const c0=ui.indexOf('/* V5.4C — Compact Teacher Question Bank browsing.');
const v54b=ui.slice(b0,c0);
const sql=fs.readFileSync(sqlPath,'utf8');
const release=fs.readFileSync(releasePath,'utf8');
const bulkStatus=fs.readFileSync(bulkStatusPath,'utf8');
const assignmentsCore=fs.readFileSync(assignmentsCorePath,'utf8');
global.window=global;
require(modulePath);
const api=global.V54EBulkPracticeEligibility;

const rows = [
  {id:'single-a',year_level:6,source_type:'past_paper',source:'2019 P2',exam_year:2019,paper:'2',question_number:'28',parent_question_number:'',practice_eligible:false},
  {id:'group-b1',year_level:6,source_type:'past_paper',source:'2020 P2',exam_year:2020,paper:'2',question_number:'21(a)',parent_question_number:'21',practice_eligible:true},
  {id:'group-b2',year_level:6,source_type:'past_paper',source:'2020 P2',exam_year:2020,paper:'2',question_number:'21(b)',parent_question_number:'21',practice_eligible:true},
  {id:'topical-c',year_level:6,source_type:'topical_exercise',source:'Topical Set',question_number:'1',parent_question_number:'',practice_eligible:true}
];
const key=row=>row.parent_question_number?`group|${row.year_level}|${row.exam_year}|${row.paper}|${row.parent_question_number}`:`single|${row.id}`;
const addPlan=api.buildPlan(rows,[rows[0],rows[1]],true,key);
assert.strictEqual(addPlan.logicalQuestions,2);
assert.strictEqual(addPlan.logicalRows,3);
assert.strictEqual(addPlan.changingLogicalQuestions,1);
assert.strictEqual(addPlan.changingRows,1);
assert.strictEqual(addPlan.representativeIds.length,2);
assert.strictEqual(addPlan.canRun,true);
const removePlan=api.buildPlan(rows,[rows[0],rows[1],rows[2]],false,key);
assert.strictEqual(removePlan.logicalQuestions,2);
assert.strictEqual(removePlan.logicalRows,3);
assert.strictEqual(removePlan.changingLogicalQuestions,1);
assert.strictEqual(removePlan.changingRows,2);
assert.strictEqual(removePlan.representativeIds.length,2);
const topicalPlan=api.buildPlan(rows,[rows[0],rows[3]],true,key);
assert.strictEqual(topicalPlan.topical.length,1);
assert.strictEqual(topicalPlan.canRun,false,'Any topical selection must block bulk Practice operation');
assert(/Topical resource questions cannot be changed here/.test(api.confirmationText(addPlan)));
assert(/legacy active remains unchanged/.test(api.confirmationText(addPlan)));

assert(source.includes('V51QuestionBankBulkStatus'),'E must reuse established V51 selection');
assert(source.includes('buildPlan?.(rows,undefined,false)?.selected'));
assert(source.includes('V53D1TeacherPracticePoolAlignment?.logicalQuestionKey'),'E must reuse accepted V53D1 logical key');
assert(source.includes("cloud.rpc('save_questions_practice_eligibility_v54e'"));
assert(source.includes('bulkSelectionApi()?.clearSelection?.()'));
assert(!source.includes("cloud.from('questions').update"));
assert(!source.includes('new MutationObserver'));
assert(!source.includes('const selectedIds = new Set'),'E must not create second selection store');
assert(!source.includes('save_topical_practice_eligibility_v53a'));
assert(!source.includes('grade_practice_response'));
assert(!source.includes('exam_paper_settings'));

assert(sql.includes('create or replace function public.save_questions_practice_eligibility_v54e'));
assert(sql.includes('if not public.is_teacher()'));
assert(sql.includes("set search_path to ''"));
assert(sql.includes('unnest(coalesce(p_question_ids'));
assert(sql.includes('v_requested_rows > 500'));
assert(sql.includes("= 'topical_exercise'"),'Server must reject topical selections');
assert(sql.includes('practice_logical_item_key_v53d1'));
assert(sql.includes('g.year_level = q.year_level'));
assert(sql.includes('set practice_eligible = v_target'));
assert(!/set\s+active\s*=/i.test(sql));
assert(sql.includes('active_unchanged'));
assert(sql.includes('atomic'));
assert(sql.includes('revoke all on function public.save_questions_practice_eligibility_v54e(uuid[],boolean) from public'));
assert(sql.includes('revoke all on function public.save_questions_practice_eligibility_v54e(uuid[],boolean) from anon'));
assert(sql.includes('to authenticated, service_role'));
assert(bulkStatus.includes('selected:Object.freeze(selected.slice())'));
assert(bulkStatus.includes('clearSelection'));
assert(assignmentsCore.includes('function logicalQuestionKey(question)'));
assert(v54b.includes("cloud.rpc('save_question_practice_eligibility_v54b'"));
assert(release.includes("loadScriptOnce('resource-bank-ui.js', 'data-resource-bank-ui');"));
assert(release.includes("loadScriptOnce('resource-bank-bulk.js', 'data-resource-bank-bulk');"));
assert(release.indexOf('resource-bank-ui.js')<release.indexOf('resource-bank-bulk.js'));
console.log('V5.4E bulk Practice eligibility checks passed against consolidated owner.');
