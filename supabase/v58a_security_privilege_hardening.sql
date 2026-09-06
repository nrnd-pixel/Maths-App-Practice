-- Maths Practice V5.8A security privilege hardening.
-- Prepared for review on the V5.8 maintenance branch.
-- This file is intentionally limited to two unnecessary client EXECUTE grants
-- identified by the Supabase security advisor and verified against the live
-- function definitions. It does not change function bodies, data, RLS, grading,
-- authentication, Practice retrieval, or student token-gated RPC access.

-- 1) Teacher Past Paper analytics is teacher-authenticated inside the function.
-- Anonymous clients do not need EXECUTE permission.
revoke all on function public.get_teacher_past_paper_analytics_v56d(
  uuid,smallint,text
) from public;
revoke all on function public.get_teacher_past_paper_analytics_v56d(
  uuid,smallint,text
) from anon;
grant execute on function public.get_teacher_past_paper_analytics_v56d(
  uuid,smallint,text
) to authenticated;

-- 2) This function is used only as a database trigger on practice_sessions.
-- It is not a client RPC and therefore should not be executable by client roles.
revoke all on function public.clear_completed_past_paper_checkpoint_v57a()
  from public;
revoke all on function public.clear_completed_past_paper_checkpoint_v57a()
  from anon;
revoke all on function public.clear_completed_past_paper_checkpoint_v57a()
  from authenticated;

-- service_role/postgres privileges are intentionally left unchanged.
