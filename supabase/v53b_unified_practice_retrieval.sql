-- Applied to production as migration 20260830173338 v53b_unified_practice_retrieval.
-- Adds versioned ordinary-Practice RPCs over questions.practice_eligible.
-- Existing V3 Practice RPCs and all Exam RPCs remain unchanged until the V5.3B frontend bridge is released.

create or replace function public.get_student_practice_questions_v53b(
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
    'active',true
  )
  from public.questions q
  where q.practice_eligible = true
    and q.year_level = p_year_level;
end;
$function$;

-- Clone the established deterministic Practice contracts and change only the
-- availability predicate from q.active to q.practice_eligible.
do $v53b$
declare
  v_def text;
begin
  select pg_get_functiondef('public.grade_practice_response_v3(text,uuid,jsonb)'::regprocedure) into v_def;
  v_def := replace(v_def,'public.grade_practice_response_v3','public.grade_practice_response_v53b');
  v_def := replace(v_def,'q.active','q.practice_eligible');
  execute v_def;

  select pg_get_functiondef('public.request_practice_hint_v3(text,uuid)'::regprocedure) into v_def;
  v_def := replace(v_def,'public.request_practice_hint_v3','public.request_practice_hint_v53b');
  v_def := replace(v_def,'q.active','q.practice_eligible');
  execute v_def;

  select pg_get_functiondef('public.submit_practice_session_v3(text,jsonb,jsonb)'::regprocedure) into v_def;
  v_def := replace(v_def,'public.submit_practice_session_v3','public.submit_practice_session_v53b');
  v_def := replace(v_def,'q.active','q.practice_eligible');
  execute v_def;

  select pg_get_functiondef('public.begin_student_ai_help_request(text,uuid,text,jsonb,text)'::regprocedure) into v_def;
  v_def := replace(v_def,'public.begin_student_ai_help_request','public.begin_student_ai_help_request_v53b');
  v_def := replace(v_def,'q.active','q.practice_eligible');
  execute v_def;
end
$v53b$;

revoke all on function public.get_student_practice_questions_v53b(text,smallint) from public;
revoke all on function public.grade_practice_response_v53b(text,uuid,jsonb) from public;
revoke all on function public.request_practice_hint_v53b(text,uuid) from public;
revoke all on function public.submit_practice_session_v53b(text,jsonb,jsonb) from public;
revoke all on function public.begin_student_ai_help_request_v53b(text,uuid,text,jsonb,text) from public;

grant execute on function public.get_student_practice_questions_v53b(text,smallint) to anon, authenticated;
grant execute on function public.grade_practice_response_v53b(text,uuid,jsonb) to anon, authenticated;
grant execute on function public.request_practice_hint_v53b(text,uuid) to anon, authenticated;
grant execute on function public.submit_practice_session_v53b(text,jsonb,jsonb) to anon, authenticated;
grant execute on function public.begin_student_ai_help_request_v53b(text,uuid,text,jsonb,text) to anon, authenticated;

comment on function public.get_student_practice_questions_v53b(text,smallint) is 'V5.3B unified ordinary-Practice retrieval over questions.practice_eligible. Exam Mode remains on get_student_questions.';
comment on function public.grade_practice_response_v53b(text,uuid,jsonb) is 'V5.3B deterministic Practice grading over questions.practice_eligible.';
comment on function public.request_practice_hint_v53b(text,uuid) is 'V5.3B Practice hint route over questions.practice_eligible.';
comment on function public.submit_practice_session_v53b(text,jsonb,jsonb) is 'V5.3B Practice submission validation over questions.practice_eligible.';
comment on function public.begin_student_ai_help_request_v53b(text,uuid,text,jsonb,text) is 'V5.3B AI Help validation over questions.practice_eligible for ordinary Practice.';
