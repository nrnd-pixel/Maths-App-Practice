-- Maths Practice V3.2E: Exam Settings & Teacher Controls
-- Backward compatible: existing papers default to available, untimed, and
-- answers released immediately after submission.

create table if not exists public.exam_paper_settings (
  id uuid primary key default gen_random_uuid(),
  year_level integer not null check (year_level between 1 and 13),
  exam_year integer not null check (exam_year between 2000 and 2100),
  paper text not null check (length(trim(paper)) > 0),
  duration_minutes integer null check (duration_minutes is null or duration_minutes between 1 and 600),
  answer_release_rule text not null default 'immediate'
    check (answer_release_rule in ('immediate', 'after_manual_review', 'never')),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year_level, exam_year, paper)
);

alter table public.practice_sessions
  add column if not exists exam_duration_limit_minutes integer null,
  add column if not exists answer_release_rule text not null default 'immediate';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'practice_sessions_answer_release_rule_check'
      and conrelid = 'public.practice_sessions'::regclass
  ) then
    alter table public.practice_sessions add constraint practice_sessions_answer_release_rule_check
      check (answer_release_rule in ('immediate', 'after_manual_review', 'never'));
  end if;
end $$;

insert into public.exam_paper_settings (year_level, exam_year, paper)
select distinct q.year_level, q.exam_year, trim(q.paper)
from public.questions q
where q.exam_year is not null and trim(coalesce(q.paper, '')) <> ''
on conflict (year_level, exam_year, paper) do nothing;

create or replace function public.set_exam_paper_settings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists exam_paper_settings_set_updated_at on public.exam_paper_settings;
create trigger exam_paper_settings_set_updated_at
before update on public.exam_paper_settings
for each row execute function public.set_exam_paper_settings_updated_at();

alter table public.exam_paper_settings enable row level security;
grant select on public.exam_paper_settings to anon, authenticated;
grant insert, update, delete on public.exam_paper_settings to authenticated;

drop policy if exists "public can read exam paper settings" on public.exam_paper_settings;
create policy "public can read exam paper settings"
on public.exam_paper_settings for select to anon, authenticated using (true);

drop policy if exists "teachers can insert exam paper settings" on public.exam_paper_settings;
create policy "teachers can insert exam paper settings"
on public.exam_paper_settings for insert to authenticated with check (public.is_teacher());

drop policy if exists "teachers can update exam paper settings" on public.exam_paper_settings;
create policy "teachers can update exam paper settings"
on public.exam_paper_settings for update to authenticated
using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "teachers can delete exam paper settings" on public.exam_paper_settings;
create policy "teachers can delete exam paper settings"
on public.exam_paper_settings for delete to authenticated using (public.is_teacher());

-- Keep answer keys protected in result-code retrieval, not merely hidden by the UI.
create or replace function public.get_student_review(p_result_code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with s as (
    select ps.* from public.practice_sessions ps
    where ps.result_code = upper(trim(p_result_code)) limit 1
  ), raw_a as (
    select sa.* from public.session_answers sa join s on s.id = sa.session_id
  ), summary as (
    select count(*) filter (where review_status='pending')::integer pending_count,
      coalesce(sum(marks_possible),0)::numeric marks_possible,
      coalesce(sum(coalesce(marks_awarded,0)),0)::numeric marks_awarded,
      coalesce(sum(marks_possible) filter (where review_status='pending'),0)::numeric pending_marks_possible
    from raw_a
  ), a as (
    select ra.id, ra.question_snapshot, ra.final_answer,
      case when s.practice_mode <> 'exam' or s.answer_release_rule='immediate'
        or (s.answer_release_rule='after_manual_review' and summary.pending_count=0)
        then ra.correct_answer_snapshot else null end as correct_answer_snapshot,
      ra.correct, ra.first_try, ra.attempts, ra.hint_used,
      case when s.practice_mode <> 'exam' or s.answer_release_rule='immediate'
        or (s.answer_release_rule='after_manual_review' and summary.pending_count=0)
        then ra.explanation_snapshot else null end as explanation_snapshot,
      ra.response_type, ra.response_payload, ra.review_status, ra.marks_possible,
      ra.marks_awarded, ra.teacher_comment, ra.reviewed_at, ra.created_at
    from raw_a ra cross join s cross join summary
  )
  select case when not exists(select 1 from s) then null else jsonb_build_object(
    'session', (select jsonb_build_object(
      'result_code',result_code,'student_name',student_name,'year_level',year_level,
      'class_group',class_group,'practice_mode',practice_mode,'strand',strand,'topic',topic,
      'exam_year',exam_year,'paper',paper,'first_try_score',first_try_score,
      'mastery_score',mastery_score,'auto_total',auto_total,'first_try_percent',first_try_percent,
      'mastery_percent',mastery_percent,'hints_used',hints_used,'marks_possible',marks_possible,
      'auto_marks_awarded',auto_marks_awarded,'duration_seconds',duration_seconds,
      'exam_question_count',exam_question_count,'exam_duration_limit_minutes',exam_duration_limit_minutes,
      'answer_release_rule',answer_release_rule,'completed_at',completed_at
    ) from s),
    'summary',(select to_jsonb(summary) from summary),
    'answers',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at,a.id) from a),'[]'::jsonb)
  ) end;
$$;

revoke execute on function public.get_student_review(text) from public;
grant execute on function public.get_student_review(text) to anon, authenticated;

select year_level, exam_year, paper, duration_minutes, answer_release_rule, is_available
from public.exam_paper_settings
order by year_level, exam_year desc, paper;
