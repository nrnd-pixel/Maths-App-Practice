-- V5.1B3 follow-up hardening.
-- Deferred publication-integrity checks must evaluate the final transaction state.
-- VOLATILE makes each readiness call use the current command state instead of a
-- STABLE function snapshot. The atomic bulk-save RPC lives in the separate
-- v51b3_exam_publication_bulk_safety.sql migration and is not redefined here.

alter function public.exam_paper_readiness_v51b3(integer,integer,text) volatile;
alter function public.get_exam_paper_readiness_v51b3(integer,integer,text) volatile;
