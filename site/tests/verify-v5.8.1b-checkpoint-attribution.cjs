const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const migrationPath = path.join(repoRoot, 'supabase', 'v581b_assignment_checkpoint_attribution_hardening.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

function expect(fragment, message) {
  if (!sql.includes(fragment)) throw new Error(message || `Missing expected fragment: ${fragment}`);
}

function expectCount(fragment, expected, message) {
  const count = sql.split(fragment).length - 1;
  if (count !== expected) throw new Error(message || `Expected ${expected} occurrence(s) of ${fragment}, found ${count}.`);
}

expect('create or replace function public.start_student_practice_assignment_v56b(',
  'The assignment start/continue RPC must be replaced.');
expect("set status='in_progress',question_target=v_count,updated_at=now()",
  'Continuing an assignment must preserve the original started_at boundary.');
if (/set status='in_progress',question_target=v_count,practice_session_id=null,[\s\S]{0,160}started_at=now\(\)/.test(sql)) {
  throw new Error('V5.8.1B must not reset started_at when continuing an existing assignment.');
}

expect('create or replace function public.submit_practice_session_v3(',
  'The direct V3 Practice submission RPC must carry the attribution fix.');
expect("when p_session->>'practice_mode' in ('mixed','strand_topic','past_paper')",
  'Practice submission must accept explicit Past Paper attribution.');
expect("v_mode<>'past_paper'", 'Legacy/mixed Past Paper sessions need server-derived attribution recovery.');
expect('v_inferred_year_count=1', 'Past Paper inference must require exactly one exam year.');
expect('v_inferred_paper_count=1', 'Past Paper inference must require exactly one paper.');
expect('coalesce(v_non_past_rows,0)=0', 'Past Paper inference must reject non-past-paper evidence.');
expect("lower(trim(v_inferred_year::text || ' · ' || v_inferred_paper))",
  'Past Paper inference must match the independently stored visible paper label.');
expect("'practice_mode',v_mode", 'Submission response must expose the server-authoritative mode.');
expect("'exam_year',v_exam_year", 'Submission response must expose the server-authoritative exam year.');
expect("'paper',v_paper", 'Submission response must expose the server-authoritative paper.');

expect("pg_get_functiondef('public.submit_practice_session_v3(text,jsonb,jsonb)'::regprocedure)",
  'The active V5.3B submission RPC must be rebuilt from the corrected V3 contract.');
expect("replace(v_def,'public.submit_practice_session_v3','public.submit_practice_session_v53b')",
  'The corrected V3 submission definition must be cloned into V5.3B.');
expect("replace(v_def,'q.active','q.practice_eligible')",
  'V5.3B must retain Practice eligibility rather than reverting to active-only validation.');
expect('grant execute on function public.submit_practice_session_v53b(text,jsonb,jsonb) to anon,authenticated;',
  'The V5.3B submission RPC execute contract must remain available to student clients.');

expect('create or replace function public.clear_completed_past_paper_checkpoint_v57a()',
  'Generic Past Paper checkpoint cleanup must be replaced.');
expect('and c.assignment_id is null;',
  'Generic Past Paper session cleanup must not delete teacher-assignment checkpoints.');
expect('create or replace function public.clear_completed_assignment_checkpoint_v581b()',
  'Completed teacher assignments need an explicit checkpoint cleanup trigger function.');
expect('where c.assignment_attempt_id=new.id;',
  'Assignment checkpoint cleanup must be scoped to the exact attempt.');
expect('after insert or update of status,practice_session_id on public.practice_assignment_attempts',
  'Assignment cleanup must run only around completion/linkage transitions.');

expect('c.started_at < paa.started_at',
  'Historical repair must detect attempts whose started_at was reset after the checkpoint began.');
expect('candidate_count=1',
  'Historical repair must only auto-link one unambiguous completed session.');
expect(')>=greatest(1,paa.question_target)',
  'Historical repair must require enough logical questions for the assignment target.');
expect("where ps.practice_mode='mixed'",
  'Legacy re-attribution must be narrowly scoped to sessions currently labelled mixed.');
expect('e.year_count=1 and e.paper_count=1 and e.non_past_rows=0',
  'Legacy re-attribution must be proven by one paper and no non-Past-Paper rows.');

expectCount('create or replace function public.start_student_practice_assignment_v56b(', 1);
expectCount('create or replace function public.submit_practice_session_v3(', 1);
expectCount('create or replace function public.clear_completed_past_paper_checkpoint_v57a()', 1);
expectCount('create or replace function public.clear_completed_assignment_checkpoint_v581b()', 1);

console.log('V5.8.1B assignment checkpoint + Past Paper attribution invariants verified, including V5.3B routing.');
