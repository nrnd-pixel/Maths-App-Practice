-- Math Practice V3.2D - Practice + Exam Mode
-- Backward-compatible. Safe to run more than once.
-- Adds exam metadata to practice_sessions and extends the private student-review RPC.

alter table public.practice_sessions
  add column if not exists exam_year smallint,
  add column if not exists paper text,
  add column if not exists marks_possible numeric(8,2) not null default 0,
  add column if not exists auto_marks_awarded numeric(8,2) not null default 0,
  add column if not exists duration_seconds integer not null default 0,
  add column if not exists exam_question_count integer not null default 0;

create index if not exists practice_sessions_exam_idx
  on public.practice_sessions(practice_mode, exam_year, paper, completed_at desc);

-- Student-facing result lookup. The result code remains the authorization secret.
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
      ps.practice_mode, ps.strand, ps.topic, ps.exam_year, ps.paper,
      ps.first_try_score, ps.mastery_score, ps.auto_total,
      ps.first_try_percent, ps.mastery_percent, ps.hints_used,
      ps.marks_possible, ps.auto_marks_awarded, ps.duration_seconds,
      ps.exam_question_count, ps.completed_at
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
        'practice_mode', practice_mode,
        'strand', strand,
        'topic', topic,
        'exam_year', exam_year,
        'paper', paper,
        'first_try_score', first_try_score,
        'mastery_score', mastery_score,
        'auto_total', auto_total,
        'first_try_percent', first_try_percent,
        'mastery_percent', mastery_percent,
        'hints_used', hints_used,
        'marks_possible', marks_possible,
        'auto_marks_awarded', auto_marks_awarded,
        'duration_seconds', duration_seconds,
        'exam_question_count', exam_question_count,
        'completed_at', completed_at
      ) from s),
      'summary', (select to_jsonb(summary) from summary),
      'answers', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at, a.id) from a), '[]'::jsonb)
    )
  end;
$$;

revoke execute on function public.get_student_review(text) from public;
grant execute on function public.get_student_review(text) to anon, authenticated;

-- Verification
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public'
  and table_name='practice_sessions'
  and column_name in ('exam_year','paper','marks_possible','auto_marks_awarded','duration_seconds','exam_question_count')
order by column_name;
