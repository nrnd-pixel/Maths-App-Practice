-- V5.2C — Student Topical Practice Library
-- Applied to production as 20260830094514 v52c_student_topical_practice_library.
-- Topical questions remain inactive; student exposure is controlled by a separate set-level publication registry.

create table if not exists public.topical_exercise_settings (
  id uuid primary key default gen_random_uuid(),
  year_level smallint not null check (year_level between 1 and 6),
  source text not null check (length(trim(source)) between 1 and 120),
  is_available boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.topical_exercise_settings enable row level security;
revoke all on table public.topical_exercise_settings from public, anon, authenticated;
create unique index if not exists topical_exercise_settings_identity_uq
  on public.topical_exercise_settings (year_level, lower(trim(source)));

alter table public.student_access_tickets
  add column if not exists topical_source text;

alter table public.practice_sessions
  add column if not exists topical_source text;

create index if not exists practice_sessions_topical_source_idx
  on public.practice_sessions (year_level, topical_source)
  where topical_source is not null;

create or replace function public.topical_exercise_readiness_v52c(
  p_year_level integer,
  p_source text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_source text := trim(coalesce(p_source,''));
  v_physical_rows integer := 0;
  v_logical_questions integer := 0;
  v_total_marks numeric := 0;
  v_image_rows integer := 0;
  v_manual_rows integer := 0;
  v_active_rows integer := 0;
  v_exam_metadata_rows integer := 0;
  v_metadata_blockers integer := 0;
  v_image_blockers integer := 0;
  v_review_blockers integer := 0;
  v_duplicate_groups integer := 0;
  v_ungrouped_multipart_rows integer := 0;
  v_multipart_blocker_groups integer := 0;
  v_setting_exists boolean := false;
  v_is_available boolean := false;
  v_ready boolean := false;
  v_reasons text[] := array[]::text[];
begin
  with base as (
    select q.*,
      case
        when nullif(trim(coalesce(q.parent_question_number,'')),'') is not null then trim(q.parent_question_number)
        else trim(coalesce(q.question_number,''))
      end as logical_no
    from public.questions q
    where q.source_type = 'topical_exercise'
      and q.year_level = p_year_level
      and lower(trim(coalesce(q.source,''))) = lower(v_source)
  ),
  duplicate_groups as (
    select lower(trim(question_number)) as question_number
    from base
    where nullif(trim(coalesce(question_number,'')),'') is not null
    group by lower(trim(question_number))
    having count(*) > 1
  ),
  multipart_groups as (
    select trim(parent_question_number) as parent_question_number,
      count(*) as row_count,
      count(*) filter (where nullif(trim(coalesce(part_label,'')),'') is null) as missing_labels,
      count(*) filter (where part_order is null or part_order < 1) as invalid_orders,
      count(distinct lower(trim(coalesce(part_label,'')))) as distinct_labels,
      count(distinct part_order) as distinct_orders,
      min(part_order) as min_order,
      max(part_order) as max_order,
      count(distinct coalesce(trim(group_prompt),'')) as prompt_variants,
      count(*) filter (
        where nullif(trim(coalesce(part_label,'')),'') is not null
          and (
            trim(part_label) !~* '^[a-z]$'
            or part_order is null
            or ascii(lower(trim(part_label))) - 96 <> part_order
          )
      ) as label_order_mismatches,
      count(*) filter (
        where trim(coalesce(question_number,'')) ~* '^[0-9]+\s*(\([a-z]\)|[a-z])$'
          and regexp_replace(lower(trim(question_number)), '[0-9()[:space:]]', '', 'g') <> lower(trim(coalesce(part_label,'')))
      ) as question_label_mismatches
    from base
    where nullif(trim(coalesce(parent_question_number,'')),'') is not null
    group by trim(parent_question_number)
  )
  select
    (select count(*) from base),
    (select count(distinct nullif(logical_no,'')) from base),
    (select coalesce(sum(coalesce(marks,0)),0) from base),
    (select count(*) from base where nullif(trim(coalesce(image_url,'')),'') is not null),
    (select count(*) from base where lower(coalesce(response_type,'text')) in ('drawing','manual')),
    (select count(*) from base where active = true),
    (select count(*) from base where exam_year is not null or nullif(trim(coalesce(paper,'')),'') is not null),
    (select count(*) from base where
      nullif(trim(coalesce(question_number,'')),'') is null
      or nullif(trim(coalesce(strand,'')),'') is null
      or nullif(trim(coalesce(topic,'')),'') is null
      or nullif(trim(coalesce(skill,'')),'') is null
      or nullif(trim(coalesce(question_text,'')),'') is null
      or marks is null or marks <= 0
      or (lower(coalesce(response_type,'text')) not in ('drawing','manual') and nullif(trim(coalesce(answer,'')),'') is null)
    ),
    (select count(*) from base where
      nullif(trim(coalesce(image_url,'')),'') is not null
      and image_url !~* '^https://'
      and image_url !~* '^/?images/'
    ),
    (select count(*) from base where coalesce(review_status,'none') <> 'reviewed'),
    (select count(*) from duplicate_groups),
    (select count(*) from base where
      nullif(trim(coalesce(parent_question_number,'')),'') is null
      and trim(coalesce(question_number,'')) ~* '^[0-9]+\s*(\([a-z]\)|[a-z])$'
    ),
    (select count(*) from multipart_groups where
      row_count < 2
      or missing_labels > 0
      or invalid_orders > 0
      or distinct_labels <> row_count
      or distinct_orders <> row_count
      or min_order <> 1
      or max_order <> row_count
      or prompt_variants > 1
      or label_order_mismatches > 0
      or question_label_mismatches > 0
    )
  into
    v_physical_rows,
    v_logical_questions,
    v_total_marks,
    v_image_rows,
    v_manual_rows,
    v_active_rows,
    v_exam_metadata_rows,
    v_metadata_blockers,
    v_image_blockers,
    v_review_blockers,
    v_duplicate_groups,
    v_ungrouped_multipart_rows,
    v_multipart_blocker_groups;

  select exists(
    select 1 from public.topical_exercise_settings s
    where s.year_level = p_year_level
      and lower(trim(s.source)) = lower(v_source)
  ), coalesce((
    select s.is_available from public.topical_exercise_settings s
    where s.year_level = p_year_level
      and lower(trim(s.source)) = lower(v_source)
    order by s.created_at
    limit 1
  ),false)
  into v_setting_exists, v_is_available;

  if v_physical_rows = 0 then v_reasons := array_append(v_reasons,'No topical exercise rows'); end if;
  if v_active_rows > 0 then v_reasons := array_append(v_reasons,format('%s row(s) are active and could leak into ordinary Practice',v_active_rows)); end if;
  if v_exam_metadata_rows > 0 then v_reasons := array_append(v_reasons,format('%s row(s) contain exam metadata',v_exam_metadata_rows)); end if;
  if v_metadata_blockers > 0 then v_reasons := array_append(v_reasons,format('%s metadata blocker(s)',v_metadata_blockers)); end if;
  if v_image_blockers > 0 then v_reasons := array_append(v_reasons,format('%s image blocker(s)',v_image_blockers)); end if;
  if v_review_blockers > 0 then v_reasons := array_append(v_reasons,format('%s row(s) still need teacher review',v_review_blockers)); end if;
  if v_duplicate_groups > 0 then v_reasons := array_append(v_reasons,format('%s duplicate question-number group(s)',v_duplicate_groups)); end if;
  if v_ungrouped_multipart_rows > 0 then v_reasons := array_append(v_reasons,format('%s ungrouped multipart row(s)',v_ungrouped_multipart_rows)); end if;
  if v_multipart_blocker_groups > 0 then v_reasons := array_append(v_reasons,format('%s multipart blocker group(s)',v_multipart_blocker_groups)); end if;

  v_ready := v_physical_rows > 0
    and v_logical_questions > 0
    and v_total_marks > 0
    and v_active_rows = 0
    and v_exam_metadata_rows = 0
    and v_metadata_blockers = 0
    and v_image_blockers = 0
    and v_review_blockers = 0
    and v_duplicate_groups = 0
    and v_ungrouped_multipart_rows = 0
    and v_multipart_blocker_groups = 0;

  return jsonb_build_object(
    'year_level',p_year_level,
    'source',v_source,
    'physical_rows',v_physical_rows,
    'logical_questions',v_logical_questions,
    'total_marks',v_total_marks,
    'image_rows',v_image_rows,
    'manual_rows',v_manual_rows,
    'active_rows',v_active_rows,
    'exam_metadata_rows',v_exam_metadata_rows,
    'metadata_blockers',v_metadata_blockers,
    'image_blockers',v_image_blockers,
    'review_blockers',v_review_blockers,
    'duplicate_groups',v_duplicate_groups,
    'ungrouped_multipart_rows',v_ungrouped_multipart_rows,
    'multipart_blocker_groups',v_multipart_blocker_groups,
    'setting_exists',v_setting_exists,
    'is_available',v_is_available,
    'ready',v_ready,
    'reasons',to_jsonb(v_reasons)
  );
end;
$$;

create or replace function public.get_topical_exercise_publication_states_v52c()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;
  with identities as (
    select distinct q.year_level::integer as year_level, trim(q.source) as source
    from public.questions q
    where q.source_type='topical_exercise' and nullif(trim(coalesce(q.source,'')),'') is not null
    union
    select s.year_level::integer, trim(s.source)
    from public.topical_exercise_settings s
  )
  select coalesce(jsonb_agg(public.topical_exercise_readiness_v52c(i.year_level,i.source)
    order by i.year_level,lower(i.source)),'[]'::jsonb)
  into v_result
  from identities i;
  return v_result;
end;
$$;

create or replace function public.get_topical_exercise_readiness_v52c(
  p_year_level integer,
  p_source text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;
  return public.topical_exercise_readiness_v52c(p_year_level,p_source);
end;
$$;

create or replace function public.save_topical_exercise_setting_v52c(
  p_year_level integer,
  p_source text,
  p_is_available boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text := trim(coalesce(p_source,''));
  v_canonical text;
  v_id uuid;
  v_readiness jsonb;
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;
  if p_year_level not between 1 and 6 then raise exception 'Invalid year level'; end if;
  if length(v_source) < 1 or length(v_source) > 120 then raise exception 'Invalid topical set name'; end if;

  select q.source into v_canonical
  from public.questions q
  where q.source_type='topical_exercise'
    and q.year_level=p_year_level
    and lower(trim(q.source))=lower(v_source)
  order by q.created_at nulls last, q.id
  limit 1;
  v_canonical := coalesce(nullif(trim(v_canonical),''),v_source);

  v_readiness := public.topical_exercise_readiness_v52c(p_year_level,v_canonical);
  if p_is_available and coalesce((v_readiness->>'ready')::boolean,false) is not true then
    raise exception 'Topical set is not ready to publish: %', coalesce(array_to_string(array(select jsonb_array_elements_text(v_readiness->'reasons')), '; '),'readiness checks failed');
  end if;

  select s.id into v_id
  from public.topical_exercise_settings s
  where s.year_level=p_year_level and lower(trim(s.source))=lower(v_canonical)
  limit 1
  for update;

  if v_id is null then
    insert into public.topical_exercise_settings(year_level,source,is_available)
    values(p_year_level,v_canonical,coalesce(p_is_available,false))
    returning id into v_id;
  else
    update public.topical_exercise_settings
    set source=v_canonical,is_available=coalesce(p_is_available,false),updated_at=now()
    where id=v_id;
  end if;

  return public.topical_exercise_readiness_v52c(p_year_level,v_canonical);
end;
$$;

create or replace function public.get_available_topical_exercise_sets_v52c(
  p_year_level smallint
)
returns table(source text, logical_questions integer, physical_rows integer, total_marks numeric, image_rows integer, manual_rows integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.source::text,
    (r.payload->>'logical_questions')::integer,
    (r.payload->>'physical_rows')::integer,
    (r.payload->>'total_marks')::numeric,
    (r.payload->>'image_rows')::integer,
    (r.payload->>'manual_rows')::integer
  from public.topical_exercise_settings s
  cross join lateral (select public.topical_exercise_readiness_v52c(s.year_level,s.source) as payload) r
  where s.year_level=p_year_level
    and s.is_available=true
    and coalesce((r.payload->>'ready')::boolean,false)=true
  order by lower(s.source);
$$;

create or replace function public.bind_student_topical_access_v52c(
  p_access_token text,
  p_year_level smallint,
  p_source text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.student_access_tickets;
  v_source text;
  v_readiness jsonb;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.expires_at>now()
  limit 1
  for update;

  if v_ticket.id is null or v_ticket.purpose<>'practice' or v_ticket.used_at is not null or v_ticket.year_level<>p_year_level then
    raise exception 'Student access could not be verified';
  end if;

  select s.source into v_source
  from public.topical_exercise_settings s
  where s.year_level=p_year_level
    and lower(trim(s.source))=lower(trim(coalesce(p_source,'')))
    and s.is_available=true
  limit 1;
  if v_source is null then raise exception 'This topical exercise is not currently available'; end if;

  v_readiness := public.topical_exercise_readiness_v52c(p_year_level,v_source);
  if coalesce((v_readiness->>'ready')::boolean,false) is not true then
    raise exception 'This topical exercise is not currently available';
  end if;

  if nullif(trim(coalesce(v_ticket.topical_source,'')),'') is not null
     and lower(trim(v_ticket.topical_source))<>lower(trim(v_source)) then
    raise exception 'Student access is already bound to another topical exercise';
  end if;

  update public.student_access_tickets set topical_source=v_source where id=v_ticket.id;
  return jsonb_build_object('allowed',true,'year_level',p_year_level,'source',v_source,'logical_questions',v_readiness->'logical_questions','total_marks',v_readiness->'total_marks');
end;
$$;

create or replace function public.get_student_topical_questions_v52c(
  p_access_token text,
  p_year_level smallint,
  p_source text
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ticket public.student_access_tickets;
  v_source text := trim(coalesce(p_source,''));
  v_readiness jsonb;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.expires_at>now()
    and t.used_at is null
  limit 1;

  if v_ticket.id is null or v_ticket.purpose<>'practice' or v_ticket.year_level<>p_year_level
     or nullif(trim(coalesce(v_ticket.topical_source,'')),'') is null
     or lower(trim(v_ticket.topical_source))<>lower(v_source) then
    raise exception 'Student access could not be verified';
  end if;

  if not exists (
    select 1 from public.topical_exercise_settings s
    where s.year_level=p_year_level and lower(trim(s.source))=lower(v_source) and s.is_available=true
  ) then raise exception 'This topical exercise is not currently available'; end if;

  v_readiness := public.topical_exercise_readiness_v52c(p_year_level,v_source);
  if coalesce((v_readiness->>'ready')::boolean,false) is not true then
    raise exception 'This topical exercise is not currently available';
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
      when 'number_unit' then jsonb_build_object('unit',q.response_config->>'unit','accepted_units',coalesce(q.response_config->'accepted_units','[]'::jsonb))
      when 'fraction' then jsonb_build_object('simplest_form',coalesce((q.response_config->>'simplest_form')::boolean,false))
      when 'multi_blank' then jsonb_build_object('blanks',coalesce((select jsonb_agg(jsonb_build_object('label',coalesce(b->>'label','Blank '||n))) from jsonb_array_elements(coalesce(q.response_config->'blanks','[]'::jsonb)) with ordinality x(b,n)),'[]'::jsonb))
      when 'multiple_choice' then jsonb_build_object('options',coalesce(q.response_config->'options','[]'::jsonb))
      when 'multi_select' then jsonb_build_object('options',coalesce(q.response_config->'options','[]'::jsonb))
      when 'drawing' then jsonb_build_object('instructions',coalesce(q.response_config->>'instructions',''))
      when 'manual' then jsonb_build_object('instructions',coalesce(q.response_config->>'instructions',''))
      else '{}'::jsonb end,
    'active',false
  )
  from public.questions q
  where q.source_type='topical_exercise'
    and q.active=false
    and q.year_level=p_year_level
    and lower(trim(q.source))=lower(v_source)
    and coalesce(q.review_status,'none')='reviewed';
end;
$$;

create or replace function public.grade_topical_response_v52c(
  p_access_token text,
  p_question_id uuid,
  p_response jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.student_access_tickets;
  v_question public.questions;
  v_event public.student_practice_answer_events;
  v_attempt smallint;
  v_correct boolean;
  v_manual boolean;
  v_complete boolean;
begin
  select t.* into v_ticket from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose='practice' and t.used_at is null and t.expires_at>now()
    and nullif(trim(coalesce(t.topical_source,'')),'') is not null
  limit 1;
  if v_ticket.id is null then raise exception 'Student access could not be verified'; end if;

  select q.* into v_question from public.questions q
  where q.id=p_question_id
    and q.source_type='topical_exercise'
    and q.active=false
    and q.year_level=v_ticket.year_level
    and coalesce(q.review_status,'none')='reviewed'
    and lower(trim(q.source))=lower(trim(v_ticket.topical_source));
  if v_question.id is null then raise exception 'Question is not part of this topical practice session'; end if;
  if public.student_response_is_empty(coalesce(p_response,'{}'::jsonb)) then raise exception 'A response is required'; end if;

  select e.* into v_event from public.student_practice_answer_events e
  where e.ticket_id=v_ticket.id and e.question_id=v_question.id for update;
  if not found then
    insert into public.student_practice_answer_events(ticket_id,question_id)
    values(v_ticket.id,v_question.id) returning * into v_event;
  end if;

  v_manual := coalesce(v_question.response_type,'text') in ('drawing','manual');
  if v_event.completed then
    return jsonb_build_object(
      'question_id',v_question.id,'manual_review',v_manual,'pending_review',v_manual,
      'correct',v_event.final_correct,'first_try',v_event.first_correct,
      'attempt_number',v_event.attempt_count,'completed',true,'hint_used',v_event.hint_used,
      'correct_answer',case when v_manual then null else v_question.answer end,
      'explanation',case when v_manual then null else v_question.explanation end,
      'marks_possible',v_question.marks
    );
  end if;

  if v_manual then
    update public.student_practice_answer_events set attempt_count=1,final_correct=false,
      completed=true,final_response=p_response,updated_at=now()
    where id=v_event.id returning * into v_event;
    return jsonb_build_object('question_id',v_question.id,'manual_review',true,'pending_review',true,
      'correct',false,'first_try',false,'attempt_number',1,'completed',true,'hint_used',false,
      'correct_answer',null,'explanation',null,'marks_possible',v_question.marks);
  end if;

  v_attempt := least(2,(v_event.attempt_count+1)::integer)::smallint;
  v_correct := public.student_response_is_correct(v_question,p_response);
  v_complete := v_correct or v_attempt>=2;
  update public.student_practice_answer_events set
    attempt_count=v_attempt,
    first_correct=(v_attempt=1 and v_correct),
    final_correct=v_correct,
    hint_used=hint_used or (v_attempt=1 and not v_correct),
    completed=v_complete,
    final_response=p_response,
    updated_at=now()
  where id=v_event.id returning * into v_event;

  return jsonb_build_object(
    'question_id',v_question.id,'manual_review',false,'pending_review',false,
    'correct',v_correct,'first_try',v_event.first_correct,'attempt_number',v_attempt,
    'completed',v_complete,'hint_used',v_event.hint_used,
    'hint',case when not v_correct and v_attempt=1 then v_question.hint else null end,
    'correct_answer',case when v_complete then v_question.answer else null end,
    'explanation',case when v_complete then v_question.explanation else null end,
    'marks_possible',v_question.marks
  );
end;
$$;

create or replace function public.submit_topical_practice_session_v52c(
  p_access_token text,
  p_session jsonb,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.student_access_tickets;
  v_session_id uuid;
  v_result_code text;
  v_key text;
  v_requested integer;
  v_valid integer;
  v_total integer;
  v_auto integer;
  v_first integer;
  v_mastery integer;
  v_hints integer;
  v_second integer;
  v_pending integer;
  v_marks numeric;
  v_auto_marks numeric;
  v_existing uuid;
begin
  if jsonb_typeof(coalesce(p_answers,'[]'::jsonb))<>'array' then raise exception 'Answers must be an array'; end if;
  select t.* into v_ticket from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose='practice' and t.expires_at>now()
    and nullif(trim(coalesce(t.topical_source,'')),'') is not null
  limit 1 for update;
  if v_ticket.id is null then raise exception 'Student access could not be verified'; end if;

  v_key:=trim(coalesce(p_session->>'client_session_key',''));
  if length(v_key)<16 then raise exception 'Invalid session key'; end if;
  if v_ticket.used_at is not null then
    select id into v_existing from public.practice_sessions
    where client_session_key=v_key
      and topical_source is not null
      and lower(trim(topical_source))=lower(trim(v_ticket.topical_source))
      and coalesce(roster_student_id,'00000000-0000-0000-0000-000000000000'::uuid)=coalesce(v_ticket.roster_student_id,'00000000-0000-0000-0000-000000000000'::uuid)
      and student_name=v_ticket.student_name
    order by completed_at desc limit 1;
    if v_existing is null then raise exception 'Student access ticket has already been used'; end if;
    select result_code into v_result_code from public.practice_sessions where id=v_existing;
    return jsonb_build_object('session_id',v_existing,'result_code',v_result_code,'already_submitted',true);
  end if;

  select count(*),count(distinct x.question_id) into v_requested,v_valid
  from jsonb_to_recordset(p_answers) x(question_id text)
  where x.question_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  if v_requested<>jsonb_array_length(p_answers) or v_valid<>v_requested then raise exception 'Answers contain invalid or duplicate question IDs'; end if;

  select count(*) into v_valid
  from jsonb_to_recordset(p_answers) x(question_id text)
  join public.questions q on q.id=x.question_id::uuid
    and q.source_type='topical_exercise' and q.active=false and q.year_level=v_ticket.year_level
    and coalesce(q.review_status,'none')='reviewed'
    and lower(trim(q.source))=lower(trim(v_ticket.topical_source))
  join public.student_practice_answer_events e on e.ticket_id=v_ticket.id and e.question_id=q.id and e.completed;
  if v_valid<>v_requested then raise exception 'Answers contain unavailable or ungraded topical questions'; end if;

  with selected as (
    select q.*,e.* from jsonb_to_recordset(p_answers) x(question_id text)
    join public.questions q on q.id=x.question_id::uuid
    join public.student_practice_answer_events e on e.ticket_id=v_ticket.id and e.question_id=q.id
  ) select count(*),count(*) filter(where coalesce(response_type,'text') not in ('drawing','manual')),
      count(*) filter(where first_correct),count(*) filter(where final_correct),
      count(*) filter(where hint_used),count(*) filter(where attempt_count=2 and final_correct and not first_correct),
      count(*) filter(where coalesce(response_type,'text') in ('drawing','manual')),
      coalesce(sum(marks),0),coalesce(sum(marks) filter(where coalesce(response_type,'text') not in ('drawing','manual') and final_correct),0)
  into v_total,v_auto,v_first,v_mastery,v_hints,v_second,v_pending,v_marks,v_auto_marks from selected;

  insert into public.practice_sessions(
    client_session_key,student_name,student_id,year_level,class_group,practice_mode,strand,topic,topical_source,
    first_try_score,mastery_score,total,auto_total,pending_review_count,first_try_percent,
    mastery_percent,hints_used,second_try_successes,ended_early,started_at,completed_at,
    marks_possible,auto_marks_awarded,roster_student_id,class_id
  ) values (
    v_key,v_ticket.student_name,v_ticket.student_id,v_ticket.year_level,v_ticket.class_group,
    'topical','mixed',left(v_ticket.topical_source,200),v_ticket.topical_source,
    v_first,v_mastery,v_total,v_auto,v_pending,
    case when v_auto=0 then 0 else round(v_first*100.0/v_auto)::integer end,
    case when v_auto=0 then 0 else round(v_mastery*100.0/v_auto)::integer end,
    v_hints,v_second,coalesce((p_session->>'ended_early')::boolean,false),v_ticket.created_at,now(),
    v_marks,v_auto_marks,v_ticket.roster_student_id,v_ticket.class_id
  ) returning id,result_code into v_session_id,v_result_code;

  insert into public.session_answers(
    session_id,question_id,question_snapshot,strand,topic,subtopic,skill,final_answer,
    correct_answer_snapshot,correct,first_try,attempts,hint_used,explanation_snapshot,
    response_type,response_payload,review_status,marks_possible,marks_awarded
  )
  select v_session_id,q.id,q.question_text,q.strand,q.topic,q.subtopic,q.skill,
    coalesce(e.final_response->>'display',''),
    case when coalesce(q.response_type,'text') in ('drawing','manual') then 'Manual review' else q.answer end,
    case when coalesce(q.response_type,'text') in ('drawing','manual') then false else e.final_correct end,
    case when coalesce(q.response_type,'text') in ('drawing','manual') then false else e.first_correct end,
    greatest(1,e.attempt_count),e.hint_used,q.explanation,coalesce(q.response_type,'text'),
    coalesce(e.final_response->'payload','{}'::jsonb),
    case when coalesce(q.response_type,'text') in ('drawing','manual') then 'pending' else 'auto' end,
    q.marks,case when coalesce(q.response_type,'text') in ('drawing','manual') then null when e.final_correct then q.marks else 0 end
  from jsonb_to_recordset(p_answers) x(question_id text)
  join public.questions q on q.id=x.question_id::uuid
  join public.student_practice_answer_events e on e.ticket_id=v_ticket.id and e.question_id=q.id;

  update public.student_access_tickets set used_at=now() where id=v_ticket.id;
  return jsonb_build_object(
    'session_id',v_session_id,'result_code',v_result_code,'already_submitted',false,
    'summary',jsonb_build_object('first_try_score',v_first,'mastery_score',v_mastery,
      'total',v_total,'auto_total',v_auto,'pending_review_count',v_pending,
      'first_try_percent',case when v_auto=0 then 0 else round(v_first*100.0/v_auto)::integer end,
      'mastery_percent',case when v_auto=0 then 0 else round(v_mastery*100.0/v_auto)::integer end,
      'hints_used',v_hints,'second_try_successes',v_second,'marks_possible',v_marks,
      'auto_marks_awarded',v_auto_marks,'topical_source',v_ticket.topical_source)
  );
end;
$$;

revoke execute on function public.topical_exercise_readiness_v52c(integer,text) from public, anon, authenticated;
revoke execute on function public.get_topical_exercise_publication_states_v52c() from public, anon;
grant execute on function public.get_topical_exercise_publication_states_v52c() to authenticated;
revoke execute on function public.get_topical_exercise_readiness_v52c(integer,text) from public, anon;
grant execute on function public.get_topical_exercise_readiness_v52c(integer,text) to authenticated;
revoke execute on function public.save_topical_exercise_setting_v52c(integer,text,boolean) from public, anon;
grant execute on function public.save_topical_exercise_setting_v52c(integer,text,boolean) to authenticated;

revoke execute on function public.get_available_topical_exercise_sets_v52c(smallint) from public;
grant execute on function public.get_available_topical_exercise_sets_v52c(smallint) to anon, authenticated;
revoke execute on function public.bind_student_topical_access_v52c(text,smallint,text) from public;
grant execute on function public.bind_student_topical_access_v52c(text,smallint,text) to anon, authenticated;
revoke execute on function public.get_student_topical_questions_v52c(text,smallint,text) from public;
grant execute on function public.get_student_topical_questions_v52c(text,smallint,text) to anon, authenticated;
revoke execute on function public.grade_topical_response_v52c(text,uuid,jsonb) from public;
grant execute on function public.grade_topical_response_v52c(text,uuid,jsonb) to anon, authenticated;
revoke execute on function public.submit_topical_practice_session_v52c(text,jsonb,jsonb) from public;
grant execute on function public.submit_topical_practice_session_v52c(text,jsonb,jsonb) to anon, authenticated;
