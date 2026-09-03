-- V5.7.2 — Student Weekly Missions
-- Read-only, token-gated weekly mission progress derived from already saved Practice evidence.
-- Missions reset each Monday in Asia/Brunei. No mission ledger or student write path is added.
-- Exam sessions are excluded and no answer keys or grading authority are returned.

create or replace function public.get_student_weekly_missions_v572(p_access_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_ticket public.student_access_tickets;
  v_today date := (now() at time zone 'Asia/Brunei')::date;
  v_week_start date := date_trunc('week', now() at time zone 'Asia/Brunei')::date;
  v_week_end date;
  v_questions integer := 0;
  v_days integer := 0;
  v_assignments integer := 0;
  v_past_papers integer := 0;
  v_challenges integer := 0;
  v_completed integer := 0;
  v_result jsonb;
begin
  v_week_end := v_week_start + 6;

  select t.*
  into v_ticket
  from public.student_access_tickets t
  where t.token_hash = extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.expires_at > now()
    and t.roster_student_id is not null
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null or v_ticket.roster_student_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  with session_rows as (
    select
      ps.id,
      ps.completed_at,
      (ps.completed_at at time zone 'Asia/Brunei')::date as activity_date,
      greatest(coalesce(ps.total,0),0) as total,
      ps.practice_mode,
      ps.exam_year,
      ps.paper,
      coalesce(ps.ended_early,false) as ended_early
    from public.practice_sessions ps
    where ps.roster_student_id = v_ticket.roster_student_id
      and ps.practice_mode <> 'exam'
      and ps.completed_at is not null
      and (ps.completed_at at time zone 'Asia/Brunei')::date between v_week_start and v_today
  ),
  assignment_rows as (
    select distinct
      paa.id,
      (coalesce(paa.completed_at, ps.completed_at, paa.updated_at) at time zone 'Asia/Brunei')::date as activity_date
    from public.practice_assignment_attempts paa
    left join public.practice_sessions ps on ps.id = paa.practice_session_id
    where paa.roster_student_id = v_ticket.roster_student_id
      and paa.status = 'completed'
      and coalesce(paa.completed_at, ps.completed_at, paa.updated_at) is not null
      and (coalesce(paa.completed_at, ps.completed_at, paa.updated_at) at time zone 'Asia/Brunei')::date between v_week_start and v_today
  ),
  daily_sessions as (
    select
      sr.activity_date,
      sum(case when not sr.ended_early then sr.total else 0 end)::integer as questions_completed,
      bool_or(
        not sr.ended_early
        and sr.total > 0
        and (
          sr.practice_mode = 'past_paper'
          or (sr.exam_year is not null and nullif(trim(sr.paper),'') is not null)
        )
      ) as past_paper_completed
    from session_rows sr
    group by sr.activity_date
  ),
  qualified_dates as (
    select ds.activity_date
    from daily_sessions ds
    where ds.questions_completed >= 5
       or ds.past_paper_completed
    union
    select ar.activity_date
    from assignment_rows ar
  ),
  aggregates as (
    select
      coalesce((select sum(case when not sr.ended_early then sr.total else 0 end) from session_rows sr),0)::integer as questions_completed,
      coalesce((select count(*) from qualified_dates),0)::integer as practice_days,
      coalesce((select count(*) from assignment_rows),0)::integer as assignments_completed,
      coalesce((select count(*) from session_rows sr where not sr.ended_early and sr.total > 0 and (sr.practice_mode='past_paper' or (sr.exam_year is not null and nullif(trim(sr.paper),'') is not null))),0)::integer as past_papers_completed
  )
  select
    questions_completed,
    practice_days,
    assignments_completed,
    past_papers_completed
  into v_questions, v_days, v_assignments, v_past_papers
  from aggregates;

  v_challenges := v_assignments + v_past_papers;
  v_completed :=
      case when v_questions >= 10 then 1 else 0 end
    + case when v_days >= 2 then 1 else 0 end
    + case when v_challenges >= 1 then 1 else 0 end;

  v_result := jsonb_build_object(
    'week',jsonb_build_object(
      'start_date',v_week_start,
      'end_date',v_week_end,
      'today',v_today,
      'timezone','Asia/Brunei'
    ),
    'summary',jsonb_build_object(
      'completed',v_completed,
      'total',3,
      'all_complete',v_completed = 3
    ),
    'missions',jsonb_build_array(
      jsonb_build_object(
        'id','question_quest',
        'title','Question Quest',
        'description','Complete 10 Practice questions this week.',
        'icon','🎯',
        'progress',least(v_questions,10),
        'raw_progress',v_questions,
        'target',10,
        'unit','questions',
        'complete',v_questions >= 10,
        'action','learn'
      ),
      jsonb_build_object(
        'id','practice_days',
        'title','Keep It Going',
        'description','Complete meaningful Practice on 2 different days this week.',
        'icon','🔥',
        'progress',least(v_days,2),
        'raw_progress',v_days,
        'target',2,
        'unit','days',
        'complete',v_days >= 2,
        'action','learn'
      ),
      jsonb_build_object(
        'id','challenge_complete',
        'title','Challenge Complete',
        'description','Finish a teacher assignment or a Past Paper Practice this week.',
        'icon','🏁',
        'progress',least(v_challenges,1),
        'raw_progress',v_challenges,
        'target',1,
        'unit','challenge',
        'complete',v_challenges >= 1,
        'action','challenge',
        'assignment_completions',v_assignments,
        'past_paper_completions',v_past_papers
      )
    ),
    'rules',jsonb_build_object(
      'question_target',10,
      'practice_day_target',2,
      'meaningful_questions_per_day',5,
      'challenge_target',1,
      'week_starts','Monday',
      'timezone','Asia/Brunei',
      'exam_activity_counts',false
    )
  );

  return v_result;
end;
$function$;

revoke all on function public.get_student_weekly_missions_v572(text) from public;
grant execute on function public.get_student_weekly_missions_v572(text) to anon, authenticated;
