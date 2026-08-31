-- V5.3D5 — Practice selection intelligence profile
-- Production migration: v53d5_practice_selection_intelligence
-- Adds a read-only bearer-token-gated aggregate topic profile for Mixed Practice.
-- Existing Practice retrieval, grading, assignments and Exam Mode remain unchanged.

create or replace function public.get_student_practice_selection_profile_v53d5(p_access_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_ticket public.student_access_tickets;
  v_topics jsonb := '[]'::jsonb;
begin
  select t.*
  into v_ticket
  from public.student_access_tickets t
  where t.token_hash = extensions.digest(trim(coalesce(p_access_token, '')), 'sha256')
    and t.expires_at > now()
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null
     or v_ticket.roster_student_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  with topic_performance as (
    select
      lower(trim(sa.strand)) as strand,
      trim(sa.topic) as topic,
      count(*) filter (
        where sa.marks_awarded is not null
          and coalesce(sa.marks_possible, 0) > 0
      ) as scored_responses,
      coalesce(sum(sa.marks_awarded) filter (
        where sa.marks_awarded is not null
          and coalesce(sa.marks_possible, 0) > 0
      ), 0) as marks_awarded,
      coalesce(sum(sa.marks_possible) filter (
        where sa.marks_awarded is not null
          and coalesce(sa.marks_possible, 0) > 0
      ), 0) as marks_possible
    from public.session_answers sa
    join public.practice_sessions ps
      on ps.id = sa.session_id
    where ps.roster_student_id = v_ticket.roster_student_id
      and nullif(trim(sa.topic), '') is not null
      and nullif(trim(sa.strand), '') is not null
    group by lower(trim(sa.strand)), trim(sa.topic)
  ),
  scored_topics as (
    select
      strand,
      topic,
      scored_responses,
      round(100.0 * marks_awarded / nullif(marks_possible, 0))::integer as performance_percent
    from topic_performance
    where marks_possible > 0
  ),
  question_counts as (
    select
      lower(trim(q.strand)) as strand,
      trim(q.topic) as topic,
      count(distinct public.practice_logical_item_key_v53d1(
        q.id,
        q.parent_question_number,
        q.exam_year,
        q.paper,
        q.source_type,
        q.source
      )) as eligible_questions
    from public.questions q
    where q.practice_eligible = true
      and q.year_level = v_ticket.year_level
      and nullif(trim(q.topic), '') is not null
      and nullif(trim(q.strand), '') is not null
    group by lower(trim(q.strand)), trim(q.topic)
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'strand', qc.strand,
        'topic', qc.topic,
        'performance_percent', st.performance_percent,
        'scored_responses', st.scored_responses,
        'eligible_questions', qc.eligible_questions
      )
      order by st.performance_percent asc, st.scored_responses desc, qc.topic asc
    ),
    '[]'::jsonb
  )
  into v_topics
  from scored_topics st
  join question_counts qc
    on qc.strand = st.strand
   and lower(qc.topic) = lower(st.topic)
  where qc.eligible_questions > 0;

  return jsonb_build_object(
    'year_level', v_ticket.year_level,
    'topics', v_topics
  );
end;
$function$;

revoke all on function public.get_student_practice_selection_profile_v53d5(text) from public;
grant execute on function public.get_student_practice_selection_profile_v53d5(text) to anon, authenticated, service_role;
