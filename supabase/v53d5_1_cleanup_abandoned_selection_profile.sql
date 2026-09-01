-- V5.3D5.1 — Cleanup abandoned Practice selection profile RPC
-- Production migration: 20260831063950 v53d5_cleanup_abandoned_selection_profile
-- The accepted V5.3D5 implementation is browser-only and reuses the established
-- V5.3D4 recommendation RPC. This experimental profile RPC came from a
-- superseded D5 branch and is intentionally removed to avoid unused server
-- surface.

drop function if exists public.get_student_practice_selection_profile_v53d5(text);