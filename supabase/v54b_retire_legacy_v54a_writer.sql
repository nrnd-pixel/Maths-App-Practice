-- V5.4B follow-up
-- Applied to production as migration:
-- 20260901064332 v54b_retire_legacy_v54a_writer
--
-- The abandoned V5.4A bulk writer is not referenced by accepted production code.
-- Keep it only for trusted service/rollback use so the browser has one authoritative
-- teacher Practice-eligibility writer: save_question_practice_eligibility_v54b.

revoke execute on function public.save_question_practice_eligibility_v54a(uuid[],boolean)
  from public, anon, authenticated;
grant execute on function public.save_question_practice_eligibility_v54a(uuid[],boolean)
  to service_role;

comment on function public.save_question_practice_eligibility_v54a(uuid[],boolean) is
  'Retired V5.4A bulk Practice-eligibility writer. Client EXECUTE revoked by V5.4B; retained for trusted service/rollback use only.';
