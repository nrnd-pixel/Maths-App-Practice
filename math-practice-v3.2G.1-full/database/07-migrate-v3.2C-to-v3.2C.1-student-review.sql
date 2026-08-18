-- Math Practice V3.2C.1 - Student reviewed-work retrieval
-- Adds private result codes + a secure RPC that returns only the session matching a supplied code.
-- Backward-compatible. Existing sessions remain unchanged and keep result_code = NULL.
-- Safe to run more than once.

create or replace function public.make_result_code()
returns text
language sql
volatile
set search_path = ''
as $$
  with x as (
    select replace(gen_random_uuid()::text, '-', '') as v
  )
  select upper(
    substr(v,1,4) || '-' || substr(v,5,4) || '-' ||
    substr(v,9,4) || '-' || substr(v,13,4)
  )
  from x;
$$;

alter table public.practice_sessions
  add column if not exists result_code text;

alter table public.practice_sessions
  alter column result_code set default public.make_result_code();

create unique index if not exists practice_sessions_result_code_uidx
  on public.practice_sessions(result_code)
  where result_code is not null;

-- Keep pending_review_count synchronized when a manual response is inserted or reviewed.
create or replace function public.sync_session_pending_review_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
begin
  v_session_id := coalesce(new.session_id, old.session_id);
  update public.practice_sessions s
  set pending_review_count = (
    select count(*)::integer
    from public.session_answers a
    where a.session_id = v_session_id
      and a.review_status = 'pending'
  )
  where s.id = v_session_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_pending_review_count on public.session_answers;
create trigger sync_pending_review_count
after insert or update of review_status or delete on public.session_answers
for each row execute function public.sync_session_pending_review_count();

-- Student-facing lookup. The tables themselves stay protected by RLS.
-- Possession of the high-entropy result code is the authorization secret.
create or replace function public.get_student_review(p_result_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select
      ps.id, ps.result_code, ps.student_name, ps.year_level, ps.class_group,
      ps.strand, ps.topic, ps.first_try_score, ps.mastery_score,
      ps.auto_total, ps.first_try_percent, ps.mastery_percent,
      ps.hints_used, ps.completed_at
    from public.practice_sessions ps
    where ps.result_code = upper(trim(p_result_code))
    limit 1
  ),
  a as (
    select
      sa.id, sa.question_snapshot, sa.final_answer, sa.correct_answer_snapshot,
      sa.correct, sa.first_try, sa.attempts, sa.hint_used,
      sa.explanation_snapshot, sa.response_type, sa.response_payload,
      sa.review_status, sa.marks_possible, sa.marks_awarded,
      sa.teacher_comment, sa.reviewed_at, sa.created_at
    from public.session_answers sa
    join s on s.id = sa.session_id
    order by sa.created_at, sa.id
  ),
  summary as (
    select
      count(*) filter (where review_status = 'pending')::integer as pending_count,
      coalesce(sum(marks_possible),0)::numeric as marks_possible,
      coalesce(sum(coalesce(marks_awarded,0)),0)::numeric as marks_awarded,
      coalesce(sum(marks_possible) filter (where review_status='pending'),0)::numeric as pending_marks_possible
    from a
  )
  select case when not exists(select 1 from s) then null else
    jsonb_build_object(
      'session', (select jsonb_build_object(
        'result_code', result_code,
        'student_name', student_name,
        'year_level', year_level,
        'class_group', class_group,
        'strand', strand,
        'topic', topic,
        'first_try_score', first_try_score,
        'mastery_score', mastery_score,
        'auto_total', auto_total,
        'first_try_percent', first_try_percent,
        'mastery_percent', mastery_percent,
        'hints_used', hints_used,
        'completed_at', completed_at
      ) from s),
      'summary', (select to_jsonb(summary) from summary),
      'answers', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at, a.id) from a), '[]'::jsonb)
    )
  end;
$$;

-- Database functions are executable broadly by default, so explicitly scope this lookup.
revoke execute on function public.get_student_review(text) from public;
grant execute on function public.get_student_review(text) to anon, authenticated;

-- Verification
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public'
  and table_name='practice_sessions'
  and column_name='result_code';
