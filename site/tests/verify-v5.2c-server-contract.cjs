const fs=require('fs');
const path=require('path');
const assert=require('assert');

const foundation=fs.readFileSync(path.join(__dirname,'..','..','supabase','v52c_student_topical_practice_library.sql'),'utf8');
const hint=fs.readFileSync(path.join(__dirname,'..','..','supabase','v52c_topical_hint_guard.sql'),'utf8');

for(const fn of ['topical_exercise_readiness_v52c','get_topical_exercise_publication_states_v52c','get_topical_exercise_readiness_v52c','save_topical_exercise_setting_v52c','get_available_topical_exercise_sets_v52c','bind_student_topical_access_v52c','get_student_topical_questions_v52c','grade_topical_response_v52c','submit_topical_practice_session_v52c']){
  assert(foundation.includes(`function public.${fn}`),`Missing V5.2C server contract: ${fn}`);
}
assert(hint.includes('function public.request_topical_hint_v52c'),'Missing dedicated topical hint RPC');
assert((foundation.match(/set search_path = ''/g)||[]).length>=9,'All V5.2C SECURITY DEFINER functions must pin search_path');
assert((hint.match(/set search_path = ''/g)||[]).length>=2,'V5.2C hint/follow-up functions must pin search_path');
assert(foundation.includes('if not public.is_teacher()'),'Teacher publication routes must require teacher identity');
assert(foundation.includes("revoke execute on function public.topical_exercise_readiness_v52c(integer,text) from public, anon, authenticated"),'Internal readiness helper must not be browser callable');
console.log('V5.2C server contract checks passed.');
