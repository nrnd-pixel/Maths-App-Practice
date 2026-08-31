-- Applied to production as migration 20260831012944 v53d3_practice_question_history.
-- Adds per-roster question exposure metadata to a versioned ordinary-Practice
-- retrieval RPC. V5.3B retrieval remains available as the rollback path.

create or replace function public.get_student_practice_questions_v53d3(
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
  limit 1;

  if v_ticket.id is null
     or v_ticket.year_level <> p_year_level
     or v_ticket.purpose <> 'practice' then
    raise exception 'Student access could not be verified';
  end if;

  return query
  with history as (
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
    'practice_seen_count',coalesce(h.seen_count,0),
    'practice_last_seen_at',h.last_seen_at,
    'active',true
  )
  from public.questions q
  left join history h on h.question_id = q.id
  where q.practice_eligible = true
    and q.year_level = p_year_level;
end;
$function$;

revoke all on function public.get_student_practice_questions_v53d3(text,smallint) from public;
revoke all on function public.get_student_practice_questions_v53d3(text,smallint) from anon;
revoke all on function public.get_student_practice_questions_v53d3(text,smallint) from authenticated;
grant execute on function public.get_student_practice_questions_v53d3(text,smallint) to anon, authenticated;

comment on function public.get_student_practice_questions_v53d3(text,smallint) is
  'V5.3D3 unified ordinary-Practice retrieval with per-roster question exposure history for repeat-aware client selection. Eligibility and grading remain unchanged.';
