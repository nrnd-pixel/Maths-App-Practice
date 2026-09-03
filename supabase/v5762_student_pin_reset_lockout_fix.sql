-- V5.7.6.2 — Student PIN reset clears temporary failed-login lockout
-- Keeps the existing teacher-only PIN reset flow, but removes stale failure counters
-- for that Student ID so a newly reset PIN can be used immediately.

create or replace function public.set_student_pin(p_student_uuid uuid, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_student public.class_students;
  v_cleared integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  if coalesce(p_pin,'') !~ '^[0-9]{4,8}$' then
    raise exception 'PIN must contain 4 to 8 digits';
  end if;

  select cs.*
  into v_student
  from public.class_students cs
  where cs.id=p_student_uuid
  limit 1;

  if v_student.id is null then
    raise exception 'Student was not found';
  end if;

  update public.class_students
  set pin_hash=extensions.crypt(p_pin,extensions.gen_salt('bf')),
      pin_updated_at=now(),
      updated_at=now()
  where id=p_student_uuid;

  if nullif(trim(v_student.student_id),'') is not null then
    delete from public.student_access_failures
    where identifier_hash=extensions.digest(lower(trim(v_student.student_id)),'sha256');
    get diagnostics v_cleared = row_count;
  end if;

  return jsonb_build_object(
    'saved',true,
    'student_id',p_student_uuid,
    'pin_set',true,
    'cleared_failed_attempts',v_cleared
  );
end;
$$;

revoke all on function public.set_student_pin(uuid,text) from public,anon;
grant execute on function public.set_student_pin(uuid,text) to authenticated,service_role;
