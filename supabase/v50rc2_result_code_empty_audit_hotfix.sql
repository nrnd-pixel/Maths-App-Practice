-- V5.0RC2 launch hotfix — an empty result-code population is not a weak-code failure.
-- After a deliberate clean-start reset there may be zero saved result codes.
-- Once codes exist, every saved code must still be at least 19 characters and unique.

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
  v_result_code_count integer := 0;
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

  select count(*)::integer,
         coalesce(min(length(result_code)),0)::integer,
         (count(*)-count(distinct result_code))::integer
  into v_result_code_count,v_result_code_min_len,v_result_code_duplicates
  from public.practice_sessions
  where result_code is not null;

  v_security_ready :=
       v_forbidden_anon_functions = 0
   and v_sensitive_anon_table_grants = 0
   and v_required_student_rpc_missing = 0
   and v_assignment_missing_settings = 0
   and v_assignment_unavailable = 0
   and (v_result_code_count = 0 or v_result_code_min_len >= 19)
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
      'result_code_count',v_result_code_count,
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
      'student_api','Only the intentional pre-login student RPC surface remains anonymously executable; teacher/helper RPCs are internal or authenticated.',
      'result_code_audit','No saved result codes after a clean reset is a valid empty sample. Once codes exist, minimum length and uniqueness remain mandatory.'
    )
  );
end;
$function$;

revoke all on function public.get_teacher_release_audit_v50rc2() from public;
revoke all on function public.get_teacher_release_audit_v50rc2() from anon;
grant execute on function public.get_teacher_release_audit_v50rc2() to authenticated;
