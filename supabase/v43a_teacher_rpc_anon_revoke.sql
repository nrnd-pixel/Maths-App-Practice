-- Maths Practice V4.3A security follow-up.
-- Teacher assignment creation must not be executable by anonymous clients.

revoke all on function public.create_teacher_practice_assignment_v43(
  uuid,text,text,integer,timestamptz,timestamptz,uuid
) from public;
revoke all on function public.create_teacher_practice_assignment_v43(
  uuid,text,text,integer,timestamptz,timestamptz,uuid
) from anon;
grant execute on function public.create_teacher_practice_assignment_v43(
  uuid,text,text,integer,timestamptz,timestamptz,uuid
) to authenticated;
