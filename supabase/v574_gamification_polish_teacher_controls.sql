-- V5.7.4 — Gamification polish + teacher class-challenge controls
-- Adds a small per-class settings record and secure teacher-only mutation RPC.
-- Student reads remain aggregate-only; Exam activity and grading are unchanged.

create table if not exists public.class_gamification_settings_v574 (
  class_id uuid primary key references public.school_classes(id) on delete cascade,
  challenge_enabled boolean not null default true,
  questions_per_active_student integer not null default 10
    check (questions_per_active_student in (5,10,15,20)),
  updated_by uuid,
  updated_at timestamptz not null default now()
);

alter table public.class_gamification_settings_v574 enable row level security;
revoke all on table public.class_gamification_settings_v574 from public, anon, authenticated;

create or replace function public.get_student_class_challenge_v574(p_access_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_base jsonb;
  v_class_id uuid;
  v_enabled boolean := true;
  v_questions_per_student integer := 10;
  v_active_students integer := 0;
  v_questions integer := 0;
  v_target integer := 1;
  v_percent integer := 0;
begin
  v_base := public.get_student_class_challenge_v573(p_access_token);
  v_class_id := nullif(v_base->'class'->>'class_id','')::uuid;

  if v_class_id is not null then
    select s.challenge_enabled, s.questions_per_active_student
    into v_enabled, v_questions_per_student
    from public.class_gamification_settings_v574 s
    where s.class_id=v_class_id;
  end if;

  v_enabled := coalesce(v_enabled,true);
  v_questions_per_student := coalesce(v_questions_per_student,10);
  v_active_students := greatest(coalesce((v_base->'class'->>'active_students')::integer,0),0);
  v_questions := greatest(coalesce((v_base->'challenge'->>'questions_completed')::integer,0),0);
  v_target := greatest(1,v_active_students * v_questions_per_student);
  v_percent := least(100,greatest(0,round(100.0*v_questions/v_target)::integer));

  return v_base
    || jsonb_build_object(
      'challenge', coalesce(v_base->'challenge','{}'::jsonb) || jsonb_build_object(
        'enabled',v_enabled,
        'target_questions',v_target,
        'progress_percent',v_percent,
        'complete',(v_enabled and v_questions>=v_target),
        'description',case
          when v_enabled then 'Work together to complete Practice questions this week.'
          else 'Your teacher has paused this class challenge.'
        end
      ),
      'rules', coalesce(v_base->'rules','{}'::jsonb) || jsonb_build_object(
        'questions_per_active_student',v_questions_per_student,
        'teacher_configurable',true
      )
    );
end;
$$;

create or replace function public.get_teacher_class_gamification_v574(p_class_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_base jsonb;
  v_enabled boolean := true;
  v_questions_per_student integer := 10;
  v_updated_at timestamptz;
  v_active_students integer := 0;
  v_questions integer := 0;
  v_target integer := 1;
  v_percent integer := 0;
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;

  v_base := public.get_teacher_class_gamification_v573(p_class_id);

  select s.challenge_enabled, s.questions_per_active_student, s.updated_at
  into v_enabled, v_questions_per_student, v_updated_at
  from public.class_gamification_settings_v574 s
  where s.class_id=p_class_id;

  v_enabled := coalesce(v_enabled,true);
  v_questions_per_student := coalesce(v_questions_per_student,10);
  v_active_students := greatest(coalesce((v_base->'summary'->>'active_students')::integer,0),0);
  v_questions := greatest(coalesce((v_base->'challenge'->>'questions_completed')::integer,0),0);
  v_target := greatest(1,v_active_students * v_questions_per_student);
  v_percent := least(100,greatest(0,round(100.0*v_questions/v_target)::integer));

  return v_base
    || jsonb_build_object(
      'challenge', coalesce(v_base->'challenge','{}'::jsonb) || jsonb_build_object(
        'enabled',v_enabled,
        'target_questions',v_target,
        'progress_percent',v_percent,
        'complete',(v_enabled and v_questions>=v_target)
      ),
      'settings',jsonb_build_object(
        'challenge_enabled',v_enabled,
        'questions_per_active_student',v_questions_per_student,
        'updated_at',v_updated_at,
        'allowed_questions_per_active_student',jsonb_build_array(5,10,15,20)
      ),
      'rules', coalesce(v_base->'rules','{}'::jsonb) || jsonb_build_object(
        'questions_per_active_student',v_questions_per_student,
        'teacher_configurable',true
      )
    );
end;
$$;

create or replace function public.update_teacher_class_challenge_v574(
  p_class_id uuid,
  p_challenge_enabled boolean,
  p_questions_per_active_student integer
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;
  if not exists(select 1 from public.school_classes sc where sc.id=p_class_id and sc.active=true) then
    raise exception 'Choose a valid active class';
  end if;
  if p_questions_per_active_student not in (5,10,15,20) then
    raise exception 'Questions per active student must be 5, 10, 15 or 20';
  end if;

  insert into public.class_gamification_settings_v574(
    class_id,challenge_enabled,questions_per_active_student,updated_by,updated_at
  ) values (
    p_class_id,coalesce(p_challenge_enabled,true),p_questions_per_active_student,auth.uid(),now()
  )
  on conflict (class_id) do update
  set challenge_enabled=excluded.challenge_enabled,
      questions_per_active_student=excluded.questions_per_active_student,
      updated_by=auth.uid(),
      updated_at=now();

  return public.get_teacher_class_gamification_v574(p_class_id);
end;
$$;

revoke all on function public.get_student_class_challenge_v574(text) from public;
revoke all on function public.get_teacher_class_gamification_v574(uuid) from public,anon;
revoke all on function public.update_teacher_class_challenge_v574(uuid,boolean,integer) from public,anon;

grant execute on function public.get_student_class_challenge_v574(text) to anon,authenticated;
grant execute on function public.get_teacher_class_gamification_v574(uuid) to authenticated,service_role;
grant execute on function public.update_teacher_class_challenge_v574(uuid,boolean,integer) to authenticated,service_role;
