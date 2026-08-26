-- V5.0RC2 — Security & launch configuration audit/hardening.
-- Keeps legitimate anonymous student RPCs, removes unnecessary direct exposure,
-- and makes Exam availability/configuration explicit at the server boundary.

-- 1) Student class options remain public pre-login metadata, but inactive classes
-- must not be advertised and the function uses an empty search_path.
create or replace function public.get_student_class_options()
returns table(class_name text, year_level integer)
language sql
security definer
set search_path to ''
as $function$
  select sc.name::text, sc.year_level::integer
  from public.school_classes sc
  where sc.active = true
  order by sc.year_level, sc.name;
$function$;

-- 2) Only explicitly configured + available Exam papers are advertised to students.
create or replace function public.get_available_exam_papers(p_year_level smallint)
returns table(exam_year smallint, paper text, question_number text, parent_question_number text, marks numeric)
language sql
stable
security definer
set search_path to ''
as $function$
  select q.exam_year::smallint,q.paper::text,q.question_number::text,
    q.parent_question_number::text,q.marks::numeric
  from public.questions q
  join public.exam_paper_settings s
    on s.year_level = q.year_level
   and s.exam_year = q.exam_year
   and lower(trim(s.paper)) = lower(trim(q.paper))
   and s.is_available = true
  where q.active
    and q.year_level = p_year_level
    and q.exam_year is not null
    and trim(coalesce(q.paper,'')) <> '';
$function$;

-- 3) The redacted student question RPC remains the only student question path.
-- Practice may draw from the whole active year-level bank. Exam requests additionally
-- require an explicit available Exam Settings row.
create or replace function public.get_student_questions(
  p_access_token text,
  p_year_level smallint,
  p_exam_year smallint default null,
  p_paper text default null
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
     or (p_exam_year is null and v_ticket.purpose <> 'practice')
     or (p_exam_year is not null and v_ticket.purpose <> 'exam') then
    raise exception 'Student access could not be verified';
  end if;

  if p_exam_year is not null then
    if nullif(trim(coalesce(p_paper,'')),'') is null
       or not exists (
         select 1
         from public.exam_paper_settings s
         where s.year_level = v_ticket.year_level
           and s.exam_year = p_exam_year
           and lower(trim(s.paper)) = lower(trim(p_paper))
           and s.is_available = true
       ) then
      raise exception 'This exam paper is not currently available';
    end if;
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
  where q.active
    and q.year_level = p_year_level
    and (p_exam_year is null or q.exam_year = p_exam_year)
    and (p_paper is null or lower(trim(q.paper)) = lower(trim(p_paper)));
end;
$function$;

-- 4) New Exam starts must use server-owned explicit paper settings. Existing same-device
-- attempts retain the established resume behavior; no student-provided timing/release values
-- are trusted for a new attempt.
create or replace function public.start_or_resume_exam_attempt_v3(
  p_access_token text,
  p_client_attempt_key text,
  p_resume_token text,
  p_student_name text,
  p_student_id text,
  p_year_level smallint,
  p_class_group text,
  p_exam_year smallint,
  p_paper text,
  p_duration_minutes integer,
  p_answer_release_rule text,
  p_question_count integer
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_existing public.exam_attempts;
  v_resume public.exam_attempts;
  v_attempt public.exam_attempts;
  v_ticket public.student_access_tickets;
  v_result jsonb;
  v_access jsonb;
  v_duration integer;
  v_release text;
  v_available boolean;
  v_question_count integer;
begin
  select a.* into v_existing
  from public.exam_attempts a
  where a.client_attempt_key = trim(p_client_attempt_key)
  limit 1;

  if v_existing.id is not null then
    return public.start_or_resume_exam_attempt(
      p_client_attempt_key,p_resume_token,p_student_name,p_student_id,p_year_level,
      p_class_group,p_exam_year,p_paper,v_existing.duration_minutes,
      v_existing.answer_release_rule,v_existing.question_count
    );
  end if;

  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash = extensions.digest(trim(coalesce(p_access_token,'')), 'sha256')
    and t.purpose = 'exam'
    and t.used_at is null
    and t.expires_at > now()
  order by t.created_at desc
  limit 1
  for update;

  if v_ticket.id is null or v_ticket.year_level <> p_year_level then
    raise exception 'Student access could not be verified';
  end if;

  select s.duration_minutes,s.answer_release_rule,s.is_available
  into v_duration,v_release,v_available
  from public.exam_paper_settings s
  where s.year_level = v_ticket.year_level
    and s.exam_year = p_exam_year
    and lower(trim(s.paper)) = lower(trim(p_paper))
  limit 1;

  if not found then
    raise exception 'Exam paper settings must be configured before this paper can be started';
  end if;
  if v_available is not true then
    raise exception 'This exam paper is not currently available';
  end if;
  v_release := coalesce(v_release,'immediate');

  select count(distinct coalesce(
    nullif(trim(q.parent_question_number),''),
    nullif(trim(q.question_number),''),
    q.id::text
  ))
  into v_question_count
  from public.questions q
  where q.active
    and q.year_level = v_ticket.year_level
    and q.exam_year = p_exam_year
    and lower(trim(q.paper)) = lower(trim(p_paper));

  if v_question_count = 0 then
    raise exception 'No active questions were found for this paper';
  end if;

  v_access := jsonb_build_object(
    'student_name',v_ticket.student_name,
    'student_id',v_ticket.student_id,
    'class_name',v_ticket.class_group,
    'year_level',v_ticket.year_level,
    'roster_student_id',v_ticket.roster_student_id,
    'registered',(v_ticket.roster_student_id is not null)
  );

  if v_ticket.roster_student_id is not null then
    select a.* into v_resume
    from public.exam_attempts a
    where a.roster_student_id = v_ticket.roster_student_id
      and a.year_level = v_ticket.year_level
      and a.exam_year = p_exam_year
      and lower(trim(a.paper)) = lower(trim(p_paper))
      and a.status = 'in_progress'
    order by a.started_at desc
    limit 1
    for update;

    if v_resume.id is not null then
      update public.exam_attempts a
      set client_attempt_key = trim(p_client_attempt_key),
          resume_token_hash = extensions.digest(trim(p_resume_token),'sha256'),
          student_name = v_ticket.student_name,
          student_id = v_ticket.student_id,
          class_id = coalesce(v_ticket.class_id,a.class_id),
          class_group = v_ticket.class_group,
          updated_at = now()
      where a.id = v_resume.id
      returning * into v_resume;

      update public.student_access_tickets set used_at = now() where id = v_ticket.id;
      return public.exam_attempt_json(v_resume,true)
        || jsonb_build_object('access',v_access,'secure_reauthenticated_resume',true);
    end if;
  end if;

  v_result := public.start_or_resume_exam_attempt(
    p_client_attempt_key,p_resume_token,v_ticket.student_name,v_ticket.student_id,
    v_ticket.year_level,v_ticket.class_group,p_exam_year,p_paper,
    v_duration,v_release,v_question_count
  );

  if coalesce((v_result->>'duplicate')::boolean,false) or v_result->>'id' is null then
    return v_result;
  end if;

  update public.exam_attempts
  set roster_student_id = coalesce(v_ticket.roster_student_id,roster_student_id),
      class_id = coalesce(v_ticket.class_id,class_id),
      student_name = v_ticket.student_name,
      student_id = v_ticket.student_id,
      year_level = v_ticket.year_level,
      class_group = v_ticket.class_group,
      duration_minutes = v_duration,
      answer_release_rule = v_release,
      question_count = v_question_count,
      deadline_at = case when v_duration is null then null else started_at + make_interval(mins=>v_duration) end,
      updated_at = now()
  where id = (v_result->>'id')::uuid
  returning * into v_attempt;

  update public.student_access_tickets set used_at = now() where id = v_ticket.id;
  v_access := v_access || jsonb_build_object('class_id',v_ticket.class_id);
  return public.exam_attempt_json(v_attempt,false) || jsonb_build_object('access',v_access);
end;
$function$;

-- 5) Remove unnecessary direct anonymous table privileges. Student writes/reads continue
-- through SECURITY DEFINER RPCs. Exam settings remain intentionally readable because the
-- current pre-login UI uses them only for timer/release presentation.
revoke all on table public.school_classes from anon;
revoke all on table public.class_students from anon;
revoke all on table public.questions from anon;
revoke all on table public.app_access_settings from anon;
revoke all on table public.practice_sessions from anon;
revoke all on table public.session_answers from anon;
revoke all on table public.exam_attempts from anon;
revoke all on table public.student_access_tickets from anon;
revoke all on table public.student_access_failures from anon;
revoke all on table public.practice_assignments from anon;
revoke all on table public.practice_assignment_attempts from anon;
revoke all on table public.practice_assignment_recipients from anon;
revoke all on table public.exam_assignments from anon;
revoke all on table public.report_archives from anon;
revoke all on table public.student_launch_reset_log from anon;
revoke all on table public.teacher_operations_log from anon;
revoke all on table public.exam_paper_settings from anon;
grant select on table public.exam_paper_settings to anon;

-- 6) Teacher-only controls do not need anonymous EXECUTE.
revoke all on function public.save_student_access_mode(text) from anon;
revoke all on function public.set_student_pin(uuid,text) from anon;
revoke all on function public.is_teacher() from anon;

-- 7) Internal helpers/trigger functions are callable only by their owning server-side
-- functions/triggers, not directly through /rpc.
revoke all on function public.get_student_exam_access(text,smallint,smallint,text) from anon, authenticated;
revoke all on function public.apply_exam_roster_identity() from anon, authenticated;
revoke all on function public.exam_attempt_json(public.exam_attempts,boolean) from anon, authenticated;
revoke all on function public.sync_session_pending_review_count() from anon, authenticated;
revoke all on function public.make_result_code() from anon, authenticated;
revoke all on function public.set_updated_at() from anon, authenticated;
revoke all on function public.set_exam_paper_settings_updated_at() from anon, authenticated;

-- 8) Explicitly preserve the intentional pre-login student API surface.
grant execute on function public.get_student_access_policy() to anon;
grant execute on function public.get_student_class_options() to anon;
grant execute on function public.get_available_exam_papers(smallint) to anon;
grant execute on function public.validate_student_access(text,text,text,text,smallint,text) to anon;
grant execute on function public.get_student_questions(text,smallint,smallint,text) to anon;
grant execute on function public.grade_practice_response_v3(text,uuid,jsonb) to anon;
grant execute on function public.request_practice_hint_v3(text,uuid) to anon;
grant execute on function public.submit_practice_session_v3(text,jsonb,jsonb) to anon;
grant execute on function public.start_or_resume_exam_attempt_v3(text,text,text,text,text,smallint,text,smallint,text,integer,text,integer) to anon;
grant execute on function public.save_exam_attempt(uuid,text,jsonb,jsonb,integer,integer,integer,integer) to anon;
grant execute on function public.finalize_exam_attempt(uuid,text,text,jsonb,jsonb) to anon;
grant execute on function public.get_student_review(text) to anon;
grant execute on function public.get_student_assignments(text) to anon;
grant execute on function public.get_student_practice_assignments(text) to anon;
grant execute on function public.start_student_practice_assignment(text,uuid) to anon;
grant execute on function public.complete_student_practice_assignment(text,uuid,text) to anon;
grant execute on function public.get_student_learning_dashboard(text) to anon;
grant execute on function public.get_student_practice_recommendation(text) to anon;
grant execute on function public.get_student_motivation(text) to anon;
grant execute on function public.get_student_motivation_messages(text) to anon;
grant execute on function public.mark_student_motivation_message_read(text,uuid) to anon;
grant execute on function public.get_student_ai_help_status(text,text) to anon;

-- 9) Teacher-only RC2 diagnostics. This RPC is read-only and intentionally separates
-- security hardening status from launch-preparation actions that can be completed later.
create or replace function public.get_teacher_release_audit_v50rc2()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_launch jsonb;
  v_rc1 jsonb;
  v_forbidden_anon_functions integer := 0;
  v_sensitive_anon_table_grants integer := 0;
  v_required_student_rpc_missing integer := 0;
  v_assignment_missing_settings integer := 0;
  v_assignment_unavailable integer := 0;
  v_result_code_min_len integer := 0;
  v_result_code_duplicates integer := 0;
  v_security_ready boolean := false;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  v_launch := public.get_teacher_launch_readiness_v50d1();
  v_rc1 := public.get_teacher_release_audit_v50rc1();

  select count(*)::integer into v_forbidden_anon_functions
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = any(array[
      'save_student_access_mode','set_student_pin','get_student_exam_access',
      'apply_exam_roster_identity','exam_attempt_json','sync_session_pending_review_count',
      'make_result_code','set_updated_at','set_exam_paper_settings_updated_at'
    ])
    and has_function_privilege('anon',p.oid,'EXECUTE');

  select count(*)::integer into v_sensitive_anon_table_grants
  from (values
    ('public.school_classes'),('public.class_students'),('public.questions'),
    ('public.app_access_settings'),('public.practice_sessions'),('public.session_answers'),
    ('public.exam_attempts'),('public.student_access_tickets'),('public.student_access_failures'),
    ('public.practice_assignments'),('public.practice_assignment_attempts'),
    ('public.practice_assignment_recipients'),('public.exam_assignments'),('public.report_archives'),
    ('public.student_launch_reset_log'),('public.teacher_operations_log')
  ) as t(name)
  where has_table_privilege('anon',t.name,'SELECT')
     or has_table_privilege('anon',t.name,'INSERT')
     or has_table_privilege('anon',t.name,'UPDATE')
     or has_table_privilege('anon',t.name,'DELETE');

  select count(*)::integer into v_required_student_rpc_missing
  from (values
    ('get_student_access_policy',''),
    ('get_student_class_options',''),
    ('get_available_exam_papers','p_year_level smallint'),
    ('validate_student_access','p_student_id text, p_pin text, p_purpose text, p_display_name text, p_selected_year smallint, p_class_group text'),
    ('get_student_questions','p_access_token text, p_year_level smallint, p_exam_year smallint, p_paper text'),
    ('grade_practice_response_v3','p_access_token text, p_question_id uuid, p_response jsonb'),
    ('request_practice_hint_v3','p_access_token text, p_question_id uuid'),
    ('submit_practice_session_v3','p_access_token text, p_session jsonb, p_answers jsonb'),
    ('start_or_resume_exam_attempt_v3','p_access_token text, p_client_attempt_key text, p_resume_token text, p_student_name text, p_student_id text, p_year_level smallint, p_class_group text, p_exam_year smallint, p_paper text, p_duration_minutes integer, p_answer_release_rule text, p_question_count integer'),
    ('save_exam_attempt','p_attempt_id uuid, p_resume_token text, p_response_state jsonb, p_flags jsonb, p_current_question_index integer, p_answered_item_count integer, p_answered_part_count integer, p_flagged_count integer'),
    ('finalize_exam_attempt','p_attempt_id uuid, p_resume_token text, p_submission_type text, p_session jsonb, p_answers jsonb'),
    ('get_student_review','p_result_code text')
  ) required(name,args)
  where not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname=required.name
      and pg_get_function_identity_arguments(p.oid)=required.args
      and has_function_privilege('anon',p.oid,'EXECUTE')
  );

  select
    count(*) filter (where s.year_level is null)::integer,
    count(*) filter (where s.year_level is not null and s.is_available is not true)::integer
  into v_assignment_missing_settings,v_assignment_unavailable
  from public.exam_assignments ea
  join public.school_classes sc on sc.id=ea.class_id
  left join public.exam_paper_settings s
    on s.year_level=sc.year_level
   and s.exam_year=ea.exam_year
   and lower(trim(s.paper))=lower(trim(ea.paper))
  where ea.active=true;

  select coalesce(min(length(result_code)),0)::integer,
         (count(*)-count(distinct result_code))::integer
  into v_result_code_min_len,v_result_code_duplicates
  from public.practice_sessions
  where result_code is not null;

  v_security_ready :=
       v_forbidden_anon_functions = 0
   and v_sensitive_anon_table_grants = 0
   and v_required_student_rpc_missing = 0
   and v_assignment_missing_settings = 0
   and v_assignment_unavailable = 0
   and v_result_code_min_len >= 19
   and v_result_code_duplicates = 0
   and coalesce(v_launch->>'access_mode','') = 'student_pin';

  return jsonb_build_object(
    'phase','V5.0RC2',
    'generated_at',now(),
    'security_ready',v_security_ready,
    'summary',jsonb_build_object(
      'forbidden_anon_function_exposures',v_forbidden_anon_functions,
      'sensitive_anon_table_grants',v_sensitive_anon_table_grants,
      'required_student_rpc_missing',v_required_student_rpc_missing,
      'active_exam_assignments_missing_settings',v_assignment_missing_settings,
      'active_exam_assignments_unavailable',v_assignment_unavailable,
      'result_code_min_length',v_result_code_min_len,
      'result_code_duplicates',v_result_code_duplicates,
      'access_mode',v_launch->>'access_mode',
      'pin_missing',coalesce((v_launch->>'pin_missing')::integer,0),
      'history_total',coalesce((v_launch->>'history_total')::integer,0),
      'possible_test_students_count',coalesce((v_launch->>'possible_test_students_count')::integer,0),
      'missing_exam_settings_count',coalesce((v_rc1->'summary'->>'missing_exam_settings_count')::integer,0)
    ),
    'manual_platform_checks',jsonb_build_array(
      'Enable Supabase leaked-password protection before public launch.',
      'Protect the GitHub main branch/ruleset and require V5 Regression Safety before final release merges.'
    ),
    'notes',jsonb_build_object(
      'launch_actions','PIN generation, clean-start reset/test-data cleanup and deferred Exam Settings can be completed later before final V5.0 sign-off.',
      'exam_boundary','Unconfigured or unavailable papers are no longer advertised to students and cannot be fetched/started as new Exam attempts.',
      'student_api','Only the intentional pre-login student RPC surface remains anonymously executable; teacher/helper RPCs are internal or authenticated.'
    )
  );
end;
$function$;

revoke all on function public.get_teacher_release_audit_v50rc2() from public;
revoke all on function public.get_teacher_release_audit_v50rc2() from anon;
grant execute on function public.get_teacher_release_audit_v50rc2() to authenticated;
