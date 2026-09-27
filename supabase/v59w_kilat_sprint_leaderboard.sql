-- V5.9W — Kilat Math Sprint leaderboard.
-- One row per student, holding their personal best score.
-- Leaderboard is visible to all students in the same class.
-- No PII beyond student_name and class_name (already in roster).

create table if not exists public.kilat_sprint_scores (
  id                  uuid primary key default gen_random_uuid(),
  roster_student_id   uuid not null references public.roster_students(id) on delete cascade,
  student_name        text not null,
  class_name          text not null,
  best_score          integer not null default 0 check (best_score >= 0 and best_score <= 9999),
  best_correct        integer not null default 0,
  best_combo          integer not null default 0,
  updated_at          timestamptz not null default now(),
  constraint kilat_sprint_scores_student_unique unique (roster_student_id)
);

-- Index for fast class leaderboard fetch
create index if not exists kilat_sprint_scores_class_name_idx
  on public.kilat_sprint_scores (class_name, best_score desc);

-- RLS: students can see their own class, write only their own row
alter table public.kilat_sprint_scores enable row level security;

drop policy if exists "kilat_sprint_scores_class_read" on public.kilat_sprint_scores;
create policy "kilat_sprint_scores_class_read"
  on public.kilat_sprint_scores for select
  using (true); -- class filter applied in RPC

drop policy if exists "kilat_sprint_scores_self_write" on public.kilat_sprint_scores;
create policy "kilat_sprint_scores_self_write"
  on public.kilat_sprint_scores for all
  using (false) with check (false); -- writes only via RPC

-- RPC: upsert a student's best score (token-gated, no direct table write)
create or replace function public.kilat_sprint_submit_score(
  p_access_token text,
  p_score        integer,
  p_correct      integer,
  p_combo        integer
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_ticket public.student_access_tickets;
  v_student public.roster_students;
  v_existing integer;
begin
  -- Validate token
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token = p_access_token
    and t.expires_at > now()
    and t.roster_student_id is not null
  limit 1;

  if v_ticket.id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  -- Validate score range
  if p_score < 0 or p_score > 9999 then
    return jsonb_build_object('ok', false, 'error', 'invalid_score');
  end if;

  -- Get student info
  select * into v_student
  from public.roster_students
  where id = v_ticket.roster_student_id
  limit 1;

  if v_student.id is null then
    return jsonb_build_object('ok', false, 'error', 'student_not_found');
  end if;

  -- Only update if this is a new personal best
  select best_score into v_existing
  from public.kilat_sprint_scores
  where roster_student_id = v_ticket.roster_student_id;

  if v_existing is not null and v_existing >= p_score then
    return jsonb_build_object('ok', true, 'updated', false, 'best', v_existing);
  end if;

  insert into public.kilat_sprint_scores (
    roster_student_id, student_name, class_name,
    best_score, best_correct, best_combo, updated_at
  ) values (
    v_ticket.roster_student_id,
    coalesce(nullif(trim(v_student.student_name), ''), 'Student'),
    coalesce(nullif(trim(v_student.class_name), ''), 'Class'),
    p_score, p_correct, p_combo, now()
  )
  on conflict (roster_student_id) do update set
    student_name = excluded.student_name,
    class_name   = excluded.class_name,
    best_score   = excluded.best_score,
    best_correct = excluded.best_correct,
    best_combo   = excluded.best_combo,
    updated_at   = now();

  return jsonb_build_object('ok', true, 'updated', true, 'best', p_score);
end;
$$;

-- RPC: fetch class leaderboard (token-gated, filters by student's class)
create or replace function public.kilat_sprint_get_leaderboard(
  p_access_token text
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_ticket public.student_access_tickets;
  v_student public.roster_students;
  v_rows jsonb;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token = p_access_token
    and t.expires_at > now()
    and t.roster_student_id is not null
  limit 1;

  if v_ticket.id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select * into v_student
  from public.roster_students
  where id = v_ticket.roster_student_id
  limit 1;

  select jsonb_agg(
    jsonb_build_object(
      'student_name', s.student_name,
      'best_score',   s.best_score,
      'best_correct', s.best_correct,
      'best_combo',   s.best_combo,
      'is_me',        s.roster_student_id = v_ticket.roster_student_id,
      'updated_at',   s.updated_at
    ) order by s.best_score desc, s.updated_at asc
  ) into v_rows
  from public.kilat_sprint_scores s
  where s.class_name = coalesce(nullif(trim(v_student.class_name), ''), '__none__')
  limit 20;

  return jsonb_build_object('ok', true, 'rows', coalesce(v_rows, '[]'::jsonb));
end;
$$;

revoke all on function public.kilat_sprint_submit_score(text,integer,integer,integer) from public;
revoke all on function public.kilat_sprint_get_leaderboard(text) from public;
grant execute on function public.kilat_sprint_submit_score(text,integer,integer,integer) to anon, authenticated;
grant execute on function public.kilat_sprint_get_leaderboard(text) to anon, authenticated;

comment on table public.kilat_sprint_scores is 'V5.9W — Per-student personal best for Kilat Math Sprint. One row per student, updated only on a new best.';
comment on function public.kilat_sprint_submit_score(text,integer,integer,integer) is 'V5.9W — Token-gated upsert of Kilat Sprint personal best. No-op when score does not beat existing best.';
comment on function public.kilat_sprint_get_leaderboard(text) is 'V5.9W — Token-gated class leaderboard for Kilat Sprint, filtered to the student''s own class, top 20 by best_score.';
