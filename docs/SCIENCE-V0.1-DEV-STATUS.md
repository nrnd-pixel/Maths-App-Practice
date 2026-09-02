# Science V0.1 — Development Environment Status

Updated: 2026-09-02

## Environment

- Supabase organization: SR Lumapas
- Development project: `SR Lumapas Science Dev`
- Project ref: `rojetehazryfpcxlwtbi`
- Region: `ap-northeast-2`
- Current project cost reported by Supabase: **US$0/month**
- Production Maths project remains separate and unchanged: `SR Lumapas Math Practice`

## Applied to Science Dev

### `science_v01_core_content_foundation`

Created isolated Science content tables:

- `public.science_topics`
- `public.science_lessons`
- `public.science_resources`
- `public.science_lesson_publications`

Also created the planned query indexes, foreign keys, constraints, and enabled RLS on every Science table.

Direct table access is currently intentionally locked down:

- `anon`: no direct SELECT
- `authenticated`: no direct SELECT
- no student-facing policies yet
- no teacher-facing policies yet

This is deliberate. The fresh standalone Science project does not contain the Maths production helper `public.is_teacher()`, so the access layer is being implemented separately rather than weakening RLS for convenience.

### `science_v01_fk_indexes`

Added covering indexes for the `created_by` / `published_by` foreign keys so the Supabase performance advisor no longer reports unindexed Science foreign keys.

## Verification

Verified directly in the Science development database:

- all four Science tables exist
- RLS is enabled on all four tables
- `anon` has no direct SELECT access
- `authenticated` has no direct SELECT access
- security advisor findings are informational only: RLS is enabled but policies are intentionally not created yet
- performance advisor no longer reports unindexed foreign keys
- remaining `unused_index` notices are expected because the development database has no workload yet

## Current boundary

No changes have been made to the live Maths database during this Science setup.

The original `docs/SCIENCE-V0.1-SCHEMA-DRAFT.sql` remains a design draft because its teacher policies depend on the existing Maths production teacher model. Do not run it blindly on this standalone Science development project.

## Next implementation sequence

1. Create a safe development identity/auth scaffold that mirrors only the interfaces Science needs from the Maths platform.
2. Implement teacher-only Science CRUD without exposing Science tables directly to students.
3. Implement explicit lesson readiness + publish/unpublish workflow.
4. Implement a scoped Science student capability and published-only read RPCs.
5. Seed the Year 4 pilot: Plants → What Plants Need.
6. Build the `/science/` student shell against this development environment.
7. Run security/performance advisors and regression checks again before any production migration.
