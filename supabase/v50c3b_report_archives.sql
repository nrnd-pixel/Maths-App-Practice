-- Maths Practice V5.0C3B — Teacher Report Archive
-- Immutable, teacher-owned JSON report snapshots.
-- Archives are retained until the creating teacher explicitly deletes them.

create table if not exists public.report_archives (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('class','student')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  subject_name text,
  class_name text,
  student_id text,
  student_name text,
  scope jsonb not null default '{}'::jsonb check (jsonb_typeof(scope) = 'object'),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  record_count integer not null default 0 check (record_count >= 0),
  snapshot_version smallint not null default 1 check (snapshot_version = 1),
  retention_policy text not null default 'manual_delete' check (retention_policy = 'manual_delete'),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.report_archives enable row level security;

-- Archives are deliberately immutable. No UPDATE privilege or policy is granted.
drop policy if exists "teachers read own report archives" on public.report_archives;
create policy "teachers read own report archives"
on public.report_archives
for select
to authenticated
using (public.is_teacher() and created_by = auth.uid());

drop policy if exists "teachers create own report archives" on public.report_archives;
create policy "teachers create own report archives"
on public.report_archives
for insert
to authenticated
with check (public.is_teacher() and created_by = auth.uid());

drop policy if exists "teachers delete own report archives" on public.report_archives;
create policy "teachers delete own report archives"
on public.report_archives
for delete
to authenticated
using (public.is_teacher() and created_by = auth.uid());

revoke all on table public.report_archives from anon;
revoke all on table public.report_archives from authenticated;
grant select, insert, delete on table public.report_archives to authenticated;

create index if not exists report_archives_created_by_created_at_idx
  on public.report_archives(created_by, created_at desc);

create index if not exists report_archives_created_by_type_created_at_idx
  on public.report_archives(created_by, report_type, created_at desc);

comment on table public.report_archives is
  'V5.0C3B immutable teacher-owned report snapshots; retained until manual deletion.';
comment on column public.report_archives.snapshot is
  'Structured report snapshot containing export headers and typed records as they existed when archived.';
comment on column public.report_archives.retention_policy is
  'V5.0C3B supports manual_delete only; no automatic purge is performed.';
