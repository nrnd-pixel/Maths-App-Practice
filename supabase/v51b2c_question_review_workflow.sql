-- V5.1B2C — Question review workflow state.
-- Backward-compatible additions only; existing questions default to no review state.

alter table public.questions
  add column if not exists review_status text not null default 'none',
  add column if not exists review_note text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'questions_review_status_check'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
      add constraint questions_review_status_check
      check (review_status in ('none','needs_review','reviewed'));
  end if;
end $$;

comment on column public.questions.review_status is
  'Teacher QA workflow state: none, needs_review, or reviewed.';
comment on column public.questions.review_note is
  'Teacher QA note associated with the current review state.';
