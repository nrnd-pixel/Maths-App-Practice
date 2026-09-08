const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const modulePath=path.join(root,'practice-eligibility-ui.js');
const migrationPath=path.join(root,'..','supabase','v53a_practice_eligibility_foundation.sql');
const releasePath=path.join(root,'v40-release.js');
const source=fs.readFileSync(modulePath,'utf8');
const sql=fs.readFileSync(migrationPath,'utf8');
const release=fs.readFileSync(releasePath,'utf8');
const api=require(modulePath);

assert.strictEqual(api.norm(' Topical   Exercise Paper 2 Extra '),'topical exercise paper 2 extra');
assert.strictEqual(api.setKey(6,' Test Set '),'6|test set');

const ready=api.normalizeRows([{year_level:6,source:'Set A',physical_rows:10,logical_questions:9,eligible_rows:0,reviewed_rows:10,active_rows:0,all_eligible:false,partially_eligible:false,ready:true,readiness_reasons:[],student_retrieval_live:false}])[0];
assert.strictEqual(api.eligibilityLabel(ready),'Ready to stage');
assert.strictEqual(api.canEnable(ready),true);
assert.strictEqual(api.canDisable(ready),false);
assert(/student Practice will NOT use this flag until V5\.3B|Ordinary Practice continues/.test(api.stagingCopy(ready)));

const staged=api.normalizeRows([{year_level:6,source:'Set A',physical_rows:10,logical_questions:9,eligible_rows:10,reviewed_rows:10,active_rows:0,all_eligible:true,partially_eligible:false,ready:true,readiness_reasons:[],student_retrieval_live:false}])[0];
assert.strictEqual(api.eligibilityLabel(staged),'Staged for unified Practice');
assert.strictEqual(api.canEnable(staged),false);
assert.strictEqual(api.canDisable(staged),true);

const partial=api.normalizeRows([{year_level:6,source:'Set A',physical_rows:10,logical_questions:9,eligible_rows:3,reviewed_rows:10,active_rows:0,all_eligible:false,partially_eligible:true,ready:true,readiness_reasons:[],student_retrieval_live:false}])[0];
assert.strictEqual(api.eligibilityLabel(partial),'Mixed eligibility — repair needed');
assert.strictEqual(api.canEnable(partial),true);
assert.strictEqual(api.canDisable(partial),true);

assert(sql.includes('add column if not exists practice_eligible boolean not null default false'),'Migration must add an explicit Practice eligibility flag defaulting false');
assert(sql.includes("where active = true\n  and source_type <> 'topical_exercise'"),'Migration must backfill the existing active non-topical Practice pool only');
assert(!sql.includes("source_type = 'topical_exercise'\n  and practice_eligible = true"),'Migration must not automatically make topical rows Practice eligible');
assert(sql.includes('public.topical_exercise_readiness_v52c'),'Enabling a topical set must reuse the established readiness gate');
assert(sql.includes("if not public.is_teacher()"),'Eligibility RPCs must enforce teacher access internally');
assert(sql.includes("set search_path = ''"),'Security-definer RPCs must pin an empty search_path');
assert(sql.includes('student_retrieval_live'), 'V5.3A contract must make staged-only state explicit');
assert(!sql.includes('create or replace function public.get_student_questions'),'V5.3A must not change ordinary Practice retrieval; that belongs to V5.3B');
assert(!sql.includes('grade_practice_response_v3'),'V5.3A must not change ordinary Practice grading');
assert(!sql.includes('submit_practice_session_v3'),'V5.3A must not change ordinary Practice submission');

assert(source.includes("cloud.rpc('get_topical_practice_eligibility_states_v53a')"),'Teacher UI must read eligibility through the guarded RPC');
assert(source.includes("cloud.rpc('save_topical_practice_eligibility_v53a'"),'Teacher UI must write eligibility through the guarded RPC');
assert(source.includes('Student retrieval not live yet'),'Teacher UI must clearly label V5.3A as staging only');
assert(source.includes('Topical rows remain inactive'),'Teacher confirmation must preserve the topical inactive-row safety model');
assert(source.includes('v53a-eligibility-toggle'),'V54B compatibility click class must remain exact');
assert(source.includes("Object.defineProperty(window,'V53APracticeEligibility'"),'V53A public API must remain published');
assert(source.includes('ROOT.__v53aPracticeEligibilityInstalled = true'),'V53A install flag must remain published');
assert(!source.includes("cloud.from('questions').update"),'Teacher UI must not bypass the guarded eligibility RPC with direct table updates');
assert(!source.includes('get_student_questions'),'Teacher eligibility UI must not invoke student Practice retrieval');
assert(!source.includes('save_topical_exercise_setting_v52c'),'Practice eligibility must remain separate from Topical Practice publication');
assert(!source.includes('multipartKey'),'Teacher eligibility UI must not own Practice multipart identity');
assert(!source.includes('shuffle ='),'Teacher eligibility UI must not own Practice selection ordering');

assert(release.includes("loadScriptOnce('practice-eligibility-ui.js', 'data-practice-eligibility-ui');"),'Consolidated V53A owner must be loaded by the stable release loader');
assert(!release.includes("loadScriptOnce('v53a-practice-eligibility.js"),'Historical V53A source must be dormant');
assert(release.indexOf('practice-eligibility-ui.js') < release.indexOf('practice-selection-engine.js'),'V53A owner must remain before the Practice selection engine');

console.log('V5.3A Practice eligibility checks passed against consolidated owner.');
