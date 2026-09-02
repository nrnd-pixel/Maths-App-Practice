-- V5.7A cross-device completion watermarks.
-- Lets an authenticated student remove a stale same-device V5.5C fallback after
-- the same Past Paper Practice was completed successfully on another device.
-- Returns metadata only; no responses, scores, answer keys or feedback.

create or replace function public.get_student_past_paper_completion_watermarks_v57a(p_access_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ticket public.student_access_tickets;
  v_rows jsonb;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash = extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose = 'practice'
    and t.expires_at > now()
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null
     or v_ticket.roster_student_id is null
     or v_ticket.class_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  with latest as (
    select distinct on (ps.exam_year,lower(trim(ps.paper)))
      ps.exam_year,
      trim(ps.paper) as paper,
      ps.completed_at
    from public.practice_sessions ps
    where ps.roster_student_id = v_ticket.roster_student_id
      and ps.class_id = v_ticket.class_id
      and ps.practice_mode = 'past_paper'
      and coalesce(ps.ended_early,false) = false
      and ps.exam_year is not null
      and nullif(trim(coalesce(ps.paper,'')),'') is not null
    order by ps.exam_year,lower(trim(ps.paper)),ps.completed_at desc,ps.id desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'examYear', exam_year,
    'paper', paper,
    'completedAt', completed_at
  ) order by completed_at desc),'[]'::jsonb)
  into v_rows
  from latest;

  return jsonb_build_object(
    'student',jsonb_build_object(
      'student_name',v_ticket.student_name,
      'student_id',v_ticket.student_id,
      'year_level',v_ticket.year_level,
      'class_name',v_ticket.class_group
    ),
    'completions',coalesce(v_rows,'[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_student_past_paper_completion_watermarks_v57a(text) from public;
grant execute on function public.get_student_past_paper_completion_watermarks_v57a(text) to anon, authenticated;
