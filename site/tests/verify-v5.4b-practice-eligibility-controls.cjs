const assert=require('assert');
const fs=require('fs');
const path=require('path');

const siteRoot=path.resolve(__dirname,'..');
const modulePath=path.join(siteRoot,'v54b-practice-eligibility-controls.js');
const sqlPath=path.join(siteRoot,'..','supabase','v54b_teacher_practice_eligibility_controls.sql');
const loaderPath=path.join(siteRoot,'v40-release.js');
const v54aPath=path.join(siteRoot,'v54a-resource-bank-visibility.js');
const performancePath=path.join(siteRoot,'v52b1-question-bank-performance.js');
const d6Path=path.join(siteRoot,'v53d6-resource-bank-status-clarity.js');

const mod=require(modulePath);
const source=fs.readFileSync(modulePath,'utf8');
const sql=fs.readFileSync(sqlPath,'utf8');
const loader=fs.readFileSync(loaderPath,'utf8');
const v54a=fs.readFileSync(v54aPath,'utf8');
const d6=fs.readFileSync(d6Path,'utf8');
const performance=require(performancePath);

const singleOff={id:'a',source_type:'past_paper',source:'2019 Paper 2',question_number:'28',parent_question_number:null,practice_eligible:false};
const singleOn={...singleOff,id:'b',practice_eligible:true};
const groupOff={id:'c',source_type:'past_paper',source:'2025 Paper 1',question_number:'31(a)',parent_question_number:'31',practice_eligible:false};
const groupOn={...groupOff,id:'d',practice_eligible:true};
const topical={id:'e',source_type:'topical_exercise',source:'Topical Exercise Paper 2 Extra',question_number:'66',parent_question_number:null,practice_eligible:true};

assert.strictEqual(mod.isTopical(topical),true);
assert.strictEqual(mod.isTopical(singleOff),false);
assert.strictEqual(mod.isGrouped(groupOff),true);
assert.strictEqual(mod.isGrouped(singleOff),false);
assert.strictEqual(mod.isEligible(singleOn),true);
assert.strictEqual(mod.isEligible(singleOff),false);

assert.deepStrictEqual(mod.controlModel(singleOff),{
  managed:false,disabled:false,grouped:false,eligible:false,target:true,label:'Add to Practice'
});
assert.deepStrictEqual(mod.controlModel(singleOn),{
  managed:false,disabled:false,grouped:false,eligible:true,target:false,label:'Remove from Practice'
});
assert.deepStrictEqual(mod.controlModel(groupOff),{
  managed:false,disabled:false,grouped:true,eligible:false,target:true,label:'Add group to Practice'
});
assert.deepStrictEqual(mod.controlModel(groupOn),{
  managed:false,disabled:false,grouped:true,eligible:true,target:false,label:'Remove group from Practice'
});
assert.deepStrictEqual(mod.controlModel(topical),{
  managed:true,disabled:true,grouped:false,eligible:true,target:true,label:'Managed by set'
});

assert(mod.confirmationText(groupOff,mod.controlModel(groupOff)).includes('All parts will stay together'));
assert(source.includes("cloud.rpc('save_question_practice_eligibility_v54b'"),'Browser write must use the teacher-only V5.4B RPC');
assert(source.includes("label:'Managed by set'"),'Topical rows must expose only a managed-by-set state');
assert(source.includes('if (isTopical(row)) throw new Error'),'Browser layer must fail closed if a topical row somehow reaches the per-question writer');
assert(source.includes('if (typeof loadTeacher===\'function\') await loadTeacher()'),'After a write, Question Bank state must be reloaded authoritatively');
assert(source.includes('scheduleDecorate'),'V5.4B must recompose with V5.4A/D6 after writes/renders');
assert(source.includes("ROOT.V54AResourceBankVisibility?.cardQuestionId?.(card)"),'V5.4B should reuse accepted V5.4A card identity where available');
assert(!source.includes("cloud.from('questions').update"),'V5.4B must never write the questions table directly from the browser');
assert(!source.includes('new MutationObserver('),'V5.4B must not add a permanent Question Bank observer');
assert(!source.includes('grade_practice_response'),'V5.4B must not change grading');
assert(!source.includes('submit_practice_session'),'V5.4B must not change Practice submission');
assert(!source.includes('exam_attempt'),'V5.4B must not change Exam Mode');

assert(sql.includes('20260901063600 v54b_teacher_practice_eligibility_controls'),'Repo migration record must match the applied production migration');
assert(sql.includes('save_question_practice_eligibility_v54b'),'Migration must define the V5.4B writer');
assert(sql.includes("security definer\nset search_path to ''"),'Teacher writer must pin an empty search_path');
assert(sql.includes('if not public.is_teacher()'),'Teacher writer must enforce teacher authorization internally');
assert(sql.includes("lower(trim(coalesce(v_question.source_type,''))) = 'topical_exercise'"),'Server must reject topical per-question writes');
assert(sql.includes('Use the Topical Exercise Resource Library'),'Server rejection must direct topical eligibility to the set-level boundary');
assert(sql.includes('public.practice_logical_item_key_v53d1'),'Server must use the accepted source-aware logical-question identity');
assert(sql.includes('q.year_level = v_question.year_level'),'Logical-group update must be year-scoped');
assert(sql.includes("lower(trim(coalesce(q.source_type,''))) <> 'topical_exercise'"),'Logical-group update must exclude topical rows defensively');
assert(sql.includes('q.practice_eligible is distinct from v_target'),'Writer should update only changed eligibility rows');
assert(sql.includes("'logical_rows',v_logical_rows"),'Writer must report the physical logical-group size');
assert(sql.includes("'active_unchanged',true"),'Writer result must state the active boundary explicitly');
assert(!/set\s+active\s*=/i.test(sql),'V5.4B migration must never activate or deactivate questions');
assert(sql.includes('revoke all on function public.save_question_practice_eligibility_v54b(uuid,boolean) from public'),'PUBLIC execute must be revoked');
assert(sql.includes('revoke all on function public.save_question_practice_eligibility_v54b(uuid,boolean) from anon'),'Anon execute must be revoked');
assert(sql.includes('grant execute on function public.save_question_practice_eligibility_v54b(uuid,boolean) to authenticated, service_role'),'Teacher-capable authenticated path/service role may execute');
assert(sql.includes("'practice_eligible',"),'Question Change History must audit Practice eligibility changes');
assert(sql.includes("'practice_eligible', v_question.practice_eligible"),'Question history response should expose current Practice eligibility');

assert.strictEqual(performance.PAGE_SIZE,50,'V5.4B must preserve the accepted 50-card Question Bank paging boundary');
assert(v54a.includes('filterRowsByEligibility'),'Accepted V5.4A full-bank Practice filter must remain present');
assert(v54a.includes('teacherQuestions = eligibleRows'),'Eligibility filtering must still happen before pagination');
assert(d6.includes('v53d6-practice-eligibility-badge'),'Accepted D6 topical Practice-status badge must remain present');
assert(loader.includes("loadScriptOnce('v54a-resource-bank-visibility.js?v=54a3-2', 'data-v54a-resource-bank-visibility');"),'Accepted V5.4A loader must remain present');
assert(loader.includes("loadScriptOnce('v54b-practice-eligibility-controls.js?v=54b-1', 'data-v54b-practice-eligibility-controls');"),'V5.4B loader wiring must be present');
assert(loader.indexOf('v54a-resource-bank-visibility.js') < loader.indexOf('v54b-practice-eligibility-controls.js'),'V5.4B must load after V5.4A');

console.log('V5.4B teacher Practice eligibility control checks passed.');
