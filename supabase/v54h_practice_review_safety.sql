-- V5.4H — Practice eligibility / review-state safety
-- Additive database guard for the ordinary Practice exposure boundary.
--
-- Invariant:
--   review_status = 'needs_review' must never coexist with practice_eligible = true.
--
-- This migration does not modify any existing question row. It preserves the
-- deliberate independence of legacy `active` and ordinary Practice eligibility.
-- `review_status = 'none'` and `review_status = 'reviewed'` remain valid for
-- Practice-eligible questions.

-- Fail the migration before installing the guard if legacy data ever violates
-- the intended invariant. Do not silently repair or de-eligible content here.
do $v54h_preflight$
begin
  if exists (
    select 1
    from public.questions q
    where q.practice_eligible = true
      and q.review_status = 'needs_review'
  ) then
    raise exception 'V5.4H preflight failed: a question is both Practice-eligible and marked Needs Review. Resolve the conflicting row(s) explicitly before installing the guard.';
  end if;
end;
$v54h_preflight$;

create or replace function public.guard_question_practice_review_safety_v54h()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.practice_eligible = true
     and new.review_status = 'needs_review' then
    raise exception 'Question cannot be Practice-eligible while marked Needs Review. Remove it from Practice before marking Needs Review, or resolve the review before enabling Practice.';
  end if;

  return new;
end;
$function$;

revoke all on function public.guard_question_practice_review_safety_v54h() from public, anon, authenticated;

drop trigger if exists questions_practice_review_safety_v54h on public.questions;
create trigger questions_practice_review_safety_v54h
before insert or update of practice_eligible, review_status on public.questions
for each row
execute function public.guard_question_practice_review_safety_v54h();

comment on function public.guard_question_practice_review_safety_v54h() is
  'V5.4H database authority guard: blocks review_status=needs_review from coexisting with practice_eligible=true without changing active or silently changing eligibility.';

comment on trigger questions_practice_review_safety_v54h on public.questions is
  'Prevents unresolved Needs Review content from entering or remaining in ordinary Practice. Removal from Practice and resolution of review state remain explicit teacher actions.';
