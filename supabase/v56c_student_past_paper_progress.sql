-- V5.6C — Student Past Paper Progress
-- Read-only, token-gated paper-level progress for the student My Progress dashboard.
-- Uses current Practice eligibility for the paper denominator and preserves existing
-- V5.5/V5.6 assignment, grading and Exam workflows.

create or replace function public.get_student_past_paper_progress_v56c(p_access_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_ticket public.student_access_tickets;
  v_papers jsonb;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose='practice'
    and t.expires_at>now()
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null
     or v_ticket.roster_student_id is null
     or v_ticket.class_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  with available as (
    select
      q.exam_year,
      min(trim(q.paper)) as paper,
      count(distinct public.practice_logical_item_key_v53d1(
        q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source
      ))::integer as available_questions
    from public.questions q
    where q.practice_eligible=true
      and q.year_level=v_ticket.year_level
      and lower(trim(coalesce(q.source_type,'')))='past_paper'
      and q.exam_year is not null
      and nullif(trim(coalesce(q.paper,'')),'') is not null
    group by q.exam_year,lower(trim(q.paper))
  ),
  session_totals as (
    select
      ps.exam_year,
      lower(trim(ps.paper)) as paper_key,
      count(*)::integer as session_count,
      count(*) filter(where ps.ended_early=false)::integer as finished_session_count,
      max(ps.completed_at) as last_practised_at
    from public.practice_sessions ps
    where ps.roster_student_id=v_ticket.roster_student_id
      and ps.practice_mode='past_paper'
      and ps.exam_year is not null
      and nullif(trim(coalesce(ps.paper,'')),'') is not null
    group by ps.exam_year,lower(trim(ps.paper))
  ),
  coverage as (
    select
      ps.exam_year,
      lower(trim(ps.paper)) as paper_key,
      count(distinct public.practice_logical_item_key_v53d1(
        q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source
      ))::integer as questions_practised
    from public.practice_sessions ps
    join public.session_answers sa on sa.session_id=ps.id
    join public.questions q on q.id=sa.question_id
    where ps.roster_student_id=v_ticket.roster_student_id
      and ps.practice_mode='past_paper'
      and ps.exam_year is not null
      and nullif(trim(coalesce(ps.paper,'')),'') is not null
      and q.practice_eligible=true
      and lower(trim(coalesce(q.source_type,'')))='past_paper'
      and q.exam_year=ps.exam_year
      and lower(trim(coalesce(q.paper,'')))=lower(trim(coalesce(ps.paper,'')))
    group by ps.exam_year,lower(trim(ps.paper))
  ),
  latest as (
    select distinct on (ps.exam_year,lower(trim(ps.paper)))
      ps.exam_year,
      lower(trim(ps.paper)) as paper_key,
      ps.id as session_id,
      ps.first_try_percent,
      ps.mastery_percent,
      ps.total as session_questions,
      ps.ended_early,
      ps.completed_at,
      ps.result_code
    from public.practice_sessions ps
    where ps.roster_student_id=v_ticket.roster_student_id
      and ps.practice_mode='past_paper'
      and ps.exam_year is not null
      and nullif(trim(coalesce(ps.paper,'')),'') is not null
    order by ps.exam_year,lower(trim(ps.paper)),ps.completed_at desc,ps.id desc
  ),
  rows as (
    select
      a.exam_year,
      a.paper,
      a.available_questions,
      least(a.available_questions,coalesce(c.questions_practised,0))::integer as questions_practised,
      coalesce(st.session_count,0)::integer as session_count,
      coalesce(st.finished_session_count,0)::integer as finished_session_count,
      st.last_practised_at,
      l.session_id,
      l.first_try_percent,
      l.mastery_percent,
      l.session_questions,
      l.ended_early,
      l.completed_at as latest_completed_at,
      l.result_code,
      case
        when least(a.available_questions,coalesce(c.questions_practised,0))>=a.available_questions then 'completed'
        when coalesce(c.questions_practised,0)>0 or coalesce(st.session_count,0)>0 then 'in_progress'
        else 'not_started'
      end as progress_status,
      ta.assignment_id,
      ta.assignment_status,
      ta.selection_mode as assignment_selection_mode,
      ta.question_target as assignment_question_target,
      ta.closes_at as assignment_due_at
    from available a
    left join session_totals st
      on st.exam_year=a.exam_year and st.paper_key=lower(trim(a.paper))
    left join coverage c
      on c.exam_year=a.exam_year and c.paper_key=lower(trim(a.paper))
    left join latest l
      on l.exam_year=a.exam_year and l.paper_key=lower(trim(a.paper))
    left join lateral (
      select
        pa.id as assignment_id,
        case when att.id is null then 'not_started' else att.status end as assignment_status,
        pa.selection_mode,
        case
          when pa.selection_mode='all_available' then a.available_questions
          else least(pa.question_count,a.available_questions)
        end::integer as question_target,
        pa.closes_at
      from public.practice_assignments pa
      left join public.practice_assignment_attempts att
        on att.assignment_id=pa.id
       and att.roster_student_id=v_ticket.roster_student_id
      where pa.class_id=v_ticket.class_id
        and pa.active=true
        and pa.assignment_type='past_paper'
        and pa.exam_year=a.exam_year
        and lower(trim(coalesce(pa.paper,'')))=lower(trim(a.paper))
        and (
          not exists(
            select 1 from public.practice_assignment_recipients pr
            where pr.assignment_id=pa.id
          )
          or exists(
            select 1 from public.practice_assignment_recipients pr
            where pr.assignment_id=pa.id
              and pr.roster_student_id=v_ticket.roster_student_id
          )
        )
      order by
        case
          when att.status='in_progress' then 0
          when att.id is null then 1
          when att.status='completed' then 2
          else 3
        end,
        pa.created_at desc,
        pa.id desc
      limit 1
    ) ta on true
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'exam_year',exam_year,
    'paper',paper,
    'available_questions',available_questions,
    'questions_practised',questions_practised,
    'progress_status',progress_status,
    'session_count',session_count,
    'finished_session_count',finished_session_count,
    'last_practised_at',last_practised_at,
    'latest_session',case when session_id is null then null else jsonb_build_object(
      'session_id',session_id,
      'first_try_percent',first_try_percent,
      'mastery_percent',mastery_percent,
      'question_count',session_questions,
      'ended_early',ended_early,
      'completed_at',latest_completed_at,
      'result_code',result_code
    ) end,
    'teacher_assignment',case when assignment_id is null then null else jsonb_build_object(
      'assignment_id',assignment_id,
      'status',assignment_status,
      'selection_mode',assignment_selection_mode,
      'question_target',assignment_question_target,
      'due_at',assignment_due_at
    ) end
  ) order by exam_year desc,paper asc),'[]'::jsonb)
  into v_papers
  from rows;

  return jsonb_build_object(
    'student',jsonb_build_object(
      'student_name',v_ticket.student_name,
      'student_id',v_ticket.student_id,
      'year_level',v_ticket.year_level,
      'class_name',v_ticket.class_group
    ),
    'papers',coalesce(v_papers,'[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_student_past_paper_progress_v56c(text) from public;
grant execute on function public.get_student_past_paper_progress_v56c(text) to anon,authenticated,service_role;
