-- V5.7.1B — Student Practice Streaks + Achievement Badges
-- Read-only, token-gated motivation data derived from already saved Practice evidence.
-- No streak/badge ledger is introduced; refreshes cannot duplicate awards.
-- Exam sessions are excluded and no answer keys or grading authority are returned.

create or replace function public.get_student_gamification_achievements_v571b(p_access_token text)
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
  v_result jsonb;
begin
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
      greatest(coalesce(ps.first_try_score,0),0) as first_try_score,
      greatest(coalesce(ps.mastery_percent,0),0) as mastery_percent,
      ps.practice_mode,
      ps.exam_year,
      ps.paper,
      coalesce(ps.ended_early,false) as ended_early
    from public.practice_sessions ps
    where ps.roster_student_id = v_ticket.roster_student_id
      and ps.practice_mode <> 'exam'
      and ps.completed_at is not null
  ),
  completed_sessions as (
    select
      sr.*,
      row_number() over(order by sr.completed_at, sr.id) as session_number,
      sum(sr.total) over(order by sr.completed_at, sr.id rows between unbounded preceding and current row) as cumulative_questions
    from session_rows sr
    where not sr.ended_early
      and sr.total > 0
  ),
  assignment_rows as (
    select distinct
      coalesce(paa.completed_at, ps.completed_at, paa.updated_at) as completed_at,
      (coalesce(paa.completed_at, ps.completed_at, paa.updated_at) at time zone 'Asia/Brunei')::date as activity_date
    from public.practice_assignment_attempts paa
    left join public.practice_sessions ps on ps.id = paa.practice_session_id
    where paa.roster_student_id = v_ticket.roster_student_id
      and paa.status = 'completed'
      and coalesce(paa.completed_at, ps.completed_at, paa.updated_at) is not null
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
  ordered_desc as (
    select
      qd.activity_date,
      row_number() over(order by qd.activity_date desc) as rn
    from qualified_dates qd
    where qd.activity_date <= v_today
  ),
  latest_day as (
    select max(activity_date) as activity_date
    from qualified_dates
    where activity_date <= v_today
  ),
  current_run as (
    select
      case
        when ld.activity_date is null or ld.activity_date < v_today - 1 then 0
        else count(*) filter (
          where od.activity_date = ld.activity_date - ((od.rn - 1)::integer)
        )
      end::integer as current_streak
    from latest_day ld
    left join ordered_desc od on true
    group by ld.activity_date
  ),
  streak_grouped as (
    select
      qd.activity_date,
      qd.activity_date - (row_number() over(order by qd.activity_date))::integer as grp
    from qualified_dates qd
    where qd.activity_date <= v_today
  ),
  streak_rows as (
    select
      sg.activity_date,
      row_number() over(partition by sg.grp order by sg.activity_date)::integer as streak_length
    from streak_grouped sg
  ),
  streak_stats as (
    select
      coalesce((select current_streak from current_run),0)::integer as current_streak,
      coalesce((select max(streak_length) from streak_rows),0)::integer as longest_streak,
      coalesce((select count(*) from qualified_dates where activity_date between v_week_start and v_today),0)::integer as days_this_week,
      coalesce((select count(*) from qualified_dates where activity_date <= v_today),0)::integer as meaningful_days,
      (select activity_date from latest_day) as last_qualified_day,
      exists(select 1 from qualified_dates where activity_date = v_today) as today_qualified,
      coalesce((select questions_completed from daily_sessions where activity_date = v_today),0)::integer as today_questions,
      (select min(activity_date) from streak_rows where streak_length >= 3) as first_three_day,
      (select min(activity_date) from streak_rows where streak_length >= 7) as first_seven_day
  ),
  milestones as (
    select
      (select min(completed_at) from completed_sessions) as first_practice_at,
      (select min(completed_at) from completed_sessions where cumulative_questions >= 10) as first_ten_at,
      (select min(completed_at) from completed_sessions where session_number >= 5) as fifth_session_at,
      (select min(completed_at) from completed_sessions where total >= 5 and first_try_score >= total) as perfect_five_at,
      (select min(completed_at) from completed_sessions where total >= 5 and mastery_percent >= 90) as mastery_maker_at,
      (select min(completed_at) from completed_sessions where practice_mode = 'past_paper' or (exam_year is not null and nullif(trim(paper),'') is not null)) as first_past_paper_at
  ),
  badge_rows as (
    select 'first_practice'::text as id, 'First Practice'::text as title, 'Complete your first Practice session.'::text as description, '🌱'::text as icon, m.first_practice_at as earned_at, 1 as sort_order from milestones m
    union all
    select 'first_10','First 10','Complete 10 Practice questions.','🔟',m.first_ten_at,2 from milestones m
    union all
    select 'getting_going','Getting Going','Complete 5 Practice sessions.','🚀',m.fifth_session_at,3 from milestones m
    union all
    select 'perfect_five','Perfect Five','Complete a set of at least 5 questions with every answer correct on First Try.','⭐',m.perfect_five_at,4 from milestones m
    union all
    select 'mastery_maker','Mastery Maker','Reach at least 90% mastery in a completed Practice session.','🧠',m.mastery_maker_at,5 from milestones m
    union all
    select 'three_day_streak','3-Day Streak','Practise meaningfully on 3 consecutive days.','🔥',case when ss.first_three_day is null then null else ((ss.first_three_day::timestamp + interval '12 hours') at time zone 'Asia/Brunei') end,6 from streak_stats ss
    union all
    select 'seven_day_streak','7-Day Streak','Practise meaningfully on 7 consecutive days.','🔥',case when ss.first_seven_day is null then null else ((ss.first_seven_day::timestamp + interval '12 hours') at time zone 'Asia/Brunei') end,7 from streak_stats ss
    union all
    select 'past_paper_beginner','Past Paper Beginner','Complete your first Past Paper Practice session.','📄',m.first_past_paper_at,8 from milestones m
  ),
  badges_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',br.id,
          'title',br.title,
          'description',br.description,
          'icon',br.icon,
          'earned',br.earned_at is not null,
          'earned_at',br.earned_at
        )
        order by (br.earned_at is not null) desc, br.earned_at desc nulls last, br.sort_order
      ),
      '[]'::jsonb
    ) as badges
    from badge_rows br
  ),
  latest_badge as (
    select jsonb_build_object(
      'id',br.id,
      'title',br.title,
      'description',br.description,
      'icon',br.icon,
      'earned',true,
      'earned_at',br.earned_at
    ) as badge
    from badge_rows br
    where br.earned_at is not null
    order by br.earned_at desc, br.sort_order desc
    limit 1
  )
  select jsonb_build_object(
    'streak',jsonb_build_object(
      'current',ss.current_streak,
      'longest',ss.longest_streak,
      'days_this_week',ss.days_this_week,
      'meaningful_days',ss.meaningful_days,
      'today_qualified',ss.today_qualified,
      'today_questions',ss.today_questions,
      'last_qualified_day',ss.last_qualified_day
    ),
    'badges',bj.badges,
    'latest_badge',coalesce(lb.badge,'null'::jsonb),
    'rules',jsonb_build_object(
      'meaningful_questions_per_day',5,
      'past_paper_completes_day',true,
      'assignment_completes_day',true,
      'timezone','Asia/Brunei'
    )
  )
  into v_result
  from streak_stats ss
  cross join badges_json bj
  left join latest_badge lb on true;

  return coalesce(v_result,jsonb_build_object(
    'streak',jsonb_build_object('current',0,'longest',0,'days_this_week',0,'meaningful_days',0,'today_qualified',false,'today_questions',0,'last_qualified_day',null),
    'badges','[]'::jsonb,
    'latest_badge',null,
    'rules',jsonb_build_object('meaningful_questions_per_day',5,'past_paper_completes_day',true,'assignment_completes_day',true,'timezone','Asia/Brunei')
  ));
end;
$function$;

revoke all on function public.get_student_gamification_achievements_v571b(text) from public;
grant execute on function public.get_student_gamification_achievements_v571b(text) to anon, authenticated;
