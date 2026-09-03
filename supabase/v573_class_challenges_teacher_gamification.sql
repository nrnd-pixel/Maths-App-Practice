-- V5.7.3 — Cooperative Class Challenge + Teacher Gamification View
-- Read-only gamification reporting layered on V5.7.1A/B and V5.7.2.
-- Students only receive aggregate class challenge progress. Teachers receive a
-- class roster motivation view. No leaderboard, challenge ledger or gamification
-- write path is introduced. Exam activity is excluded throughout.

create or replace function public.get_student_class_challenge_v573(p_access_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $function$
declare
  v_ticket public.student_access_tickets;
  v_class_id uuid;
  v_class_name text;
  v_year_level integer;
  v_today date := (now() at time zone 'Asia/Brunei')::date;
  v_week_start date := date_trunc('week', now() at time zone 'Asia/Brunei')::date;
  v_week_end date;
  v_active_students integer := 0;
  v_questions integer := 0;
  v_contributors integer := 0;
  v_target integer := 10;
  v_percent integer := 0;
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

  select cs.class_id, sc.name, sc.year_level
  into v_class_id, v_class_name, v_year_level
  from public.class_students cs
  join public.school_classes sc on sc.id=cs.class_id
  where cs.id=v_ticket.roster_student_id
    and cs.active=true
    and sc.active=true
  limit 1;

  if v_class_id is null then raise exception 'Active class could not be verified'; end if;

  select count(*)::integer
  into v_active_students
  from public.class_students cs
  where cs.class_id=v_class_id and cs.active=true;

  with student_week as (
    select
      cs.id roster_student_id,
      coalesce(sum(
        case when ps.id is not null and not coalesce(ps.ended_early,false)
          then greatest(coalesce(ps.total,0),0) else 0 end
      ),0)::integer as questions
    from public.class_students cs
    left join public.practice_sessions ps
      on ps.roster_student_id=cs.id
     and ps.practice_mode <> 'exam'
     and ps.completed_at is not null
     and (ps.completed_at at time zone 'Asia/Brunei')::date between v_week_start and v_today
    where cs.class_id=v_class_id and cs.active=true
    group by cs.id
  )
  select coalesce(sum(sw.questions),0)::integer,
         count(*) filter (where sw.questions>0)::integer
  into v_questions, v_contributors
  from student_week sw;

  v_target := greatest(10,coalesce(v_active_students,0)*10);
  v_percent := least(100,greatest(0,round(100.0*coalesce(v_questions,0)/greatest(1,v_target))::integer));

  return jsonb_build_object(
    'class',jsonb_build_object(
      'class_id',v_class_id,
      'class_name',v_class_name,
      'year_level',v_year_level,
      'active_students',v_active_students
    ),
    'week',jsonb_build_object(
      'start_date',v_week_start,
      'end_date',v_week_end,
      'today',v_today,
      'timezone','Asia/Brunei'
    ),
    'challenge',jsonb_build_object(
      'title','Class Question Quest',
      'description','Work together to complete 10 Practice questions for every active class member this week.',
      'questions_completed',v_questions,
      'target_questions',v_target,
      'contributors',v_contributors,
      'progress_percent',v_percent,
      'complete',v_questions>=v_target
    ),
    'rules',jsonb_build_object(
      'questions_per_active_student',10,
      'week_starts','Monday',
      'timezone','Asia/Brunei',
      'exam_activity_counts',false,
      'student_rankings',false
    )
  );
end;
$function$;

create or replace function public.get_teacher_class_gamification_v573(p_class_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $function$
declare
  v_class public.school_classes;
  v_today date := (now() at time zone 'Asia/Brunei')::date;
  v_week_start date := date_trunc('week', now() at time zone 'Asia/Brunei')::date;
  v_week_end date;
  v_result jsonb;
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;

  select sc.* into v_class
  from public.school_classes sc
  where sc.id=p_class_id and sc.active=true
  limit 1;

  if v_class.id is null then raise exception 'Choose a valid active class'; end if;
  v_week_end := v_week_start + 6;

  with students as (
    select cs.id roster_student_id, cs.student_id, cs.student_name
    from public.class_students cs
    where cs.class_id=v_class.id and cs.active=true
  ),
  answer_totals as (
    select ps.roster_student_id,
      count(*) filter (where sa.correct and sa.first_try)::integer first_try_correct,
      count(*) filter (where sa.correct and not sa.first_try)::integer second_try_correct
    from public.session_answers sa
    join public.practice_sessions ps on ps.id=sa.session_id
    join students s on s.roster_student_id=ps.roster_student_id
    where ps.practice_mode <> 'exam'
    group by ps.roster_student_id
  ),
  session_totals as (
    select ps.roster_student_id,
      count(*) filter (where not coalesce(ps.ended_early,false) and greatest(coalesce(ps.total,0),0)>0)::integer completed_sessions,
      count(*) filter (
        where not coalesce(ps.ended_early,false)
          and greatest(coalesce(ps.total,0),0)>0
          and (ps.practice_mode='past_paper' or (ps.exam_year is not null and nullif(trim(ps.paper),'') is not null))
      )::integer completed_past_papers
    from public.practice_sessions ps
    join students s on s.roster_student_id=ps.roster_student_id
    where ps.practice_mode <> 'exam'
    group by ps.roster_student_id
  ),
  assignment_totals as (
    select paa.roster_student_id,
      count(*) filter (where paa.status='completed')::integer completed_assignments
    from public.practice_assignment_attempts paa
    join students s on s.roster_student_id=paa.roster_student_id
    group by paa.roster_student_id
  ),
  weekly_sessions as (
    select ps.roster_student_id, ps.id,
      (ps.completed_at at time zone 'Asia/Brunei')::date activity_date,
      greatest(coalesce(ps.total,0),0)::integer total,
      ps.practice_mode, ps.exam_year, ps.paper,
      coalesce(ps.ended_early,false) ended_early
    from public.practice_sessions ps
    join students s on s.roster_student_id=ps.roster_student_id
    where ps.practice_mode <> 'exam'
      and ps.completed_at is not null
      and (ps.completed_at at time zone 'Asia/Brunei')::date between v_week_start and v_today
  ),
  weekly_assignments as (
    select distinct paa.id, paa.roster_student_id,
      (coalesce(paa.completed_at,ps.completed_at,paa.updated_at) at time zone 'Asia/Brunei')::date activity_date
    from public.practice_assignment_attempts paa
    join students s on s.roster_student_id=paa.roster_student_id
    left join public.practice_sessions ps on ps.id=paa.practice_session_id
    where paa.status='completed'
      and coalesce(paa.completed_at,ps.completed_at,paa.updated_at) is not null
      and (coalesce(paa.completed_at,ps.completed_at,paa.updated_at) at time zone 'Asia/Brunei')::date between v_week_start and v_today
  ),
  weekly_daily as (
    select ws.roster_student_id, ws.activity_date,
      sum(case when not ws.ended_early then ws.total else 0 end)::integer questions,
      bool_or(
        not ws.ended_early and ws.total>0
        and (ws.practice_mode='past_paper' or (ws.exam_year is not null and nullif(trim(ws.paper),'') is not null))
      ) past_paper_completed
    from weekly_sessions ws
    group by ws.roster_student_id,ws.activity_date
  ),
  weekly_qualified as (
    select wd.roster_student_id,wd.activity_date
    from weekly_daily wd
    where wd.questions>=5 or wd.past_paper_completed
    union
    select wa.roster_student_id,wa.activity_date from weekly_assignments wa
  ),
  weekly_metrics as (
    select s.roster_student_id,
      coalesce((select sum(wd.questions) from weekly_daily wd where wd.roster_student_id=s.roster_student_id),0)::integer weekly_questions,
      coalesce((select count(*) from weekly_qualified wq where wq.roster_student_id=s.roster_student_id),0)::integer weekly_practice_days,
      coalesce((select count(*) from weekly_assignments wa where wa.roster_student_id=s.roster_student_id),0)::integer weekly_assignments,
      coalesce((select count(*) from weekly_sessions ws where ws.roster_student_id=s.roster_student_id and not ws.ended_early and ws.total>0 and (ws.practice_mode='past_paper' or (ws.exam_year is not null and nullif(trim(ws.paper),'') is not null))),0)::integer weekly_past_papers
    from students s
  ),
  history_sessions as (
    select ps.roster_student_id,
      (ps.completed_at at time zone 'Asia/Brunei')::date activity_date,
      greatest(coalesce(ps.total,0),0)::integer total,
      ps.practice_mode,ps.exam_year,ps.paper,
      coalesce(ps.ended_early,false) ended_early
    from public.practice_sessions ps
    join students s on s.roster_student_id=ps.roster_student_id
    where ps.practice_mode <> 'exam' and ps.completed_at is not null
  ),
  history_assignments as (
    select distinct paa.roster_student_id,
      (coalesce(paa.completed_at,ps.completed_at,paa.updated_at) at time zone 'Asia/Brunei')::date activity_date
    from public.practice_assignment_attempts paa
    join students s on s.roster_student_id=paa.roster_student_id
    left join public.practice_sessions ps on ps.id=paa.practice_session_id
    where paa.status='completed' and coalesce(paa.completed_at,ps.completed_at,paa.updated_at) is not null
  ),
  history_daily as (
    select hs.roster_student_id,hs.activity_date,
      sum(case when not hs.ended_early then hs.total else 0 end)::integer questions,
      bool_or(not hs.ended_early and hs.total>0 and (hs.practice_mode='past_paper' or (hs.exam_year is not null and nullif(trim(hs.paper),'') is not null))) past_paper_completed
    from history_sessions hs
    group by hs.roster_student_id,hs.activity_date
  ),
  history_qualified as (
    select hd.roster_student_id,hd.activity_date
    from history_daily hd
    where hd.questions>=5 or hd.past_paper_completed
    union
    select ha.roster_student_id,ha.activity_date from history_assignments ha
  ),
  streak_numbered as (
    select hq.roster_student_id,hq.activity_date,
      hq.activity_date-(row_number() over(partition by hq.roster_student_id order by hq.activity_date))::integer grp
    from history_qualified hq
    where hq.activity_date<=v_today
  ),
  streak_groups as (
    select sn.roster_student_id,sn.grp,count(*)::integer streak_length,max(sn.activity_date) end_date
    from streak_numbered sn
    group by sn.roster_student_id,sn.grp
  ),
  latest_dates as (
    select hq.roster_student_id,max(hq.activity_date) latest_date
    from history_qualified hq
    where hq.activity_date<=v_today
    group by hq.roster_student_id
  ),
  current_streaks as (
    select s.roster_student_id,
      case when ld.latest_date is null or ld.latest_date<v_today-1 then 0
        else coalesce(max(sg.streak_length) filter (where sg.end_date=ld.latest_date),0) end::integer current_streak
    from students s
    left join latest_dates ld on ld.roster_student_id=s.roster_student_id
    left join streak_groups sg on sg.roster_student_id=s.roster_student_id
    group by s.roster_student_id,ld.latest_date
  ),
  student_rows as (
    select s.roster_student_id,s.student_id,s.student_name,
      ((coalesce(at.first_try_correct,0)*10)+(coalesce(at.second_try_correct,0)*6)+(coalesce(st.completed_sessions,0)*10)+(coalesce(st.completed_past_papers,0)*20)+(coalesce(ast.completed_assignments,0)*20))::integer xp_total,
      coalesce(cs.current_streak,0)::integer current_streak,
      wm.weekly_questions,wm.weekly_practice_days,
      (wm.weekly_assignments+wm.weekly_past_papers)::integer weekly_challenges,
      (case when wm.weekly_questions>=10 then 1 else 0 end
       +case when wm.weekly_practice_days>=2 then 1 else 0 end
       +case when (wm.weekly_assignments+wm.weekly_past_papers)>=1 then 1 else 0 end)::integer missions_completed
    from students s
    left join answer_totals at on at.roster_student_id=s.roster_student_id
    left join session_totals st on st.roster_student_id=s.roster_student_id
    left join assignment_totals ast on ast.roster_student_id=s.roster_student_id
    left join weekly_metrics wm on wm.roster_student_id=s.roster_student_id
    left join current_streaks cs on cs.roster_student_id=s.roster_student_id
  ),
  labelled as (
    select sr.*,
      case when sr.xp_total>=900 then 5 when sr.xp_total>=500 then 4 when sr.xp_total>=250 then 3 when sr.xp_total>=100 then 2 else 1 end::integer level_number,
      case when sr.xp_total>=900 then 'Maths Master' when sr.xp_total>=500 then 'Maths Challenger' when sr.xp_total>=250 then 'Problem Solver' when sr.xp_total>=100 then 'Number Explorer' else 'Maths Starter' end level_title
    from student_rows sr
  ),
  summary as (
    select
      count(*)::integer active_students,
      count(*) filter (where l.weekly_questions>0 or l.weekly_challenges>0)::integer active_this_week,
      coalesce(sum(l.weekly_questions),0)::integer questions_completed,
      count(*) filter (where l.weekly_questions>0)::integer challenge_contributors,
      count(*) filter (where l.missions_completed=3)::integer all_missions_complete,
      count(*) filter (where l.current_streak>0)::integer active_streaks,
      coalesce(round(avg(l.xp_total)),0)::integer average_xp,
      count(*) filter (where l.level_number=1)::integer level_1,
      count(*) filter (where l.level_number=2)::integer level_2,
      count(*) filter (where l.level_number=3)::integer level_3,
      count(*) filter (where l.level_number=4)::integer level_4,
      count(*) filter (where l.level_number=5)::integer level_5
    from labelled l
  )
  select jsonb_build_object(
    'class',jsonb_build_object('class_id',v_class.id,'class_name',v_class.name,'year_level',v_class.year_level),
    'week',jsonb_build_object('start_date',v_week_start,'end_date',v_week_end,'today',v_today,'timezone','Asia/Brunei'),
    'challenge',jsonb_build_object(
      'title','Class Question Quest',
      'questions_completed',sm.questions_completed,
      'target_questions',greatest(10,sm.active_students*10),
      'contributors',sm.challenge_contributors,
      'active_students',sm.active_students,
      'progress_percent',least(100,greatest(0,round(100.0*sm.questions_completed/greatest(1,greatest(10,sm.active_students*10)))::integer)),
      'complete',sm.questions_completed>=greatest(10,sm.active_students*10)
    ),
    'summary',jsonb_build_object(
      'active_students',sm.active_students,
      'active_this_week',sm.active_this_week,
      'all_missions_complete',sm.all_missions_complete,
      'active_streaks',sm.active_streaks,
      'average_xp',sm.average_xp,
      'level_distribution',jsonb_build_object('1',sm.level_1,'2',sm.level_2,'3',sm.level_3,'4',sm.level_4,'5',sm.level_5)
    ),
    'students',coalesce((select jsonb_agg(jsonb_build_object(
      'roster_student_id',l.roster_student_id,
      'student_id',l.student_id,
      'student_name',l.student_name,
      'xp_total',l.xp_total,
      'level_number',l.level_number,
      'level_title',l.level_title,
      'current_streak',l.current_streak,
      'weekly_questions',l.weekly_questions,
      'weekly_practice_days',l.weekly_practice_days,
      'weekly_challenges',l.weekly_challenges,
      'missions_completed',l.missions_completed,
      'all_missions_complete',l.missions_completed=3
    ) order by l.student_name,l.student_id) from labelled l),'[]'::jsonb),
    'rules',jsonb_build_object(
      'questions_per_active_student',10,
      'question_mission_target',10,
      'practice_day_mission_target',2,
      'challenge_mission_target',1,
      'meaningful_questions_per_day',5,
      'week_starts','Monday',
      'timezone','Asia/Brunei',
      'exam_activity_counts',false,
      'student_rankings',false
    )
  ) into v_result
  from summary sm;

  return v_result;
end;
$function$;

revoke all on function public.get_student_class_challenge_v573(text) from public;
grant execute on function public.get_student_class_challenge_v573(text) to anon, authenticated;

revoke all on function public.get_teacher_class_gamification_v573(uuid) from public,anon;
grant execute on function public.get_teacher_class_gamification_v573(uuid) to authenticated,service_role;
