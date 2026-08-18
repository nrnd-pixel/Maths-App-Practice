-- Math Practice V3.1 - Fresh Supabase schema
-- Use this for a NEW Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.teacher_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  year_level smallint not null check (year_level between 1 and 6),
  strand text not null check (strand in ('number','measurement','geometry','statistics','thinking')),
  topic text not null,
  subtopic text not null default '',
  skill text not null default '',
  difficulty text not null default 'standard' check (difficulty in ('foundation','standard','challenge')),
  marks smallint not null default 1 check (marks between 1 and 20),
  exam_year smallint check (exam_year is null or exam_year between 2000 and 2100),
  paper text not null default '',
  question_number text not null default '',
  source_type text not null default 'teacher' check (source_type in ('teacher','past_paper','practice')),
  source text not null default 'Teacher question bank',
  question_text text not null,
  answer text not null,
  accepted_answers jsonb not null default '[]'::jsonb,
  hint text not null default '',
  explanation text not null default '',
  image_url text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  student_id text,
  year_level smallint not null check (year_level between 1 and 6),
  class_group text not null,
  practice_mode text not null default 'mixed',
  strand text not null default 'mixed',
  topic text not null default 'Mixed Practice',
  first_try_score integer not null default 0,
  mastery_score integer not null default 0,
  total integer not null default 0,
  first_try_percent integer not null default 0,
  mastery_percent integer not null default 0,
  hints_used integer not null default 0,
  second_try_successes integer not null default 0,
  ended_early boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz not null default now(),
  client_session_key text
);

create table if not exists public.session_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  question_snapshot text not null,
  strand text not null default '',
  topic text not null default '',
  subtopic text not null default '',
  skill text not null default '',
  final_answer text,
  correct_answer_snapshot text not null,
  correct boolean not null,
  first_try boolean not null,
  attempts smallint not null check (attempts between 1 and 2),
  hint_used boolean not null default false,
  explanation_snapshot text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists questions_curriculum_idx on public.questions(year_level, strand, topic, active);
create index if not exists sessions_student_idx on public.practice_sessions(year_level, class_group, student_id, completed_at desc);
create index if not exists answers_session_idx on public.session_answers(session_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at before update on public.questions
for each row execute function public.set_updated_at();

create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teacher_profiles where user_id = auth.uid());
$$;
revoke all on function public.is_teacher() from public;
grant execute on function public.is_teacher() to anon, authenticated;

alter table public.teacher_profiles enable row level security;
alter table public.questions enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.session_answers enable row level security;

grant select on public.questions to anon, authenticated;
grant insert on public.practice_sessions to anon, authenticated;
grant insert on public.session_answers to anon, authenticated;
grant select on public.teacher_profiles to authenticated;
grant select on public.practice_sessions to authenticated;
grant select on public.session_answers to authenticated;
grant insert, update, delete on public.questions to authenticated;

drop policy if exists "teachers can read own profile" on public.teacher_profiles;
create policy "teachers can read own profile" on public.teacher_profiles for select to authenticated using (user_id = auth.uid());

drop policy if exists "public can read active questions" on public.questions;
create policy "public can read active questions" on public.questions for select to anon, authenticated using (active = true or public.is_teacher());

drop policy if exists "teachers can insert questions" on public.questions;
create policy "teachers can insert questions" on public.questions for insert to authenticated with check (public.is_teacher());
drop policy if exists "teachers can update questions" on public.questions;
create policy "teachers can update questions" on public.questions for update to authenticated using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "teachers can delete questions" on public.questions;
create policy "teachers can delete questions" on public.questions for delete to authenticated using (public.is_teacher());

drop policy if exists "clients can submit practice sessions" on public.practice_sessions;
create policy "clients can submit practice sessions" on public.practice_sessions for insert to anon, authenticated with check (true);
drop policy if exists "teachers can read sessions" on public.practice_sessions;
create policy "teachers can read sessions" on public.practice_sessions for select to authenticated using (public.is_teacher());

drop policy if exists "clients can submit session answers" on public.session_answers;
create policy "clients can submit session answers" on public.session_answers for insert to anon, authenticated with check (true);
drop policy if exists "teachers can read session answers" on public.session_answers;
create policy "teachers can read session answers" on public.session_answers for select to authenticated using (public.is_teacher());

-- Starter examples across the V3.1 structure. Remove if you want an empty question bank.
insert into public.questions
(year_level,strand,topic,subtopic,skill,difficulty,marks,source_type,source,question_text,answer,accepted_answers,hint,explanation)
select * from (values
(6,'number','Multiplication & Division','Division','Divide a 4-digit number by a 1-digit number','standard',1,'practice','V3.1 sample','What is 4,608 ÷ 8?','576','["576"]'::jsonb,'Break 4,608 into smaller parts.','4,608 ÷ 8 = 576.'),
(6,'number','Fractions','Equivalent fractions','Complete an equivalent fraction','standard',1,'practice','V3.1 sample','Complete: 3/4 = __/8. What number goes in the blank?','6','["6"]'::jsonb,'The denominator doubled.','Multiply numerator and denominator by 2.'),
(6,'measurement','Unit Conversion','Capacity','Convert litres to millilitres','standard',1,'practice','V3.1 sample','A bottle contains 1.5 litres. How many millilitres is this?','1500','["1500","1,500","1500 ml"]'::jsonb,'1 litre = 1,000 millilitres.','1.5 × 1,000 = 1,500 mL.'),
(6,'geometry','Angles','Straight-line angles','Find a missing angle','standard',1,'practice','V3.1 sample','An angle on a straight line is 128°. What is the missing angle?','52°','["52","52°"]'::jsonb,'Angles on a straight line total 180°.','180° − 128° = 52°.'),
(5,'statistics','Data Interpretation','Bar charts','Read data from a chart','foundation',1,'practice','V3.1 sample','A bar chart shows 18 pupils chose football. How many chose football?','18','["18"]'::jsonb,'Read the football value.','The given value is 18.'),
(4,'thinking','Patterns & Rules','Number patterns','Continue a simple number pattern','foundation',1,'practice','V3.1 sample','Continue: 5, 10, 15, 20, __','25','["25"]'::jsonb,'What is added each time?','The pattern increases by 5, so 25 comes next.')
) as seed(year_level,strand,topic,subtopic,skill,difficulty,marks,source_type,source,question_text,answer,accepted_answers,hint,explanation)
where not exists (select 1 from public.questions limit 1);

-- After creating a teacher under Authentication > Users, run separately:
-- insert into public.teacher_profiles (user_id, display_name)
-- values ('PASTE-AUTH-USER-UUID-HERE', 'Teacher');
