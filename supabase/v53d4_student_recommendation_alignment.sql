-- V5.3D4 — Student Practice recommendation alignment
-- Production migration: 20260831032526 v53d4_student_recommendation_alignment
-- Keeps the existing recommendation evidence/threshold semantics while aligning
-- question availability and logical-item counting to the unified Practice bank.

create or replace function public.get_student_practice_recommendation_v53d4(p_access_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_ticket public.student_access_tickets;
  v_has_scored_history boolean := false;
  v_focus_strand text;
  v_focus_topic text;
  v_percent integer;
  v_scored_responses bigint;
  v_topic_items bigint := 0;
  v_available_items bigint := 0;
  v_recommended_count integer := 0;
  v_scope text := 'mixed';
  v_practice_strand text := 'all';
  v_practice_topic text := 'all';
  v_reason text := 'no_history';
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

  select exists (
    select 1
    from public.session_answers sa
    join public.practice_sessions ps
      on ps.id = sa.session_id
    where ps.roster_student_id = v_ticket.roster_student_id
      and sa.marks_awarded is not null
      and coalesce(sa.marks_possible, 0) > 0
      and nullif(trim(sa.topic), '') is not null
  )
  into v_has_scored_history;

  with topic_performance as (
    select
      coalesce(nullif(trim(sa.strand), ''), 'Other') as strand,
      coalesce(nullif(trim(sa.topic), ''), 'Other') as topic,
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
    group by
      coalesce(nullif(trim(sa.strand), ''), 'Other'),
      coalesce(nullif(trim(sa.topic), ''), 'Other')
  ),
  scored_topics as (
    select
      strand,
      topic,
      scored_responses,
      round(100.0 * marks_awarded / nullif(marks_possible, 0))::integer as percent
    from topic_performance
    where marks_possible > 0
  ),
  question_counts as (
    select
      q.strand,
      q.topic,
      count(distinct public.practice_logical_item_key_v53d1(
        q.id,
        q.parent_question_number,
        q.exam_year,
        q.paper,
        q.source_type,
        q.source
      )) as item_count
    from public.questions q
    where q.practice_eligible = true
      and q.year_level = v_ticket.year_level
    group by q.strand, q.topic
  )
  select
    qc.strand,
    qc.topic,
    st.percent,
    st.scored_responses,
    qc.item_count
  into
    v_focus_strand,
    v_focus_topic,
    v_percent,
    v_scored_responses,
    v_topic_items
  from scored_topics st
  join question_counts qc
    on lower(trim(qc.strand)) = lower(trim(st.strand))
   and lower(trim(qc.topic)) = lower(trim(st.topic))
  where qc.item_count > 0
  order by
    st.percent asc,
    st.scored_responses desc,
    qc.topic asc
  limit 1;

  if v_focus_topic is not null then
    if v_percent < 60 then
      v_reason := 'needs_attention';
    elsif v_percent < 80 then
      v_reason := 'developing';
    else
      v_reason := 'consolidation';
    end if;

    if v_topic_items >= 5 then
      v_scope := 'topic';
      v_practice_strand := v_focus_strand;
      v_practice_topic := v_focus_topic;
      v_available_items := v_topic_items;
    else
      v_scope := 'strand';
      v_practice_strand := v_focus_strand;
      v_practice_topic := 'all';

      select count(distinct public.practice_logical_item_key_v53d1(
        q.id,
        q.parent_question_number,
        q.exam_year,
        q.paper,
        q.source_type,
        q.source
      ))
      into v_available_items
      from public.questions q
      where q.practice_eligible = true
        and q.year_level = v_ticket.year_level
        and lower(trim(q.strand)) = lower(trim(v_focus_strand));
    end if;
  else
    v_reason := case
      when v_has_scored_history then 'mixed_refresh'
      else 'no_history'
    end;

    select count(distinct public.practice_logical_item_key_v53d1(
      q.id,
      q.parent_question_number,
      q.exam_year,
      q.paper,
      q.source_type,
      q.source
    ))
    into v_available_items
    from public.questions q
    where q.practice_eligible = true
      and q.year_level = v_ticket.year_level;
  end if;

  v_recommended_count := least(5, coalesce(v_available_items, 0)::integer);

  if v_recommended_count = 0 then
    v_reason := 'no_questions';
  end if;

  return jsonb_build_object(
    'year_level', v_ticket.year_level,
    'reason', v_reason,
    'focus_strand', v_focus_strand,
    'focus_topic', v_focus_topic,
    'performance_percent', v_percent,
    'scored_responses', coalesce(v_scored_responses, 0),
    'focus_topic_questions', coalesce(v_topic_items, 0),
    'practice_scope', v_scope,
    'practice_strand', v_practice_strand,
    'practice_topic', v_practice_topic,
    'available_questions', coalesce(v_available_items, 0),
    'recommended_count', v_recommended_count
  );
end;
$function$;

revoke all on function public.get_student_practice_recommendation_v53d4(text) from public;
grant execute on function public.get_student_practice_recommendation_v53d4(text) to anon, authenticated, service_role;
