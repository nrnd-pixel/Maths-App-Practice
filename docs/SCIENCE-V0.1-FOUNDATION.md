# Science Learning Platform — V0.1 Foundation

Status: design baseline only; no production Maths or Supabase behaviour is changed by this document.
Baseline reviewed: Maths Practice main branch, V5.5B-era production architecture, 2026-09-02.

## 1. Decision

Build Science as an isolated subject module within the existing learning-platform ecosystem, not as a fork of the Maths app.

Initial deployment target:

- same Netlify origin as Maths
- student route: `/science/`
- same Supabase project and roster
- same Student ID + PIN identity
- same teacher Supabase Auth account
- separate Science content tables and Science RPCs
- explicit Science publication controls
- no change to the production Maths question, practice, exam, grading or assignment paths until Science V0.1 passes its own gates

This gives us reuse without coupling the new subject to launch-critical Maths behaviour.

## 2. What is shared vs separate

### Shared platform infrastructure

Reuse these concepts/data:

- `school_classes`
- `class_students`
- Student ID and PIN identity
- teacher authentication / `teacher_profiles`
- current temporary student-access-ticket pattern
- mobile-first UI conventions
- teacher-only publishing workflow patterns
- assignment/progress patterns later
- Netlify deployment and Supabase client infrastructure

### Keep separate for V0.1

Do not put Science content into the Maths `questions` table yet.

Science gets its own domain:

- `science_topics`
- `science_lessons`
- `science_resources`
- `science_lesson_publications`

Later phases may add:

- `science_assignments`
- `science_assignment_targets`
- `science_student_progress`
- `science_quizzes`
- `science_questions`
- `science_quiz_attempts`
- `science_experiment_records`

Reason: the current Maths Question Bank is now a mature production resource bank with practice eligibility, exam publication, topical publication, review states and reporting. Mixing Science into it now would create unnecessary regression risk and make Maths analytics/taxonomy harder to reason about.

## 3. Student access model

### V0.1 access boundary

Do not modify `validate_student_access` on production first. It currently has a strict capability boundary for `practice` and `exam`.

Preferred transition:

1. Student signs in once through the existing Student ID + PIN flow.
2. The existing same-origin student session is available to `/science/` via sessionStorage.
3. Science requests a dedicated short-lived Science capability from a new server-side RPC, using a valid existing student capability only as proof of the already-verified identity.
4. Science RPCs accept only the Science capability.
5. No PIN is stored or passed around after sign-in.

Longer term, move from subject-specific login tickets toward a generic platform identity session plus scoped capabilities (`math_practice`, `math_exam`, `science`, etc.). Do that only after Science has proven the need.

## 4. Science learning model

The Science student experience should be lesson-first rather than question-first.

Core learning cycle:

**Learn → Explore → Practise → Check → Improve**

Resource types supported by the content model:

- `note`
- `worksheet`
- `activity`
- `experiment`
- `video`
- `infographic`
- `external_link`
- `quiz` (reserved for later quiz integration)

A lesson can contain multiple resources in an intentional sequence.

Example:

Year 4 → Plants → What Plants Need

1. Learn — short explanation / infographic
2. Explore — simple plant-needs activity
3. Practise — worksheet
4. Check — quiz (later phase)

## 5. Student V0.1 screens

### A. Science home

Show:

- Continue Science (when progress exists later)
- Featured / Today's Science lesson
- Browse by Year / Theme / Topic
- published lessons only

### B. Topic page

Show:

- topic title and description
- published lesson cards
- lesson duration
- resource-type indicators

### C. Lesson page

Show:

- title
- learning objective(s)
- success criteria
- lesson summary
- ordered resources
- clear student actions: Learn / Explore / Practise
- completion action only when progress tracking is introduced

### D. Resource viewer

V0.1 supports safe, simple resources:

- plain lesson text
- static/app asset URL
- HTTPS external URL
- PDF/worksheet link
- video link

Do not render unsanitized teacher-provided HTML.

## 6. Teacher V0.1 workflow

Target workflow:

1. Create or select Science topic.
2. Create lesson.
3. Enter learning objectives and success criteria.
4. Add ordered resources.
5. Preview student view.
6. Review lesson readiness.
7. Publish lesson explicitly.
8. Unpublish/archive without deleting content.

Publication is independent of whether the lesson/resource exists in the database.

This mirrors the successful Topical Practice principle: teacher content can be staged and reviewed while student exposure remains OFF.

## 7. Publication rules

A lesson should be student-visible only when all are true:

- lesson exists and is not archived
- lesson has valid year level and topic
- publication registry says `is_available = true`
- current time is inside optional open/close window
- at least one student-ready resource exists

Student RPCs should never return draft/unpublished lessons or hidden resources.

Teacher direct access and student delivery must be separate paths.

## 8. Resource storage strategy

### V0.1

Support references first:

- app/static asset URL
- trusted HTTPS URL
- plain text content

### V0.2

Add Supabase Storage upload management for worksheets, PDFs, images and other teacher resources.

Preferred security for private resources:

- teacher upload is authenticated and RLS-controlled
- student never receives unrestricted bucket listing access
- student resource access is validated against Science publication/access rules
- use signed/resource-scoped delivery where appropriate

Do not expose service-role credentials to the browser.

## 9. Database V0.1

See `docs/SCIENCE-V0.1-SCHEMA-DRAFT.sql`.

The V0.1 schema intentionally contains only content + publication tables. It does not change the live Maths tables or functions.

### `science_topics`

Taxonomy for Year 1–6 Science.

Suggested fields:

- id
- year_level
- theme
- title
- slug
- description
- sort_order
- archived
- created_by
- timestamps

### `science_lessons`

Lesson-level teaching content.

Suggested fields:

- id
- topic_id
- title
- summary
- learning_objectives (jsonb array)
- success_criteria (jsonb array)
- estimated_minutes
- review_status
- archived
- created_by
- timestamps

### `science_resources`

Ordered lesson resources.

Suggested fields:

- id
- lesson_id
- resource_type
- title
- description
- body_text
- resource_url
- sort_order
- student_ready
- archived
- metadata
- created_by
- timestamps

### `science_lesson_publications`

Explicit student exposure registry.

Suggested fields:

- lesson_id (unique)
- is_available
- is_featured
- opens_at
- closes_at
- published_by
- published_at
- timestamps

## 10. What V0.1 deliberately does not include

- changes to Maths Practice or Exam retrieval
- changes to Maths grading
- Science questions inside the Maths Question Bank
- AI marking
- student uploads
- experiment observations
- gamification
- parent dashboard
- live chat/social features
- public Storage buckets
- rich HTML authoring

## 11. Rollout sequence

### Gate 0 — architecture

- [x] inspect current Maths repo
- [x] inspect student session pattern
- [x] inspect topical publication pattern
- [x] inspect live Supabase core schema
- [x] isolate Science development on a feature branch

### Gate 1 — backend foundation

- [ ] create/test Science content tables in a non-production Supabase environment
- [ ] RLS + grants verified
- [ ] teacher CRUD verified
- [ ] dedicated Science student access capability designed and tested
- [ ] published-only student RPC verified
- [ ] security/performance advisors reviewed

### Gate 2 — student shell

- [ ] `/science/` mobile-first shell
- [ ] existing identity/session detected safely
- [ ] Science home
- [ ] topic browser
- [ ] lesson page
- [ ] resource viewer
- [ ] empty/loading/error states

### Gate 3 — teacher authoring

- [ ] topic management
- [ ] lesson editor
- [ ] resource ordering
- [ ] student preview
- [ ] readiness checks
- [ ] publish/unpublish

### Gate 4 — end-to-end pilot

Use one real topic only.

Recommended pilot:

- Year 4
- Plants
- What Plants Need

Minimum pilot content:

- one Learn resource
- one worksheet
- one activity/experiment
- publication state
- student phone QA
- teacher unpublish/re-publish QA

### Gate 5 — V0.1 release

Science is exposed to students only after:

- existing Maths regression tests still pass
- Science access cannot reveal unpublished content
- direct anon table access is blocked
- mobile phone workflow passes
- teacher publish/unpublish is reversible
- no change is required to Maths student credentials

## 12. Next phases

### V0.2 — assignments + completion

Add class/individual lesson assignments and student completion tracking, borrowing the current Practice Assignment target/attempt architecture.

### V0.3 — Science quiz engine

Add Science-specific question/quiz tables and server-authoritative grading. Reuse response-rendering concepts from Maths, but keep Science analytics/taxonomy separate.

### V0.4 — experiments and observations

Add predictions, variables, observation tables, conclusions and optional teacher review.

### V0.5 — analytics

Class/topic mastery, misconception views, completion, quiz performance and intervention recommendations.

## 13. Long-term platform direction

When Science is stable, the shared shell can evolve from a Maths app into a subject-neutral learning platform:

Student Login → Subject → Learning Module

Subjects can then share:

- roster
- identity
- teacher accounts
- assignments framework
- notifications
- reports
- access/security patterns

while keeping subject-specific learning engines separate where needed.
