-- Math Practice V3.2C - Manual review + drawing responses
-- Backward-compatible migration. Safe to run more than once.

alter table public.practice_sessions
  add column if not exists auto_total integer not null default 0,
  add column if not exists pending_review_count integer not null default 0;

-- Existing sessions were fully auto-marked before V3.2C.
update public.practice_sessions
set auto_total = total
where auto_total = 0 and total > 0 and pending_review_count = 0;

alter table public.session_answers
  add column if not exists response_type text not null default 'text',
  add column if not exists response_payload jsonb not null default '{}'::jsonb,
  add column if not exists review_status text not null default 'auto',
  add column if not exists marks_possible smallint not null default 1,
  add column if not exists marks_awarded numeric(6,2),
  add column if not exists teacher_comment text not null default '',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

-- Constrain review status without breaking repeat runs.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'session_answers_review_status_check'
      and conrelid = 'public.session_answers'::regclass
  ) then
    alter table public.session_answers
      add constraint session_answers_review_status_check
      check (review_status in ('auto','pending','reviewed'));
  end if;
end $$;

-- Backfill response type and marks for existing auto-marked answers when the source question still exists.
update public.session_answers a
set response_type = coalesce(q.response_type, 'text'),
    marks_possible = q.marks,
    marks_awarded = case when a.correct then q.marks else 0 end
from public.questions q
where a.question_id = q.id
  and a.review_status = 'auto';

create index if not exists answers_review_status_idx
  on public.session_answers(review_status, created_at desc);

-- Teachers need to update pending answers after manual marking.
grant update on public.session_answers to authenticated;

drop policy if exists "teachers can update session answers" on public.session_answers;
create policy "teachers can update session answers"
on public.session_answers
for update
to authenticated
using (public.is_teacher())
with check (public.is_teacher());

-- Verification
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public'
  and table_name='session_answers'
  and column_name in (
    'response_type','response_payload','review_status','marks_possible',
    'marks_awarded','teacher_comment','reviewed_at','reviewed_by'
  )
order by column_name;
