# Science V0.1 — Development Environment Status

Updated: 2026-09-02

## Environment

- Supabase organization: SR Lumapas
- Development project: `SR Lumapas Science Dev`
- Project ref: `rojetehazryfpcxlwtbi`
- Region: `ap-northeast-2`
- Current project cost reported by Supabase: **US$0/month**
- Production Maths project remains separate and unchanged: `SR Lumapas Math Practice`
- GitHub branch: `feature/science-v0.1-foundation`

## Backend completed in Science Dev

### 1. `science_v01_core_content_foundation`

Created isolated Science content tables:

- `public.science_topics`
- `public.science_lessons`
- `public.science_resources`
- `public.science_lesson_publications`

Created constraints, relationships and planned query indexes. RLS is enabled on every Science table.

Direct raw table access is intentionally locked down:

- `anon`: no direct SELECT
- `authenticated`: no direct SELECT

### 2. `science_v01_fk_indexes`

Added covering indexes for Science `created_by` / `published_by` foreign keys. Supabase no longer reports unindexed Science foreign keys.

### 3. `science_v01_student_read_boundary`

Added a scoped student delivery boundary without opening the content tables directly:

- private Science access tickets stored as SHA-256 hashes
- year-scoped temporary Science access
- expiry / revocation checks
- `public.science_student_catalog(p_token)`
- `public.science_student_lesson(p_token, p_lesson_id)`

The public RPC wrappers are `SECURITY INVOKER`. Privileged data access is kept inside the non-exposed `private` schema, with default function access revoked and only the required roles granted execution.

Student delivery filters require:

- matching year level
- topic not archived
- lesson not archived
- `review_status = reviewed`
- explicit publication
- publication window open
- at least one student-ready resource

The lesson payload returns only student-ready, non-archived resources.

## Dev pilot seeded

Year 4 pilot:

- Topic: `Plants`
- Lesson: `What Plants Need`
- Learn resource: `Plants Need Water, Light and Air`
- Explore resource: `Predict: What Will Happen to the Plant?`
- Featured + published in the development project

A development-only draft lesson and an unready resource were also inserted specifically to test that unpublished/unready content does not leak.

## Security verification

Verified while executing as the `anon` database role:

- visible published lessons: **1**
- visible resources in the pilot lesson: **2**
- deliberately published-but-draft lesson visible: **false**
- deliberately unready resource visible: **false**

Raw direct table SELECT remains unavailable to `anon` and `authenticated`.

Supabase security advisor currently reports only informational `RLS enabled, no policy` notices on the four public Science tables. This is expected because direct table access is intentionally not the student delivery model.

Performance advisor currently reports only `unused index` informational notices, expected on a new development database with almost no workload.

## Student shell completed on feature branch

Added:

- `site/science/index.html`
- `site/science/styles.css`
- `site/science/app.js`
- `site/science/config.js`

Current V0.1 shell includes:

- mobile-first Science home
- temporary development access-code screen
- Year-specific published lesson catalog
- featured lesson indicator
- lesson objectives and success criteria
- safe text rendering for resource content
- HTTPS-only external resource links
- resource types/stages
- session-only storage for the temporary access token
- refresh / back / forget-access controls

The temporary raw development access token is **not committed to GitHub**.

## Production boundary

No changes have been made to the live Maths Supabase project during this Science setup.

The original `docs/SCIENCE-V0.1-SCHEMA-DRAFT.sql` remains a design draft because its teacher policies depend on the existing Maths production teacher model. Do not run it blindly on the standalone Science development project.

## Next implementation sequence

1. Preview the `/science/` student shell through a non-production deployment.
2. Verify the REST/RPC path from a real browser/mobile device.
3. Build teacher Science authoring + readiness + publish/unpublish controls.
4. Add the bridge from the existing Student ID/PIN session to a scoped Science access capability.
5. Replace the temporary development access-code screen with normal platform sign-in/session reuse.
6. Expand the Year 4 pilot with the actual worksheet/activity/experiment resources.
7. Run security/performance advisors and Maths regression checks before any production migration.
