# Science V0.1 — Development Environment Status

Updated: 2026-09-02

## Environment

- Supabase organization: SR Lumapas
- Science development project: `SR Lumapas Science Dev`
- Science Dev project ref: `rojetehazryfpcxlwtbi`
- Science Dev region: `ap-northeast-2`
- Science Dev cost: **US$0/month** on the current Free Plan
- Live Maths/platform project: `SR Lumapas Math Practice` (`lmveznstltjxzpalcmid`)
- GitHub branch: `feature/science-v0.1-clean-sync`
- Draft PR: `#176`
- Netlify preview: `https://deploy-preview-176--magical-pixie-a61111.netlify.app`
- Maths baseline at clean rebuild: V5.6.1 / `8dd52157184a9264f80310739528eea8a06e87ee`

The clean Science branch was rebuilt directly on the current V5.6.1 Maths `main` baseline. It is **0 commits behind main** at the latest comparison. Science remains unmerged and off the live student site.

## Science Dev backend

Applied core migration history:

1. `science_v01_core_content_foundation`
2. `science_v01_fk_indexes`
3. `science_v01_student_read_boundary`
4. `science_v01_student_rpc_privilege_hardening`
5. `science_v01_teacher_auth_and_publishing`

Core tables:

- `public.science_topics`
- `public.science_lessons`
- `public.science_resources`
- `public.science_lesson_publications`
- `public.science_teacher_profiles`

Private student tickets remain in `private.science_access_tickets` and store SHA-256 token hashes rather than raw capabilities.

## Student delivery security

Public Science content RPCs:

- `public.science_student_catalog(p_token)`
- `public.science_student_lesson(p_token, p_lesson_id)`

Student delivery requires:

- valid unexpired Science capability
- matching year level
- non-archived topic and lesson
- `review_status = reviewed`
- explicit active publication
- open publication window
- student-ready resources only

Draft lessons and unready resources have been verified not to leak through the student RPCs.

## Platform Student ID + PIN session

The subject platform no longer treats a Mathematics practice ticket as the student's primary identity. This is required so a student can be:

- Mathematics only
- Science only
- both subjects
- neither subject

The browser platform session key is `learningPlatformSessionV01`. Student PINs are used only for verification and are not stored in the session.

Current preview flow:

1. Student enters the normal Student ID + PIN once on the Learning Hub.
2. `validate_platform_student_access(...)` verifies the roster identity and creates an opaque platform capability.
3. The platform resolves current subject permissions using: **student override → class setting → platform default**.
4. The subject home renders only allowed subjects.
5. Mathematics issues its own practice/exam capability only when Mathematics is currently allowed.
6. Science sends the opaque platform capability to `science-session-exchange-v01`.
7. The Science Edge Function verifies current Science permission against the platform project server-side.
8. Only then does Science Dev mint a short-lived Science capability for its published-content RPCs.

An older valid Maths practice session can still be exchanged once for a platform session through `exchange_math_access_for_platform(...)` to preserve compatibility during the transition.

## Platform subject access database

Three additive migrations have been applied to the live Maths/platform Supabase project:

1. `20260902085041 platform_subject_access_v01`
2. `20260902085110 math_access_subject_guard_v01`
3. `20260902085329 platform_session_existing_math_exchange_v01`

The exact deployed SQL is recorded at:

- `supabase/platform_subject_access_v01_deployed.sql`

Current safe platform defaults:

- Mathematics: **ON**
- Science: **OFF**

Current Year 6 classes therefore remain Mathematics-only unless the teacher deliberately changes a class setting or individual override.

Platform access tables:

- `public.platform_subject_defaults`
- `public.class_subject_access`
- `public.student_subject_access_overrides`
- private ticket table: `private.platform_student_access_tickets`

Direct `anon` / `authenticated` table privileges are revoked on the subject-access tables. Browser access goes through narrow RPCs.

Student RPCs intentionally callable by browser roles with opaque token/PIN authorization:

- `validate_platform_student_access(...)`
- `get_student_subject_access(...)`
- `issue_student_math_access(...)`
- `exchange_math_access_for_platform(...)`

Teacher subject-access RPCs are available to `authenticated` only and independently require `public.is_teacher()`:

- `teacher_subject_access_overview()`
- `teacher_set_class_subject_access(...)`
- `teacher_set_student_subject_access_override(...)`
- `teacher_set_year_subject_access(...)`

## Teacher subject controls

The deploy preview adds a **Subject Access** tab to the existing Teacher Dashboard.

Controls include:

- class-level Mathematics / Science settings: On, Off, or Inherit
- individual student overrides
- quick year presets: Maths only, Science only, Both subjects, Neither
- effective access and source display

Permission precedence is:

**individual student override → class setting → platform default**

This is server-enforced. Hiding a tile is not the security boundary.

## Science session bridge

Science Dev uses:

- `supabase/science_v01_platform_session_bridge.sql`
- `supabase/functions/science-session-exchange-v01/index.ts`

The currently deployed Edge Function validates the opaque platform session and current Science permission before minting a Science capability. During development, Science capabilities are intentionally short-lived so teacher permission changes propagate quickly.

Verified Science Dev permissions:

- `anon` can execute `science_mint_student_access_v01`: **false**
- `authenticated` can execute it: **false**
- `service_role` can execute it: **true**
- browser roles cannot directly read/write `private.science_access_tickets`
- the Science service-role credential is never exposed to browser JavaScript

## Teacher Studio

Science Teacher Studio is operational in Science Dev. The first teacher account is registered, email-confirmed and active.

Current capabilities include:

- sign in
- create topic
- create/edit lesson
- learning objectives and success criteria
- create resources
- mark resources student-ready
- mark lesson reviewed / return to draft
- publish / unpublish
- feature a published lesson
- readiness/status overview

The first confirmation email redirected to `localhost` after successful confirmation because the Science Dev Auth Site URL still has its development default. Configure the final Site URL / redirect allow-list before wider teacher onboarding.

## Security advisors

Science Dev currently has one Auth configuration warning:

- **Leaked Password Protection Disabled**

Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

The live Maths/platform advisor also reports broad SECURITY DEFINER warnings for token-authorized browser RPCs and informational `RLS enabled / no policy` notices on tables that deliberately have direct browser grants revoked. Targeted grant checks confirm the new subject tables are not directly available to `anon` or `authenticated`, and the teacher subject RPCs are not executable by `anon` and call `public.is_teacher()` internally.

Do not interpret the advisor output as zero findings; distinguish intentional token-authorized student RPCs from teacher/admin RPCs during future audits.

## Pilot content

Year 4 pilot:

- Theme/topic: Plants
- Lesson: `What Plants Need`
- Learn: `Plants Need Water, Light and Air`
- Explore: `Predict: What Will Happen to the Plant?`
- reviewed, featured and published in Science Dev

A temporary Year 6 development copy exists only for current subject-access/bridge testing. Intentional draft/unready records remain for leakage regression tests.

## Current student shell

Files:

- `site/science/index.html`
- `site/science/styles.css`
- `site/science/app.js`
- `site/science/platform-session-adapter.js`
- `site/science/config.js`

Current behavior:

- mobile-first Science home
- subject-aware shared Learning Hub home
- native `All subjects` switcher inside Science
- one Student ID + PIN platform sign-in
- no Student PIN copied into Science
- server-enforced Science permission check before Science capability minting
- reviewed/published lesson catalog
- objectives and success criteria
- safe student-ready resource rendering
- HTTPS-only external resource links

`sessionStorage` remains browser-tab scoped, so current preview QA should stay in the same tab when moving between the Learning Hub and Science.

## Production boundary

Current state:

- **Platform subject-access tables/functions have been added additively to the live Maths Supabase project.**
- **Science content tables remain only in Science Dev.**
- no Science feature code has been merged to GitHub `main`
- the live student UI does not expose Science
- current Science platform default remains OFF
- the live Maths content/question schema was not converted into a Science schema
- Science Dev service-role credentials remain server-side only

## Regression checkpoint

On draft PR #176 after rebuilding from V5.6.1:

- Netlify deploy preview: **passed**
- V5 Regression Safety: **passed**
- V5.4 checkpoint: **passed**
- V5.5A/B/C/D + V5.5 checkpoint: **passed**
- V5.6A/B/C/D: **passed**
- V5.6.1 Practice First Student Experience: **passed**
- Science V0.1 Subject Access regression: **passed** after updating the stale test from the retired Science-only launcher to the new platform modules

## Next gate

Run one controlled real-student subject-access test without changing an entire class:

1. Keep Year 6 class defaults Mathematics ON / Science OFF.
2. Choose one existing Year 6 student and set only that student's Science override to ON in the preview Teacher Dashboard.
3. Confirm that student sees Mathematics + Science after normal Student ID + PIN sign-in.
4. Confirm a different Year 6 student still sees Mathematics only.
5. Confirm manually opening `/science/` as a non-authorized student is denied server-side.
6. Remove the test student's Science override and verify Science disappears / is denied after access refresh.

After that gate passes, create/import the real Year 4 roster and configure Year 4 Science access deliberately before expanding the full Plants lesson.
