-- V5.7.1A — Student Gamification Foundation
-- Read-only, token-gated XP + level summary derived from already completed Practice.
-- No gamification ledger/table is added in this first phase, so duplicate XP writes
-- are impossible. Exam sessions do not earn XP and no answer keys are returned.

create or replace function public.get_student_gamification_v571a(p_access_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_ticket public.student_access_tickets;
  v_first_try_correct integer := 0;
  v_second_try_correct integer := 0;
  v_completed_sessions integer := 0;
  v_completed_past_papers integer := 0;
  v_completed_assignments integer := 0;
  v_answer_xp integer := 0;
  v_session_xp integer := 0;
  v_past_paper_xp integer := 0;
  v_assignment_xp integer := 0;
  v_total_xp integer := 0;
  v_level integer := 1;
  v_level_title text := 'Maths Starter';
  v_level_start_xp integer := 0;
  v_next_level_xp integer := 100;
  v_progress integer := 0;
begin
  select t.*
  into v_ticket
  from public.student_access_tickets t
  where t.token_hash = extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.expires_at > now()
    and t.roster_student_id is not null
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null or v_ticket.roster_student_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  select
    count(*) filter (where sa.correct and sa.first_try),
    count(*) filter (where sa.correct and not sa.first_try)
  into v_first_try_correct, v_second_try_correct
  from public.session_answers sa
  join public.practice_sessions ps on ps.id = sa.session_id
  where ps.roster_student_id = v_ticket.roster_student_id
    and ps.practice_mode <> 'exam';

  select
    count(*) filter (where not ps.ended_early and ps.total > 0),
    count(*) filter (
      where not ps.ended_early
        and ps.total > 0
        and (
          ps.practice_mode = 'past_paper'
          or (ps.exam_year is not null and nullif(trim(ps.paper),'') is not null)
        )
    )
  into v_completed_sessions, v_completed_past_papers
  from public.practice_sessions ps
  where ps.roster_student_id = v_ticket.roster_student_id
    and ps.practice_mode <> 'exam';

  select count(*)
  into v_completed_assignments
  from public.practice_assignment_attempts paa
  where paa.roster_student_id = v_ticket.roster_student_id
    and paa.status = 'completed';

  v_answer_xp := (coalesce(v_first_try_correct,0) * 10) + (coalesce(v_second_try_correct,0) * 6);
  v_session_xp := coalesce(v_completed_sessions,0) * 10;
  v_past_paper_xp := coalesce(v_completed_past_papers,0) * 20;
  v_assignment_xp := coalesce(v_completed_assignments,0) * 20;
  v_total_xp := v_answer_xp + v_session_xp + v_past_paper_xp + v_assignment_xp;

  if v_total_xp >= 900 then
    v_level := 5;
    v_level_title := 'Maths Master';
    v_level_start_xp := 900;
    v_next_level_xp := null;
    v_progress := 100;
  elsif v_total_xp >= 500 then
    v_level := 4;
    v_level_title := 'Maths Challenger';
    v_level_start_xp := 500;
    v_next_level_xp := 900;
    v_progress := round(100.0 * (v_total_xp - 500) / 400)::integer;
  elsif v_total_xp >= 250 then
    v_level := 3;
    v_level_title := 'Problem Solver';
    v_level_start_xp := 250;
    v_next_level_xp := 500;
    v_progress := round(100.0 * (v_total_xp - 250) / 250)::integer;
  elsif v_total_xp >= 100 then
    v_level := 2;
    v_level_title := 'Number Explorer';
    v_level_start_xp := 100;
    v_next_level_xp := 250;
    v_progress := round(100.0 * (v_total_xp - 100) / 150)::integer;
  else
    v_level := 1;
    v_level_title := 'Maths Starter';
    v_level_start_xp := 0;
    v_next_level_xp := 100;
    v_progress := least(100, greatest(0, v_total_xp));
  end if;

  return jsonb_build_object(
    'student', jsonb_build_object(
      'student_name', v_ticket.student_name,
      'student_id', v_ticket.student_id,
      'year_level', v_ticket.year_level,
      'class_name', v_ticket.class_group
    ),
    'xp', jsonb_build_object(
      'total', v_total_xp,
      'answer_xp', v_answer_xp,
      'session_bonus_xp', v_session_xp,
      'past_paper_bonus_xp', v_past_paper_xp,
      'assignment_bonus_xp', v_assignment_xp
    ),
    'level', jsonb_build_object(
      'number', v_level,
      'title', v_level_title,
      'start_xp', v_level_start_xp,
      'next_level_xp', v_next_level_xp,
      'progress_percent', least(100,greatest(0,v_progress))
    ),
    'activity', jsonb_build_object(
      'first_try_correct', coalesce(v_first_try_correct,0),
      'second_try_correct', coalesce(v_second_try_correct,0),
      'completed_sessions', coalesce(v_completed_sessions,0),
      'completed_past_papers', coalesce(v_completed_past_papers,0),
      'completed_assignments', coalesce(v_completed_assignments,0)
    ),
    'rules', jsonb_build_object(
      'first_try_correct_xp', 10,
      'second_try_correct_xp', 6,
      'completed_session_xp', 10,
      'past_paper_extra_xp', 20,
      'completed_assignment_xp', 20
    )
  );
end;
$function$;

revoke all on function public.get_student_gamification_v571a(text) from public;
grant execute on function public.get_student_gamification_v571a(text) to anon, authenticated;
