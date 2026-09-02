-- Science Learning Platform V0.1 — SCHEMA DRAFT ONLY
--
-- IMPORTANT:
-- - This file is NOT an applied migration.
-- - Do not run against production without first testing in a non-production Supabase environment.
-- - No existing Maths table/function is altered here.
-- - Student delivery RPCs and scoped Science access-ticket functions are intentionally deferred
--   until the content model and security boundary are tested.
--
-- Supabase security assumptions:
-- - public is an exposed schema, so RLS is enabled on every new table.
-- - direct anon access is revoked.
-- - authenticated access is explicitly granted but constrained by teacher-only RLS policies.
-- - student delivery will later occur through narrowly scoped RPCs rather than direct table SELECT.

begin;

create table if not exists public.science_topics (
  id uuid primary key default gen_random_uuid(),
  year_level smallint not null check (year_level between 1 and 6),
  theme text not null default '' check (length(trim(theme)) <= 120),
  title text not null check (length(trim(title)) between 1 and 160),
  slug text not null check (length(trim(slug)) between 1 and 180),
  description text not null default '',
  sort_order integer not null default 0 check (sort_order >= 0),
  archived boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year_level, slug)
);

create index if not exists science_topics_year_sort_idx
  on public.science_topics(year_level, archived, sort_order, title);

create table if not exists public.science_lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.science_topics(id) on delete restrict,
  title text not null check (length(trim(title)) between 1 and 180),
  summary text not null default '',
  learning_objectives jsonb not null default '[]'::jsonb
    check (jsonb_typeof(learning_objectives) = 'array'),
  success_criteria jsonb not null default '[]'::jsonb
    check (jsonb_typeof(success_criteria) = 'array'),
  estimated_minutes smallint check (estimated_minutes is null or estimated_minutes between 1 and 240),
  review_status text not null default 'draft'
    check (review_status in ('draft','needs_review','reviewed')),
  archived boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists science_lessons_topic_status_idx
  on public.science_lessons(topic_id, archived, review_status, created_at);

create table if not exists public.science_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.science_lessons(id) on delete cascade,
  resource_type text not null
    check (resource_type in (
      'note','worksheet','activity','experiment','video','infographic','external_link','quiz'
    )),
  title text not null check (length(trim(title)) between 1 and 180),
  description text not null default '',
  body_text text not null default '',
  resource_url text not null default '',
  sort_order integer not null default 0 check (sort_order >= 0),
  student_ready boolean not null default false,
  archived boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    resource_type = 'quiz'
    or length(trim(body_text)) > 0
    or length(trim(resource_url)) > 0
  )
);

create index if not exists science_resources_lesson_order_idx
  on public.science_resources(lesson_id, archived, student_ready, sort_order, created_at);

create table if not exists public.science_lesson_publications (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.science_lessons(id) on delete cascade,
  is_available boolean not null default false,
  is_featured boolean not null default false,
  opens_at timestamptz,
  closes_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at is null or opens_at is null or closes_at > opens_at),
  check (not is_available or published_at is not null)
);

create index if not exists science_lesson_publications_availability_idx
  on public.science_lesson_publications(is_available, is_featured, opens_at, closes_at);

-- Defense in depth: direct student/anonymous table access is not part of the V0.1 delivery model.
alter table public.science_topics enable row level security;
alter table public.science_lessons enable row level security;
alter table public.science_resources enable row level security;
alter table public.science_lesson_publications enable row level security;

revoke all on table public.science_topics from public, anon, authenticated;
revoke all on table public.science_lessons from public, anon, authenticated;
revoke all on table public.science_resources from public, anon, authenticated;
revoke all on table public.science_lesson_publications from public, anon, authenticated;

grant select, insert, update, delete on table public.science_topics to authenticated;
grant select, insert, update, delete on table public.science_lessons to authenticated;
grant select, insert, update, delete on table public.science_resources to authenticated;
grant select, insert, update, delete on table public.science_lesson_publications to authenticated;

-- Teacher-only direct CRUD policies.
-- Existing public.is_teacher() is used here only to match the current application's teacher model.
-- Before production application, re-run Supabase security advisors and review function exposure.

create policy "teachers select science topics"
on public.science_topics for select
to authenticated
using ((select public.is_teacher()));

create policy "teachers insert science topics"
on public.science_topics for insert
to authenticated
with check ((select public.is_teacher()));

create policy "teachers update science topics"
on public.science_topics for update
to authenticated
using ((select public.is_teacher()))
with check ((select public.is_teacher()));

create policy "teachers delete science topics"
on public.science_topics for delete
to authenticated
using ((select public.is_teacher()));

create policy "teachers select science lessons"
on public.science_lessons for select
to authenticated
using ((select public.is_teacher()));

create policy "teachers insert science lessons"
on public.science_lessons for insert
to authenticated
with check ((select public.is_teacher()));

create policy "teachers update science lessons"
on public.science_lessons for update
to authenticated
using ((select public.is_teacher()))
with check ((select public.is_teacher()));

create policy "teachers delete science lessons"
on public.science_lessons for delete
to authenticated
using ((select public.is_teacher()));

create policy "teachers select science resources"
on public.science_resources for select
to authenticated
using ((select public.is_teacher()));

create policy "teachers insert science resources"
on public.science_resources for insert
to authenticated
with check ((select public.is_teacher()));

create policy "teachers update science resources"
on public.science_resources for update
to authenticated
using ((select public.is_teacher()))
with check ((select public.is_teacher()));

create policy "teachers delete science resources"
on public.science_resources for delete
to authenticated
using ((select public.is_teacher()));

create policy "teachers select science publications"
on public.science_lesson_publications for select
to authenticated
using ((select public.is_teacher()));

create policy "teachers insert science publications"
on public.science_lesson_publications for insert
to authenticated
with check ((select public.is_teacher()));

create policy "teachers update science publications"
on public.science_lesson_publications for update
to authenticated
using ((select public.is_teacher()))
with check ((select public.is_teacher()));

create policy "teachers delete science publications"
on public.science_lesson_publications for delete
to authenticated
using ((select public.is_teacher()));

commit;

-- Future V0.1 backend work, NOT included in this draft:
--
-- 1. Science scoped access capability / exchange RPC.
-- 2. Published-only student RPCs.
-- 3. Teacher readiness/publish RPC with transactional validation.
-- 4. Supabase Storage bucket + storage.objects policies.
-- 5. updated_at trigger alignment with existing project conventions.
-- 6. pgTAP / regression queries and Supabase advisors.
