-- Platform V0.1 — Year launch credential preparation.
-- Applied to the shared Learning Platform database on 2026-09-02.
-- Purpose: allow an authenticated teacher to prepare one-time PIN lists for
-- inactive staged classes without activating those classes.

create or replace function public.teacher_year_launch_overview_v01(p_year_level smallint)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_classes jsonb;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  if p_year_level is null or p_year_level not between 1 and 6 then
    raise exception 'Invalid year level';
  end if;

  with class_rows as (
    select
      sc.id,
      sc.name,
      sc.year_level,
      sc.active,
      count(cs.id) filter (where cs.active) as active_students,
      count(cs.id) filter (where cs.active and cs.pin_hash is null) as missing_pins,
      rm.is_allowed as maths_allowed,
      rm.access_source as maths_source,
      rs.is_allowed as science_allowed,
      rs.access_source as science_source
    from public.school_classes sc
    left join public.class_students cs on cs.class_id=sc.id
    cross join lateral private.platform_resolve_subject_access(null,sc.id,'maths') rm
    cross join lateral private.platform_resolve_subject_access(null,sc.id,'science') rs
    where sc.year_level=p_year_level
    group by sc.id,sc.name,sc.year_level,sc.active,
             rm.is_allowed,rm.access_source,rs.is_allowed,rs.access_source
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'class_id',id,
    'class_name',name,
    'year_level',year_level,
    'active',active,
    'active_students',active_students,
    'missing_pins',missing_pins,
    'credentials_ready',(active_students>0 and missing_pins=0),
    'maths_allowed',maths_allowed,
    'maths_source',maths_source,
    'science_allowed',science_allowed,
    'science_source',science_source
  ) order by name),'[]'::jsonb)
  into v_classes
  from class_rows;

  return jsonb_build_object(
    'year_level',p_year_level,
    'classes',coalesce(v_classes,'[]'::jsonb)
  );
end;
$$;

revoke all on function public.teacher_year_launch_overview_v01(smallint) from public, anon;
grant execute on function public.teacher_year_launch_overview_v01(smallint) to authenticated, service_role;

create or replace function public.teacher_generate_class_pins_v01(
  p_class_id uuid,
  p_digits smallint default 6
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_class public.school_classes;
  v_student record;
  v_random bigint;
  v_floor bigint;
  v_span bigint;
  v_pin text;
  v_rows jsonb := '[]'::jsonb;
  v_count integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  if p_digits is null or p_digits < 4 or p_digits > 6 then
    raise exception 'PIN length must be between 4 and 6 digits';
  end if;

  select sc.* into v_class
  from public.school_classes sc
  where sc.id=p_class_id
  limit 1;

  if v_class.id is null then
    raise exception 'Class not found';
  end if;

  if v_class.active then
    raise exception 'Launch PIN generation is allowed only while the class is inactive';
  end if;

  v_floor := power(10,p_digits - 1)::bigint;
  v_span := 9 * v_floor;

  for v_student in
    select cs.id,cs.student_id,cs.student_name
    from public.class_students cs
    where cs.class_id=p_class_id
      and cs.active
      and cs.pin_hash is null
    order by cs.student_name,cs.student_id
    for update
  loop
    v_random := (('x' || encode(extensions.gen_random_bytes(4),'hex'))::bit(32)::bigint);
    v_pin := (v_floor + (v_random % v_span))::text;

    update public.class_students
    set pin_hash=extensions.crypt(v_pin,extensions.gen_salt('bf')),
        pin_updated_at=now(),
        updated_at=now()
    where id=v_student.id
      and pin_hash is null;

    if found then
      v_count := v_count + 1;
      v_rows := v_rows || jsonb_build_array(jsonb_build_object(
        'roster_student_id',v_student.id,
        'class_name',v_class.name,
        'student_id',v_student.student_id,
        'student_name',v_student.student_name,
        'pin',v_pin
      ));
    end if;
  end loop;

  insert into public.teacher_operations_log(operation,entity_type,entity_id,details)
  values(
    'generate_inactive_class_pins_v01',
    'school_class',
    p_class_id,
    jsonb_build_object(
      'class_name',v_class.name,
      'year_level',v_class.year_level,
      'generated_count',v_count,
      'pin_digits',p_digits
    )
  );

  return jsonb_build_object(
    'generated',true,
    'class_id',v_class.id,
    'class_name',v_class.name,
    'year_level',v_class.year_level,
    'generated_count',v_count,
    'pin_digits',p_digits,
    'pins',v_rows,
    'class_remains_inactive',true,
    'message',case when v_count>0
      then 'PINs were generated for this inactive class. Plain-text PINs are returned only in this response; the database stores hashes only.'
      else 'No missing PINs were found for this class.' end
  );
end;
$$;

revoke all on function public.teacher_generate_class_pins_v01(uuid,smallint) from public, anon;
grant execute on function public.teacher_generate_class_pins_v01(uuid,smallint) to authenticated, service_role;

create or replace function public.teacher_generate_year_pins_v01(
  p_year_level smallint,
  p_digits smallint default 6
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_class record;
  v_result jsonb;
  v_rows jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_class_count integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  if p_year_level is null or p_year_level not between 1 and 6 then
    raise exception 'Invalid year level';
  end if;

  if p_digits is null or p_digits < 4 or p_digits > 6 then
    raise exception 'PIN length must be between 4 and 6 digits';
  end if;

  if not exists (
    select 1
    from public.school_classes sc
    where sc.year_level=p_year_level
      and not sc.active
  ) then
    raise exception 'No inactive classes were found for this year level';
  end if;

  for v_class in
    select sc.id,sc.name
    from public.school_classes sc
    where sc.year_level=p_year_level
      and not sc.active
    order by sc.name
    for update
  loop
    v_result := public.teacher_generate_class_pins_v01(v_class.id,p_digits);
    v_class_count := v_class_count + 1;
    v_count := v_count + coalesce((v_result->>'generated_count')::integer,0);
    v_rows := v_rows || coalesce(v_result->'pins','[]'::jsonb);
  end loop;

  return jsonb_build_object(
    'generated',true,
    'year_level',p_year_level,
    'classes_processed',v_class_count,
    'generated_count',v_count,
    'pin_digits',p_digits,
    'pins',v_rows,
    'classes_remain_inactive',true,
    'message',case when v_count>0
      then 'PINs were generated atomically for inactive classes. Plain-text PINs are returned only in this response; the database stores hashes only.'
      else 'No missing PINs were found in the inactive classes.' end
  );
end;
$$;

revoke all on function public.teacher_generate_year_pins_v01(smallint,smallint) from public, anon;
grant execute on function public.teacher_generate_year_pins_v01(smallint,smallint) to authenticated, service_role;
