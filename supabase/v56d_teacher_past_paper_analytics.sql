-- V5.6D — Teacher Past Paper Analytics
-- Read-only teacher analytics for Practice-mode past papers.
-- Uses current Practice eligibility for coverage denominators and never exposes answer keys.

create or replace function public.get_teacher_past_paper_analytics_v56d(
  p_class_id uuid,
  p_exam_year smallint default null,
  p_paper text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_class public.school_classes;
  v_papers jsonb := '[]'::jsonb;
  v_available integer := 0;
  v_students jsonb := '[]'::jsonb;
  v_questions jsonb := '[]'::jsonb;
  v_topics jsonb := '[]'::jsonb;
  v_summary jsonb := '{}'::jsonb;
begin
  if not exists (
    select 1 from public.teacher_profiles tp
    where tp.user_id = auth.uid()
  ) then
    raise exception 'Teacher access is required';
  end if;

  select sc.* into v_class
  from public.school_classes sc
  where sc.id = p_class_id;

  if v_class.id is null then
    raise exception 'Class could not be found';
  end if;

  with paper_rows as (
    select
      q.exam_year,
      min(trim(q.paper)) as paper,
      count(distinct public.practice_logical_item_key_v53d1(
        q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source
      ))::integer as available_questions
    from public.questions q
    where q.practice_eligible=true
      and q.year_level=v_class.year_level
      and lower(trim(coalesce(q.source_type,'')))='past_paper'
      and q.exam_year is not null
      and nullif(trim(coalesce(q.paper,'')),'') is not null
    group by q.exam_year,lower(trim(q.paper))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'exam_year',exam_year,
    'paper',paper,
    'available_questions',available_questions
  ) order by exam_year desc,paper asc),'[]'::jsonb)
  into v_papers
  from paper_rows;

  if p_exam_year is null or nullif(trim(coalesce(p_paper,'')),'') is null then
    return jsonb_build_object(
      'class',jsonb_build_object('class_id',v_class.id,'class_name',v_class.name,'year_level',v_class.year_level),
      'papers',v_papers,
      'selected',null,
      'summary',jsonb_build_object(),
      'students','[]'::jsonb,
      'questions','[]'::jsonb,
      'topics','[]'::jsonb
    );
  end if;

  select count(distinct public.practice_logical_item_key_v53d1(
    q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source
  ))::integer
  into v_available
  from public.questions q
  where q.practice_eligible=true
    and q.year_level=v_class.year_level
    and lower(trim(coalesce(q.source_type,'')))='past_paper'
    and q.exam_year=p_exam_year
    and lower(trim(coalesce(q.paper,'')))=lower(trim(p_paper));

  if coalesce(v_available,0)=0 then
    raise exception 'The selected Past Paper is not currently available for Practice';
  end if;

  with roster as (
    select cs.id as roster_student_id,cs.student_name,cs.student_id
    from public.class_students cs
    where cs.class_id=v_class.id and cs.active=true
  ),
  relevant_sessions as (
    select ps.*
    from public.practice_sessions ps
    join roster r on r.roster_student_id=ps.roster_student_id
    where ps.class_id=v_class.id
      and ps.practice_mode='past_paper'
      and ps.exam_year=p_exam_year
      and lower(trim(coalesce(ps.paper,'')))=lower(trim(p_paper))
  ),
  session_stats as (
    select roster_student_id,
      count(*)::integer as session_count,
      max(completed_at) as last_practised_at
    from relevant_sessions
    group by roster_student_id
  ),
  latest as (
    select distinct on (roster_student_id)
      roster_student_id,id as session_id,first_try_percent,mastery_percent,
      total as session_questions,ended_early,completed_at,result_code
    from relevant_sessions
    order by roster_student_id,completed_at desc,id desc
  ),
  coverage as (
    select ps.roster_student_id,
      count(distinct public.practice_logical_item_key_v53d1(
        q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source
      ))::integer as questions_practised
    from relevant_sessions ps
    join public.session_answers sa on sa.session_id=ps.id
    join public.questions q on q.id=sa.question_id
    where q.practice_eligible=true
      and q.year_level=v_class.year_level
      and lower(trim(coalesce(q.source_type,'')))='past_paper'
      and q.exam_year=p_exam_year
      and lower(trim(coalesce(q.paper,'')))=lower(trim(p_paper))
    group by ps.roster_student_id
  ),
  student_rows as (
    select
      r.roster_student_id,r.student_name,r.student_id,
      least(v_available,coalesce(c.questions_practised,0))::integer as questions_practised,
      coalesce(ss.session_count,0)::integer as session_count,
      ss.last_practised_at,
      l.session_id,l.first_try_percent,l.mastery_percent,l.session_questions,l.ended_early,l.completed_at,l.result_code,
      a.assignment_id,a.assignment_status,a.assignment_selection_mode,a.assignment_question_target,a.assignment_due_at,
      case
        when least(v_available,coalesce(c.questions_practised,0))>=v_available then 'completed'
        when coalesce(c.questions_practised,0)>0 or coalesce(ss.session_count,0)>0 or a.assignment_status='in_progress' then 'in_progress'
        else 'not_started'
      end as progress_status,
      case
        when a.assignment_id is not null and coalesce(ss.session_count,0)>1 and a.assignment_status in ('in_progress','completed') then 'teacher_assigned_plus_self'
        when a.assignment_id is not null and a.assignment_status in ('in_progress','completed') then 'teacher_assigned'
        when coalesce(ss.session_count,0)>0 then 'self_selected'
        when a.assignment_id is not null then 'teacher_assigned_pending'
        else 'none'
      end as practice_source
    from roster r
    left join session_stats ss using(roster_student_id)
    left join coverage c using(roster_student_id)
    left join latest l using(roster_student_id)
    left join lateral (
      select
        pa.id as assignment_id,
        coalesce(att.status,'not_started') as assignment_status,
        pa.selection_mode as assignment_selection_mode,
        case when pa.selection_mode='all_available' then v_available else least(pa.question_count,v_available) end::integer as assignment_question_target,
        pa.closes_at as assignment_due_at
      from public.practice_assignments pa
      left join public.practice_assignment_attempts att
        on att.assignment_id=pa.id and att.roster_student_id=r.roster_student_id
      where pa.class_id=v_class.id
        and pa.active=true
        and pa.assignment_type='past_paper'
        and pa.exam_year=p_exam_year
        and lower(trim(coalesce(pa.paper,'')))=lower(trim(p_paper))
        and (
          not exists(select 1 from public.practice_assignment_recipients pr where pr.assignment_id=pa.id)
          or exists(select 1 from public.practice_assignment_recipients pr where pr.assignment_id=pa.id and pr.roster_student_id=r.roster_student_id)
        )
      order by
        case when att.status='in_progress' then 0 when att.status='completed' then 1 when att.id is null then 2 else 3 end,
        pa.created_at desc,pa.id desc
      limit 1
    ) a on true
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'roster_student_id',roster_student_id,
      'student_name',student_name,
      'student_id',student_id,
      'questions_practised',questions_practised,
      'available_questions',v_available,
      'progress_status',progress_status,
      'session_count',session_count,
      'last_practised_at',last_practised_at,
      'practice_source',practice_source,
      'latest_session',case when session_id is null then null else jsonb_build_object(
        'session_id',session_id,
        'first_try_percent',first_try_percent,
        'mastery_percent',mastery_percent,
        'question_count',session_questions,
        'ended_early',ended_early,
        'completed_at',completed_at,
        'result_code',result_code
      ) end,
      'teacher_assignment',case when assignment_id is null then null else jsonb_build_object(
        'assignment_id',assignment_id,
        'status',assignment_status,
        'selection_mode',assignment_selection_mode,
        'question_target',assignment_question_target,
        'due_at',assignment_due_at
      ) end
    ) order by student_name,student_id),'[]'::jsonb),
    jsonb_build_object(
      'total_students',count(*),
      'attempted_students',count(*) filter(where session_count>0),
      'completed_students',count(*) filter(where progress_status='completed'),
      'in_progress_students',count(*) filter(where progress_status='in_progress'),
      'not_started_students',count(*) filter(where progress_status='not_started'),
      'completion_percent',case when count(*)=0 then 0 else round(100.0*count(*) filter(where progress_status='completed')/count(*))::integer end,
      'average_first_try_percent',round(avg(first_try_percent) filter(where session_id is not null))::integer,
      'average_mastery_percent',round(avg(mastery_percent) filter(where session_id is not null))::integer,
      'teacher_assigned_students',count(*) filter(where assignment_id is not null),
      'self_selected_students',count(*) filter(where session_count>0 and assignment_id is null)
    )
  into v_students,v_summary
  from student_rows;

  with qbase as (
    select
      public.practice_logical_item_key_v53d1(q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source) as logical_key,
      coalesce(nullif(trim(q.parent_question_number),''),trim(q.question_number),'?') as question_label,
      min(coalesce(nullif(regexp_replace(coalesce(nullif(trim(q.parent_question_number),''),trim(q.question_number),'999999'),'[^0-9].*$','','g'),''),'999999')::integer) as sort_order,
      string_agg(distinct nullif(trim(q.topic),''),' / ' order by nullif(trim(q.topic),'')) filter(where nullif(trim(q.topic),'') is not null) as topics,
      string_agg(distinct nullif(trim(q.skill),''),' / ' order by nullif(trim(q.skill),'')) filter(where nullif(trim(q.skill),'') is not null) as skills
    from public.questions q
    where q.practice_eligible=true
      and q.year_level=v_class.year_level
      and lower(trim(coalesce(q.source_type,'')))='past_paper'
      and q.exam_year=p_exam_year
      and lower(trim(coalesce(q.paper,'')))=lower(trim(p_paper))
    group by logical_key,coalesce(nullif(trim(q.parent_question_number),''),trim(q.question_number),'?')
  ),
  logical_attempts as (
    select
      ps.id as session_id,ps.roster_student_id,
      public.practice_logical_item_key_v53d1(q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source) as logical_key,
      bool_and(coalesce(sa.first_try,false)) as first_try_ok,
      bool_and(coalesce(sa.correct,false)) as mastery_ok,
      bool_or(coalesce(sa.hint_used,false)) as hint_used
    from public.practice_sessions ps
    join public.class_students cs on cs.id=ps.roster_student_id and cs.class_id=v_class.id and cs.active=true
    join public.session_answers sa on sa.session_id=ps.id
    join public.questions q on q.id=sa.question_id
    where ps.class_id=v_class.id
      and ps.practice_mode='past_paper'
      and ps.exam_year=p_exam_year
      and lower(trim(coalesce(ps.paper,'')))=lower(trim(p_paper))
      and q.practice_eligible=true
      and q.year_level=v_class.year_level
      and lower(trim(coalesce(q.source_type,'')))='past_paper'
      and q.exam_year=p_exam_year
      and lower(trim(coalesce(q.paper,'')))=lower(trim(p_paper))
    group by ps.id,ps.roster_student_id,logical_key
  ),
  qagg as (
    select logical_key,
      count(*)::integer as attempts,
      count(distinct roster_student_id)::integer as students,
      round(100.0*count(*) filter(where first_try_ok)/nullif(count(*),0))::integer as first_try_percent,
      round(100.0*count(*) filter(where mastery_ok)/nullif(count(*),0))::integer as mastery_percent,
      round(100.0*count(*) filter(where hint_used)/nullif(count(*),0))::integer as hint_percent
    from logical_attempts
    group by logical_key
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'logical_key',qb.logical_key,
    'question_number',qb.question_label,
    'topic',coalesce(qb.topics,'Other'),
    'skill',coalesce(qb.skills,'Unclassified'),
    'attempts',coalesce(qa.attempts,0),
    'students',coalesce(qa.students,0),
    'first_try_percent',qa.first_try_percent,
    'mastery_percent',qa.mastery_percent,
    'hint_percent',qa.hint_percent
  ) order by qb.sort_order,qb.question_label),'[]'::jsonb)
  into v_questions
  from qbase qb
  left join qagg qa using(logical_key);

  with answer_rows as (
    select
      coalesce(nullif(trim(sa.topic),''),'Other') as topic,
      coalesce(nullif(trim(sa.skill),''),'Unclassified') as skill,
      ps.roster_student_id,
      sa.first_try,sa.correct,sa.hint_used
    from public.practice_sessions ps
    join public.class_students cs on cs.id=ps.roster_student_id and cs.class_id=v_class.id and cs.active=true
    join public.session_answers sa on sa.session_id=ps.id
    join public.questions q on q.id=sa.question_id
    where ps.class_id=v_class.id
      and ps.practice_mode='past_paper'
      and ps.exam_year=p_exam_year
      and lower(trim(coalesce(ps.paper,'')))=lower(trim(p_paper))
      and q.practice_eligible=true
      and q.year_level=v_class.year_level
      and lower(trim(coalesce(q.source_type,'')))='past_paper'
      and q.exam_year=p_exam_year
      and lower(trim(coalesce(q.paper,'')))=lower(trim(p_paper))
  ),
  tagg as (
    select topic,skill,
      count(*)::integer as attempts,
      count(distinct roster_student_id)::integer as students,
      round(100.0*count(*) filter(where first_try is true)/nullif(count(*),0))::integer as first_try_percent,
      round(100.0*count(*) filter(where correct is true)/nullif(count(*),0))::integer as mastery_percent,
      round(100.0*count(*) filter(where hint_used is true)/nullif(count(*),0))::integer as hint_percent
    from answer_rows
    group by topic,skill
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'topic',topic,'skill',skill,'attempts',attempts,'students',students,
    'first_try_percent',first_try_percent,'mastery_percent',mastery_percent,'hint_percent',hint_percent
  ) order by first_try_percent asc nulls last,mastery_percent asc nulls last,topic,skill),'[]'::jsonb)
  into v_topics
  from tagg;

  return jsonb_build_object(
    'class',jsonb_build_object('class_id',v_class.id,'class_name',v_class.name,'year_level',v_class.year_level),
    'papers',v_papers,
    'selected',jsonb_build_object('exam_year',p_exam_year,'paper',trim(p_paper),'available_questions',v_available),
    'summary',coalesce(v_summary,'{}'::jsonb),
    'students',coalesce(v_students,'[]'::jsonb),
    'questions',coalesce(v_questions,'[]'::jsonb),
    'topics',coalesce(v_topics,'[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_teacher_past_paper_analytics_v56d(uuid,smallint,text) from public;
grant execute on function public.get_teacher_past_paper_analytics_v56d(uuid,smallint,text) to authenticated,service_role;
