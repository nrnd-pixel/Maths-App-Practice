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
- Draft PR: `#157` — Science V0.1 foundation and teacher studio
- Netlify deploy preview: `https://deploy-preview-157--magical-pixie-a61111.netlify.app`

## Applied Science Dev migrations

1. `science_v01_core_content_foundation`
2. `science_v01_fk_indexes`
3. `science_v01_student_read_boundary`
4. `science_v01_student_rpc_privilege_hardening`
5. `science_v01_teacher_auth_and_publishing`

## Core content model

Created isolated Science content tables:

- `public.science_topics`
- `public.science_lessons`
- `public.science_resources`
- `public.science_lesson_publications`

Also created `public.science_teacher_profiles` for Science Dev teacher authorization.

All public Science tables use RLS. Student content delivery does not use direct table SELECT.

## Student read boundary

Student access uses scoped temporary Science tickets stored only as SHA-256 hashes in the private schema.

Public RPCs:

- `public.science_student_catalog(p_token)`
- `public.science_student_lesson(p_token, p_lesson_id)`

Student delivery requires:

- valid, unexpired, non-revoked Science ticket
- matching year level
- topic not archived
- lesson not archived
- `review_status = reviewed`
- explicit active publication
- publication window open
- at least one student-ready resource

Only student-ready, non-archived resources are returned.

The private raw ticket helper is no longer executable by `anon`.

## Teacher authorization and publishing

Science Dev now has a dedicated teacher authorization layer.

- teacher account authentication uses Supabase Auth in the Science Dev project
- the existing Maths teacher email is allowlisted using a SHA-256 email hash; the raw email is not committed in the Science frontend files
- an auth trigger creates/enables a Science teacher profile only for an allowlisted account
- authenticated non-teachers cannot manage Science content
- teacher RLS permits CRUD on topics, lessons and resources
- publication table writes remain protected behind a validated publishing RPC

Teacher publication RPC:

- `public.science_teacher_set_publication(...)`

Publishing fails unless:

- the caller is an active Science teacher
- the topic and lesson are not archived
- the lesson is marked `reviewed`
- at least one non-archived resource is `student_ready`
- any open/close publication window is valid

Unpublishing automatically removes featured status.

Teacher overview RPC:

- `public.science_teacher_lesson_overview()`

Anonymous execution of teacher overview/publish RPCs is blocked.

## Security verification

Current Supabase security advisor result after teacher/auth migration:

- **0 security findings**

Current performance advisor findings:

- only `unused_index` informational notices, expected on a new development database with almost no workload

Earlier student boundary regression test:

- visible published lessons: **1**
- visible resources in the pilot lesson: **2**
- deliberately published-but-draft lesson visible: **false**
- deliberately unready resource visible: **false**

## Dev pilot seeded

Year 4 pilot:

- Topic: `Plants`
- Lesson: `What Plants Need`
- Learn resource: `Plants Need Water, Light and Air`
- Explore resource: `Predict: What Will Happen to the Plant?`
- Featured + published in Science Dev

Development-only draft/unready records also remain available for leakage regression testing.

## Student shell

Files:

- `site/science/index.html`
- `site/science/styles.css`
- `site/science/app.js`
- `site/science/config.js`

Current capabilities:

- mobile-first Science home
- temporary development access-code screen
- Year-specific published lesson catalog
- featured lesson indicator
- objectives + success criteria
- Learn/Explore/etc. resource stages
- safe text rendering
- HTTPS-only external resource links
- session-only storage for temporary Science token

No raw development access token is committed to GitHub.

## Teacher Studio

Files:

- `site/science/teacher.html`
- `site/science/teacher.css`
- `site/science/teacher.js`

Current capabilities:

- Science Dev teacher sign-in
- first-time Science Dev account registration
- allowlist verification
- create topic
- create draft lesson
- create resource
- edit lesson title/summary/objectives/success criteria/time
- mark lesson reviewed / return to draft
- mark resource student-ready / not ready
- archive resource
- publish / unpublish lesson
- optional featured publication
- readiness counts and status badges

## Preview / Git status

Draft PR `#157` triggered a successful Netlify deploy preview.

Preview base URL:

`https://deploy-preview-157--magical-pixie-a61111.netlify.app`

Expected Science paths:

- student: `/science/`
- teacher: `/science/teacher.html`

The Science branch currently contains only added Science/docs files relative to its merge base, but `main` has continued moving since the branch was created. At the latest comparison the branch was **ahead 11 / behind 10** and GitHub reported the draft PR as not currently mergeable.

Do not merge yet. Reconcile with current `main` and re-run Maths regression checks first.

## Production boundary

No Science migration has been applied to the live `SR Lumapas Math Practice` Supabase project.

No Science feature branch commit has been merged to `main`.

The current Maths production application remains outside the Science Dev database changes.

## Next implementation sequence

1. Open the Netlify deploy preview in a real browser/phone.
2. Create the first Science Dev teacher Auth account using the existing teacher email, then verify Teacher Studio end-to-end.
3. Verify student `/science/` RPC delivery from a real browser using a temporary dev ticket.
4. Reconcile the feature branch with the current `main` branch and run Maths regression checks.
5. Build the bridge from the existing Maths Student ID/PIN session to a scoped Science capability.
6. Replace the temporary Science access-code screen with normal platform session reuse.
7. Add actual Year 4 worksheet/activity/experiment files and Storage delivery.
8. Only after all gates pass, plan the production Science migration.
