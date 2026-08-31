const fs=require('fs');
const path=require('path');
const assert=require('assert');

const modulePath=path.join(__dirname,'..','v54a-question-bank-practice-eligibility.js');
const sqlPath=path.join(__dirname,'..','..','supabase','v54a_question_bank_practice_eligibility.sql');
const source=fs.readFileSync(modulePath,'utf8');
const sql=fs.readFileSync(sqlPath,'utf8');
const api=require(modulePath);

const topicalReviewed={source_type:'topical_exercise',review_status:'reviewed',practice_eligible:false};
const topicalUnreviewed={source_type:'topical_exercise',review_status:'needs_review',practice_eligible:false};
const legacy={source_type:'past_paper',review_status:'none',practice_eligible:true};

assert.strictEqual(api.isTopical(topicalReviewed),true,'Topical resources must be identified explicitly');
assert.strictEqual(api.isReviewed(topicalReviewed),true,'Reviewed topical rows must be recognized');
assert.strictEqual(api.canEnableQuestion(topicalReviewed),true,'Reviewed topical resources may be individually enabled for Practice');
assert.strictEqual(api.canEnableQuestion(topicalUnreviewed),false,'Unreviewed topical resources must not be enabled for Practice');
assert.strictEqual(api.canEnableQuestion(legacy),true,'Legacy/non-topical resources must retain teacher Practice control without a new blanket review requirement');
assert.strictEqual(api.practiceLabel(legacy),'In Practice');
assert.strictEqual(api.practiceLabel(topicalReviewed),'Not in Practice');
assert.strictEqual(api.practiceFilterMatch(legacy,'eligible'),true);
assert.strictEqual(api.practiceFilterMatch(legacy,'ineligible'),false);
assert.strictEqual(api.practiceFilterMatch(topicalReviewed,'ineligible'),true);
assert.strictEqual(api.practiceFilterMatch(topicalReviewed,'all'),true);

assert(source.includes('Practice availability'),'Question Bank must expose Practice availability separately');
assert(source.includes('Active record'),'Active status wording must be clarified as record state');
assert(source.includes('Record status is separate from Practice availability'),'Editor must explain the two independent states');
assert(source.includes('save_question_practice_eligibility_v54a'),'Question Bank control must use the teacher-only V5.4A RPC');
assert(source.includes('Live in student Practice'),'Obsolete pre-V5.3 topical-library messaging must be corrected');
assert(source.includes('Partially in Practice'),'Partial topical eligibility must be presented as a supported resource-bank state, not a repair failure');
assert(source.includes('[0,100,250,500,900,1500]'),'Topical copy refresh must be finite rather than a permanent observer');
assert(!source.includes('new MutationObserver'),'V5.4A must not add another permanent Question Bank observer');
assert(!source.includes("cloud.from('questions')"),'V5.4A browser layer must not write the questions table directly');
assert(!source.includes('CSV_HEADERS'),'V5.4A must not change the accepted import CSV schema');
assert(!source.includes('grade_practice_response'),'V5.4A must not change grading');
assert(!source.includes('submit_practice_session'),'V5.4A must not change Practice submission');
assert(!source.includes('exam_paper_settings'),'V5.4A must not change Exam publication');

assert(sql.includes('save_question_practice_eligibility_v54a'),'Migration must define the per-question teacher eligibility RPC');
assert(sql.includes("security definer\nset search_path to ''"),'Teacher RPCs must pin an empty search_path');
assert(sql.includes('if not public.is_teacher()'),'Teacher RPCs must enforce teacher authorization internally');
assert(sql.includes("v_question.source_type = 'topical_exercise'"),'Server must recognize topical resources');
assert(sql.includes("v_question.review_status,'none') <> 'reviewed'"),'Server must require Reviewed topical rows before enabling Practice');
assert(sql.includes('set practice_eligible = v_target'),'Per-question RPC must update only Practice eligibility');
assert(!/set\s+active\s*=/i.test(sql),'V5.4A migration must never activate/deactivate questions');
assert(sql.includes('revoke all on function public.save_question_practice_eligibility_v54a(uuid,boolean) from public'),'PUBLIC execute must be revoked');
assert(sql.includes('revoke all on function public.save_question_practice_eligibility_v54a(uuid,boolean) from anon'),'Anon execute must be revoked');
assert(sql.includes('grant execute on function public.save_question_practice_eligibility_v54a(uuid,boolean) to authenticated, service_role'),'Only teacher-capable authenticated path/service role should receive execute');
assert((sql.match(/'student_retrieval_live',true/g)||[]).length>=2,'Existing topical eligibility RPCs must now report live unified Practice retrieval');

console.log('V5.4A Question Bank Practice eligibility checks passed.');
