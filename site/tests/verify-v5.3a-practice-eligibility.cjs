const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const modulePath=path.join(root,'v53a-practice-eligibility.js');
const migrationPath=path.join(root,'..','supabase','v53a_practice_eligibility_foundation.sql');
const releasePath=path.join(root,'v40-release.js');
const source=fs.readFileSync(modulePath,'utf8');
const sql=fs.readFileSync(migrationPath,'utf8');
const release=fs.readFileSync(releasePath,'utf8');
const api=require(modulePath);

assert.strictEqual(api.norm(' Topical   Exercise Paper 2 Extra '),'topical exercise paper 2 extra');
assert.strictEqual(api.setKey(6,' Test Set '),'6|test set');

const ready=api.normalizeRows([{year_level:6,source:'Set A',physical_rows:10,logical_questions:9,eligible_rows:0,reviewed_rows:10,active_rows:0,all_eligible:false,partially_eligible:false,ready:true,readiness_reasons:[],student_retrieval_live:false}])[0];
assert.strictEqual(api.eligibilityLabel(ready),'Ready for Practice');
assert.strictEqual(api.retrievalLabel(ready),'Not available in Practice');
assert.strictEqual(api.canEnable(ready),true);
assert.strictEqual(api.canDisable(ready),false);
assert(api.stagingCopy(ready).includes('ready to be added to the ordinary Practice resource bank'));
assert(api.stagingCopy(ready).includes('Topical rows will remain inactive'));

const staged=api.normalizeRows([{year_level:6,source:'Set A',physical_rows:10,logical_questions:9,eligible_rows:10,reviewed_rows:10,active_rows:0,all_eligible:true,partially_eligible:false,ready:true,readiness_reasons:[],student_retrieval_live:false}])[0];
assert.strictEqual(api.eligibilityLabel(staged),'Available in Practice');
assert.strictEqual(api.retrievalLabel(staged),'Live in ordinary Practice');
assert.strictEqual(api.canEnable(staged),false);
assert.strictEqual(api.canDisable(staged),true);
assert(api.stagingCopy(staged).includes('available to students through ordinary Practice'));
assert(api.stagingCopy(staged).includes('Topical rows remain inactive'));

const partial=api.normalizeRows([{year_level:6,source:'Set A',physical_rows:10,logical_questions:9,eligible_rows:3,reviewed_rows:10,active_rows:0,all_eligible:false,partially_eligible:true,ready:true,readiness_reasons:[],student_retrieval_live:false}])[0];
assert.strictEqual(api.eligibilityLabel(partial),'Mixed eligibility — repair needed');
assert.strictEqual(api.retrievalLabel(partial),'Partially available in Practice');
assert.strictEqual(api.canEnable(partial),true);
assert.strictEqual(api.canDisable(partial),true);

assert(sql.includes('add column if not exists practice_eligible boolean not null default false'),'Migration must add an explicit Practice eligibility flag defaulting false');
assert(sql.includes("where active = true\n  and source_type <> 'topical_exercise'"),'Migration must backfill the existing active non-topical Practice pool only');
assert(!sql.includes("source_type = 'topical_exercise'\n  and practice_eligible = true"),'Migration must not automatically make topical rows Practice eligible');
assert(sql.includes('public.topical_exercise_readiness_v52c'),'Enabling a topical set must reuse the established readiness gate');
assert(sql.includes("if not public.is_teacher()"),'Eligibility RPCs must enforce teacher access internally');
assert(sql.includes("set search_path = ''"),'Security-definer RPCs must pin an empty search_path');
assert(sql.includes('student_retrieval_live'),'Historical V5.3A contract field must remain intact');
assert(!sql.includes('create or replace function public.get_student_questions'),'V5.3A migration must not rewrite ordinary Practice retrieval; V5.3B owns that route');
assert(!sql.includes('grade_practice_response_v3'),'V5.3A must not change ordinary Practice grading');
assert(!sql.includes('submit_practice_session_v3'),'V5.3A must not change ordinary Practice submission');

assert(source.includes("cloud.rpc('get_topical_practice_eligibility_states_v53a')"),'Teacher UI must read eligibility through the guarded RPC');
assert(source.includes("cloud.rpc('save_topical_practice_eligibility_v53a'"),'Teacher UI must write eligibility through the guarded RPC');
assert(source.includes('Live in ordinary Practice'),'Teacher UI must describe fully eligible rows as live in ordinary Practice');
assert(!source.includes('Student retrieval not live yet'),'Teacher UI must not retain obsolete staging-only retrieval wording');
assert(!source.includes('future unified Practice pool'),'Teacher UI must not describe the already-live resource bank as future');
assert(source.includes('Topical rows remain inactive'),'Teacher copy must preserve the topical inactive-row safety model');
assert(source.includes('source provenance'),'Teacher copy must preserve source/provenance semantics');
assert(!source.includes("cloud.from('questions').update"),'Teacher UI must not bypass the guarded eligibility RPC with direct table updates');
assert(!source.includes('get_student_questions'),'Teacher eligibility UI must not invoke student Practice retrieval');
assert(!source.includes('save_topical_exercise_setting_v52c'),'Practice eligibility must remain separate from legacy Topical Practice publication');

assert(release.includes("loadScriptOnce('v53a-practice-eligibility.js?v=53a-2', 'data-v53a-practice-eligibility');"),'V5.3D5.1 copy refresh must be cache-busted through the stable release loader');

console.log('V5.3A / V5.3D5.1 Practice eligibility checks passed.');
