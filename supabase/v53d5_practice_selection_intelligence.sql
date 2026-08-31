-- V5.3D5 — Practice selection intelligence
-- Production migration: 20260831122750 v53d5_practice_selection_intelligence
-- Adds aggregate topic/skill learning evidence to a versioned ordinary-Practice
-- retrieval RPC. V5.3D3 retrieval remains available as the rollback path.

create or replace function public.get_student_practice_questions_v53d5(
  p_access_token text,
  p_year_level smallint
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_ticket public.student_access_tickets;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash = extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.expires_at > now()
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null
     or v_ticket.year_level <> p_year_level
     or v_ticket.purpose <> 'practice' then
    raise exception 'Student access could not be verified';
  end if;

  return query
  with question_history as (
    select
      sa.question_id,
      count(distinct sa.session_id)::integer as seen_count,
      max(sa.created_at) as last_seen_at
    from public.session_answers sa
    join public.practice_sessions ps on ps.id = sa.session_id
    where v_ticket.roster_student_id is not null
      and ps.roster_student_id = v_ticket.roster_student_id
      and coalesce(ps.practice_mode,'') <> 'exam'
    group by sa.question_id
  ),
  topic_performance as (
    select
      lower(trim(sa.strand)) as strand_key,
      lower(trim(sa.topic)) as topic_key,
      count(*) filter (
        where sa.marks_awarded is not null
          and coalesce(sa.marks_possible,0) > 0
      )::integer as scored_responses,
      round(
        100.0 * coalesce(sum(sa.marks_awarded) filter (
          where sa.marks_awarded is not null
            and coalesce(sa.marks_possible,0) > 0
        ),0)
        / nullif(coalesce(sum(sa.marks_possible) filter (
          where sa.marks_awarded is not null
            and coalesce(sa.marks_possible,0) > 0
        ),0),0)
      )::integer as percent
    from public.session_answers sa
    join public.practice_sessions ps on ps.id = sa.session_id
    where v_ticket.roster_student_id is not null
      and ps.roster_student_id = v_ticket.roster_student_id
      and nullif(trim(sa.strand),'') is not null
      and nullif(trim(sa.topic),'') is not null
    group by lower(trim(sa.strand)), lower(trim(sa.topic))
  ),
  skill_performance as (
    select
      lower(trim(sa.strand)) as strand_key,
      lower(trim(sa.topic)) as topic_key,
      lower(trim(sa.skill)) as skill_key,
      count(*) filter (
        where sa.marks_awarded is not null
          and coalesce(sa.marks_possible,0) > 0
      )::integer as scored_responses,
      round(
        100.0 * coalesce(sum(sa.marks_awarded) filter (
          where sa.marks_awarded is not null
            and coalesce(sa.marks_possible,0) > 0
        ),0)
        / nullif(coalesce(sum(sa.marks_possible) filter (
          where sa.marks_awarded is not null
            and coalesce(sa.marks_possible,0) > 0
        ),0),0)
      )::integer as percent
    from public.session_answers sa
    join public.practice_sessions ps on ps.id = sa.session_id
    where v_ticket.roster_student_id is not null
      and ps.roster_student_id = v_ticket.roster_student_id
      and nullif(trim(sa.strand),'') is not null
      and nullif(trim(sa.topic),'') is not null
      and nullif(trim(sa.skill),'') is not null
    group by lower(trim(sa.strand)), lower(trim(sa.topic)), lower(trim(sa.skill))
  )
  select jsonb_build_object(
    'id',q.id,'year_level',q.year_level,'strand',q.strand,'topic',q.topic,
    'subtopic',q.subtopic,'skill',q.skill,'difficulty',q.difficulty,'marks',q.marks,
    'exam_year',q.exam_year,'paper',q.paper,'question_number',q.question_number,
    'parent_question_number',q.parent_question_number,'part_label',q.part_label,
    'part_order',q.part_order,'group_prompt',q.group_prompt,'source_type',q.source_type,
    'source',q.source,'question_text',q.question_text,'image_url',q.image_url,
    'response_type',coalesce(q.response_type,'text'),
    'response_config',case coalesce(q.response_type,'text')
      when 'number_unit' then jsonb_build_object(
        'unit',q.response_config->>'unit',
        'accepted_units',coalesce(q.response_config->'accepted_units','[]'::jsonb))
      when 'fraction' then jsonb_build_object('simplest_form',coalesce((q.response_config->>'simplest_form')::boolean,false))
      when 'multi_blank' then jsonb_build_object('blanks',coalesce((
        select jsonb_agg(jsonb_build_object('label',coalesce(b->>'label','Blank '||n)))
        from jsonb_array_elements(coalesce(q.response_config->'blanks','[]'::jsonb)) with ordinality x(b,n)
      ),'[]'::jsonb))
      when 'multiple_choice' then jsonb_build_object('options',coalesce(q.response_config->'options','[]'::jsonb))
      when 'multi_select' then jsonb_build_object('options',coalesce(q.response_config->'options','[]'::jsonb))
      when 'drawing' then jsonb_build_object('instructions',coalesce(q.response_config->>'instructions',''))
      when 'manual' then jsonb_build_object('instructions',coalesce(q.response_config->>'instructions',''))
      else '{}'::jsonb end,
    'practice_seen_count',coalesce(qh.seen_count,0),
    'practice_last_seen_at',qh.last_seen_at,
    'practice_topic_scored_responses',coalesce(tp.scored_responses,0),
    'practice_topic_percent',tp.percent,
    'practice_skill_scored_responses',coalesce(sp.scored_responses,0),
    'practice_skill_percent',sp.percent,
    'active',true
  )
  from public.questions q
  left join question_history qh on qh.question_id = q.id
  left join topic_performance tp
    on tp.strand_key = lower(trim(q.strand))
   and tp.topic_key = lower(trim(q.topic))
  left join skill_performance sp
    on sp.strand_key = lower(trim(q.strand))
   and sp.topic_key = lower(trim(q.topic))
   and sp.skill_key = lower(trim(q.skill))
  where q.practice_eligible = true
    and q.year_level = p_year_level;
end;
$function$;

revoke all on function public.get_student_practice_questions_v53d5(text,smallint) from public;
revoke all on function public.get_student_practice_questions_v53d5(text,smallint) from anon;
revoke all on function public.get_student_practice_questions_v53d5(text,smallint) from authenticated;
grant execute on function public.get_student_practice_questions_v53d5(text,smallint) to anon, authenticated;

comment on function public.get_student_practice_questions_v53d5(text,smallint) is
  'V5.3D5 ordinary-Practice retrieval with exposure history plus aggregate topic/skill learning evidence for conservative Mixed Practice selection intelligence. Eligibility, grading and Exam Mode remain unchanged.';
