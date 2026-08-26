-- Maths Practice V5.0RC1 — Functional Regression Audit
-- Read-only release-candidate diagnostics plus one derived-count repair.
-- Does not alter answers, marks, attempts, roster identities, PINs or grading logic.

-- Repair any legacy drift in the cached pending-review count from the authoritative
-- session_answers rows. This is derived metadata only.
with actual as (
  select
    ps.id as session_id,
    count(sa.id) filter (where sa.review_status = 'pending')::integer as pending_count
  from public.practice_sessions ps
  left join public.session_answers sa on sa.session_id = ps.id
  group by ps.id
)
update public.practice_sessions ps
set pending_review_count = actual.pending_count
from actual
where ps.id = actual.session_id
  and coalesce(ps.pending_review_count,0) is distinct from actual.pending_count;

-- Reassert the existing synchronization trigger so future manual-review updates
-- keep the cached session count aligned with the answer rows.
create or replace function public.sync_session_pending_review_count()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_session_id uuid;
begin
  if tg_op = 'DELETE' then
    v_session_id := old.session_id;
  else
    v_session_id := new.session_id;
  end if;

  update public.practice_sessions s
  set pending_review_count = (
    select count(*)::integer
    from public.session_answers a
    where a.session_id = v_session_id
      and a.review_status = 'pending'
  )
  where s.id = v_session_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_pending_review_count on public.session_answers;
create trigger sync_pending_review_count
after insert or delete or update of review_status on public.session_answers
for each row execute function public.sync_session_pending_review_count();

create or replace function public.get_teacher_release_audit_v50rc1()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_active_exam_papers integer := 0;
  v_configured_exam_papers integer := 0;
  v_available_exam_papers integer := 0;
  v_missing_exam_settings_count integer := 0;
  v_missing_exam_settings jsonb := '[]'::jsonb;
  v_pending_review_mismatches integer := 0;
  v_exam_link_issues integer := 0;
  v_practice_assignment_link_issues integer := 0;
  v_answer_marks_out_of_bounds integer := 0;
  v_overdue_in_progress_exams integer := 0;
  v_duplicate_active_student_ids integer := 0;
  v_legacy_registered_exam_missing_class integer := 0;
  v_functional_ready boolean := false;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  with active_papers as (
    select distinct q.year_level, q.exam_year, trim(q.paper) as paper
    from public.questions q
    where q.active = true
      and q.exam_year is not null
      and nullif(trim(q.paper),'') is not null
  )
  select count(*)::integer,
         count(*) filter (where exists (
           select 1
           from public.exam_paper_settings eps
           where eps.year_level = ap.year_level
             and eps.exam_year = ap.exam_year
             and lower(trim(eps.paper)) = lower(ap.paper)
         ))::integer,
         count(*) filter (where exists (
           select 1
           from public.exam_paper_settings eps
           where eps.year_level = ap.year_level
             and eps.exam_year = ap.exam_year
             and lower(trim(eps.paper)) = lower(ap.paper)
             and eps.is_available = true
         ))::integer
  into v_active_exam_papers, v_configured_exam_papers, v_available_exam_papers
  from active_papers ap;

  with active_papers as (
    select distinct q.year_level, q.exam_year, trim(q.paper) as paper
    from public.questions q
    where q.active = true
      and q.exam_year is not null
      and nullif(trim(q.paper),'') is not null
  ), missing as (
    select ap.year_level, ap.exam_year, ap.paper
    from active_papers ap
    where not exists (
      select 1
      from public.exam_paper_settings eps
      where eps.year_level = ap.year_level
        and eps.exam_year = ap.exam_year
        and lower(trim(eps.paper)) = lower(ap.paper)
    )
  )
  select count(*)::integer,
         coalesce(jsonb_agg(jsonb_build_object(
           'year_level', m.year_level,
           'exam_year', m.exam_year,
           'paper', m.paper
         ) order by m.year_level, m.exam_year desc, m.paper), '[]'::jsonb)
  into v_missing_exam_settings_count, v_missing_exam_settings
  from missing m;

  select count(*)::integer
  into v_pending_review_mismatches
  from (
    select ps.id
    from public.practice_sessions ps
    left join public.session_answers sa on sa.session_id = ps.id
    group by ps.id, ps.pending_review_count
    having coalesce(ps.pending_review_count,0)
      <> count(sa.id) filter (where sa.review_status = 'pending')
  ) mismatches;

  select (
      (select count(*) from public.exam_attempts ea
       where ea.practice_session_id is not null
         and not exists (select 1 from public.practice_sessions ps where ps.id = ea.practice_session_id))
    + (select count(*) from public.practice_sessions ps
       where ps.exam_attempt_id is not null
         and not exists (select 1 from public.exam_attempts ea where ea.id = ps.exam_attempt_id))
    + (select count(*) from public.exam_attempts ea
       join public.practice_sessions ps on ps.id = ea.practice_session_id
       where ps.exam_attempt_id is distinct from ea.id)
  )::integer into v_exam_link_issues;

  select (
      (select count(*) from public.practice_assignment_attempts paa
       where not exists (select 1 from public.practice_assignments pa where pa.id = paa.assignment_id))
    + (select count(*) from public.practice_assignment_attempts paa
       where paa.practice_session_id is not null
         and not exists (select 1 from public.practice_sessions ps where ps.id = paa.practice_session_id))
    + (select count(*) from public.practice_assignment_attempts paa
       join public.practice_assignments pa on pa.id = paa.assignment_id
       join public.class_students cs on cs.id = paa.roster_student_id
       where pa.class_id <> cs.class_id)
  )::integer into v_practice_assignment_link_issues;

  select count(*)::integer
  into v_answer_marks_out_of_bounds
  from public.session_answers sa
  where sa.marks_awarded is not null
    and (sa.marks_awarded < 0 or sa.marks_awarded > sa.marks_possible);

  select count(*)::integer
  into v_overdue_in_progress_exams
  from public.exam_attempts ea
  where ea.status = 'in_progress'
    and ea.deadline_at is not null
    and ea.deadline_at < now();

  select count(*)::integer
  into v_duplicate_active_student_ids
  from (
    select lower(trim(cs.student_id))
    from public.class_students cs
    join public.school_classes sc on sc.id = cs.class_id
    where cs.active = true and sc.active = true
      and nullif(trim(cs.student_id),'') is not null
    group by lower(trim(cs.student_id))
    having count(*) > 1
  ) duplicates;

  -- Historical warning only. Current V3 secure Exam creation/resume writes class_id
  -- from the verified student access ticket. Old test history can legitimately predate it.
  select count(*)::integer
  into v_legacy_registered_exam_missing_class
  from public.exam_attempts ea
  where ea.roster_student_id is not null
    and ea.class_id is null;

  v_functional_ready :=
       v_active_exam_papers > 0
   and v_configured_exam_papers = v_active_exam_papers
   and v_available_exam_papers > 0
   and v_pending_review_mismatches = 0
   and v_exam_link_issues = 0
   and v_practice_assignment_link_issues = 0
   and v_answer_marks_out_of_bounds = 0
   and v_overdue_in_progress_exams = 0
   and v_duplicate_active_student_ids = 0;

  return jsonb_build_object(
    'phase', 'V5.0RC1',
    'functional_ready', v_functional_ready,
    'generated_at', now(),
    'summary', jsonb_build_object(
      'active_exam_papers', v_active_exam_papers,
      'configured_exam_papers', v_configured_exam_papers,
      'available_exam_papers', v_available_exam_papers,
      'missing_exam_settings_count', v_missing_exam_settings_count,
      'pending_review_count_mismatches', v_pending_review_mismatches,
      'exam_result_link_issues', v_exam_link_issues,
      'practice_assignment_link_issues', v_practice_assignment_link_issues,
      'answer_marks_out_of_bounds', v_answer_marks_out_of_bounds,
      'overdue_in_progress_exams', v_overdue_in_progress_exams,
      'duplicate_active_student_id_groups', v_duplicate_active_student_ids,
      'legacy_registered_exam_attempts_missing_class_id', v_legacy_registered_exam_missing_class
    ),
    'missing_exam_settings', v_missing_exam_settings,
    'notes', jsonb_build_object(
      'legacy_class_id_warning', 'Historical registered Exam attempts without class_id are reported as a warning only. Current secure Exam creation/resume writes class_id from the verified access ticket.',
      'exam_configuration', 'RC1 requires every active Exam paper to have an explicit Exam Settings row and at least one configured paper to be available.'
    )
  );
end;
$$;

revoke all on function public.get_teacher_release_audit_v50rc1() from public;
revoke all on function public.get_teacher_release_audit_v50rc1() from anon;
grant execute on function public.get_teacher_release_audit_v50rc1() to authenticated;
