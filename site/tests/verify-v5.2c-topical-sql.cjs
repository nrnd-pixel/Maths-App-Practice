const fs=require('fs');
const path=require('path');
const assert=require('assert');

const foundation=fs.readFileSync(path.join(__dirname,'..','..','supabase','v52c_student_topical_practice_library.sql'),'utf8');
const hintGuard=fs.readFileSync(path.join(__dirname,'..','..','supabase','v52c_topical_hint_guard.sql'),'utf8');

assert(foundation.includes('create table if not exists public.topical_exercise_settings'),'V5.2C must use a separate set-level publication registry');
assert(foundation.includes('alter table public.topical_exercise_settings enable row level security'),'Topical publication registry must have RLS enabled');
assert(foundation.includes('revoke all on table public.topical_exercise_settings from public, anon, authenticated'),'Browser roles must not access publication rows directly');
assert(foundation.includes('add column if not exists topical_source text'),'V5.2C must bind topical identity without reusing exam metadata');
assert(foundation.includes("q.source_type = 'topical_exercise'"),'Readiness must be scoped to topical rows');
assert(foundation.includes('v_active_rows = 0'),'Publication readiness must require topical rows to remain inactive');
assert(foundation.includes("coalesce(review_status,'none') <> 'reviewed'"),'Publication readiness must require every row to be reviewed');
assert(foundation.includes('get_available_topical_exercise_sets_v52c'),'Student set listing must have a dedicated publication RPC');
assert(foundation.includes('bind_student_topical_access_v52c'),'Student Practice ticket must be bound to a topical set');
assert(foundation.includes('get_student_topical_questions_v52c'),'Topical question retrieval must be separate from ordinary Practice');
assert(foundation.includes("'active',false"),'Topical student payload must preserve inactive status rather than activating questions');
assert(foundation.includes('grade_topical_response_v52c'),'Topical grading must have a dedicated inactive-question RPC');
assert(foundation.includes('submit_topical_practice_session_v52c'),'Topical completion must have a dedicated submission RPC');
assert(!foundation.includes('create or replace function public.get_student_questions('),'V5.2C must not replace ordinary Practice retrieval');
assert(!foundation.includes('create or replace function public.grade_practice_response_v3('),'V5.2C must not replace ordinary Practice grading');
assert(!foundation.includes('create or replace function public.submit_practice_session_v3('),'V5.2C must not replace ordinary Practice submission');

assert(hintGuard.includes('request_topical_hint_v52c'),'Topical hints must use a dedicated inactive-question RPC');
assert(hintGuard.includes("s.is_available=true"),'Topical hint/grading feedback must stop if the set is unpublished');
assert(hintGuard.includes('topical_exercise_readiness_v52c'),'Topical feedback must re-check live readiness');
assert(hintGuard.includes("q.active=false"),'Topical feedback must operate on inactive reviewed rows');
assert(hintGuard.includes("coalesce(q.review_status,'none')='reviewed'"),'Topical feedback must reject unreviewed rows');
assert(!hintGuard.includes('create or replace function public.request_practice_hint_v3('),'V5.2C must not replace ordinary Practice hint logic');

console.log('V5.2C topical SQL safety checks passed.');
require('./verify-v5.2c-publication-sql-wiring.cjs');
require('./verify-v5.2c-server-contract.cjs');
require('./verify-v5.2c-no-auto-publication.cjs');
