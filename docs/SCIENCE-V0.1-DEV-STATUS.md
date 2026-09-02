# Science V0.1 — Development Environment Status

Updated: 2026-09-02

## Environment

- Supabase organization: SR Lumapas
- Science development project: `SR Lumapas Science Dev`
- Science Dev project ref: `rojetehazryfpcxlwtbi`
- Region: `ap-northeast-2`
- Science Dev project cost: **US$0/month** on the current Free Plan
- Live Maths project: `SR Lumapas Math Practice` (`lmveznstltjxzpalcmid`)
- GitHub branch: `feature/science-v0.1-synced`
- Draft production PR: `#162`
- Netlify preview family: `https://deploy-preview-162--magical-pixie-a61111.netlify.app`

The Science branch was rebuilt on the current Maths `main` baseline. Science remains unmerged and off the live student site.

## Science Dev backend

Applied migration history:

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

Private student tickets remain in `private.science_access_tickets` and store only SHA-256 token hashes.

## Student delivery security

Public student RPCs:

- `public.science_student_catalog(p_token)`
- `public.science_student_lesson(p_token, p_lesson_id)`

Student delivery requires:

- valid unexpired Science capability
- matching year level
- non-archived topic and lesson
- `review_status = reviewed`
- explicit active publication
- open publication window
- at least one student-ready resource

Draft lessons and unready resources have already been verified not to leak through the student RPCs.

## Shared Student ID + PIN bridge

The temporary long Science access-code UI has now been replaced on the feature branch by a shared-session bridge.

Flow in preview:

1. Student signs in to the normal Maths/Learning Hub using Student ID + PIN.
2. The existing same-origin `mathStudentSessionV40` session remains in `sessionStorage`; the PIN is not stored.
3. `/science/` reads the existing short-lived Maths practice capability.
4. Science calls `science-session-exchange-v01` in the Science Dev project.
5. The Edge Function validates the Maths capability server-side against the existing live Maths `get_student_assignments(p_access_token)` RPC and obtains the trusted registered-student identity.
6. Science Dev mints a separate one-hour Science capability.
7. Science content RPCs accept only the Science capability, not the Maths capability.

No new function or schema change has been added to the live Maths database for this bridge. The bridge reads the existing Maths session only.

Science Dev schema iteration for the bridge is recorded in:

- `supabase/science_v01_platform_session_bridge.sql`

Edge Function source is recorded in:

- `supabase/functions/science-session-exchange-v01/index.ts`

The Edge Function is currently deployed to Science Dev with `verify_jwt = false` intentionally because students are not Supabase Auth users; its body performs custom authentication by validating the existing Maths student capability server-side.

### Bridge permission verification

Verified in Science Dev:

- `anon` can execute mint RPC: **false**
- `authenticated` can execute mint RPC: **false**
- `service_role` can execute mint RPC: **true**
- `anon` private ticket SELECT/INSERT: **false / false**
- `authenticated` private ticket SELECT/INSERT: **false / false**

A direct service-role test successfully minted a 64-character one-hour Science token. Full browser end-to-end validation with a real Student ID + PIN is the next gate.

## Teacher Studio

Teacher Studio is operational in Science Dev. The first teacher account has been registered, email-confirmed and verified as an active Science teacher.

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

During first account confirmation, Supabase redirected to `localhost` because the Science Dev Auth Site URL still uses its default development value. The account itself confirmed successfully. Before wider teacher onboarding, configure the Supabase Auth Site URL / allowed redirect URLs for the Netlify site or final branded domain.

## Security / performance advisors

Latest Science Dev security advisor:

- one Auth configuration warning: **Leaked Password Protection Disabled**
- no new table/RLS/function exposure finding from the student-session bridge

Remediation reference:

- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Performance advisor currently shows only unused-index informational notices, expected for the lightly used development database.

## Pilot content

Year 4 pilot:

- Theme/topic: Plants
- Lesson: `What Plants Need`
- Learn: `Plants Need Water, Light and Air`
- Explore: `Predict: What Will Happen to the Plant?`
- reviewed, featured and published in Science Dev

Intentional draft/unready records remain for leakage regression testing.

## Current student shell

Files:

- `site/science/index.html`
- `site/science/styles.css`
- `site/science/app.js`
- `site/science/config.js`

Current behavior:

- mobile-first Science home
- native signed-in subject home with Mathematics and Science choices
- native `All subjects` switcher inside Science
- automatically reuses the existing same-tab Learning Hub student session
- exchanges Maths capability for a one-hour Science capability
- automatically retries exchange when the Science capability expires
- no Student PIN is copied into Science
- no long Science access code is required
- published lesson catalog
- lesson objectives / success criteria
- safe student-ready resource rendering
- HTTPS-only external resource links

Important browser detail: `sessionStorage` is scoped to a browser tab. For preview QA, sign in to the Maths preview and navigate to `/science/` in the **same tab**.

## Production boundary

Still unchanged:

- no Science schema/function has been added to the live Maths Supabase project
- no Science feature commit has been merged to `main`
- the live Maths student site does not expose Science
- the Science Dev service-role credential is never exposed to browser code

## Next gates

1. Run full browser test: Maths preview Student ID + PIN → subject home → Science → automatic Science access.
2. Confirm the Year 6 development copy shows only `What Plants Need — Preview` and its two student-ready resources.
3. Re-run Netlify / Maths regression checks for the latest Science commits.
4. Add actual worksheet, infographic and experiment resources.
5. Add Science completion/progress tracking.
