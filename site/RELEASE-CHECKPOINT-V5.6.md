# Maths Practice V5.6 Stable Release Checkpoint

Date: 2026-09-02

## Accepted base

- Production `main` before this checkpoint: `a972fd5fdda4f44e7d314f0442c066f95aa9160e`
- Accepted feature sequence: V5.6A through V5.6D, including V5.6A.1 bulk Practice confirmation bridge
- Supabase project: `SR Lumapas Math Practice`
- No new Supabase migration or data mutation is required by this stable checkpoint

## V5.6 accepted scope

### V5.6A — Question Bank Response-Type Filter

Teacher Question Bank browsing can filter by response type, including drawing/manual teacher-review items, without changing question status merely by filtering. Non-topical teacher-review filters support safer use of the existing Practice eligibility controls.

### V5.6A.1 — Bulk Practice Confirmation Bridge

Bulk Add/Remove from Practice uses an explicit in-app confirmation path so embedded browsers do not depend on native `window.confirm` behaviour. The bridge routes confirmed actions through the established bulk Practice eligibility workflow and performs no database write itself.

### V5.6B — Teacher-Assigned Past Paper Practice

Teachers can assign a currently Practice-eligible past paper to a whole class, selected students, or multiple same-year classes. Assignments can use a Quick Session or All Available Questions and remain Practice Mode with the accepted Past Paper engine, feedback, result attribution and same-device resume behaviour.

### V5.6C — Student Past Paper Progress

The secure student My Progress area now shows paper-level status, cumulative current-question coverage, latest first-try/mastery percentages, Past Paper session count, teacher-assignment context and available actions such as Start Practice, Practise Again, Continue Saved Practice and View Latest Result when applicable.

### V5.6D — Teacher Past Paper Analytics

Authenticated teachers can analyse one class and past paper at a time using read-only roster/performance analytics. The view includes completion/coverage summaries, latest first-try/mastery averages, student status comparison, teacher-assigned versus self-selected context, weakest attempted questions and topic/skill focus based on answer-level learning evidence.

## Stable release identity

The final V5.6 presentation advances to:

- Document title: **Math Practice V5.6**
- Start badge: **Version 5.6 • Stable Release**
- Release Audit heading: **V5.6 Release Audit**
- Release note: summarizes Question Bank response controls, teacher Past Paper assignment, student Past Paper progress and teacher Past Paper analytics

The established V5.5 stable checkpoint and the V5.4 RC1-RC3 functional, security and production-polish audit foundation remain retained. V5.6 adds a new checkpoint summary rather than rewriting historical release evidence.

## Product boundaries retained

- Student modes remain Practice and Exam.
- Mixed Practice, Topic Practice and the V5.5 Past Paper Practice engine retain their established behaviour.
- Exam Mode remains explicitly published, deterministic and AI-free.
- V5.6E is presentation/audit-only and makes no network calls.
- V5.6E does not change Supabase data, authentication, grading, question retrieval, Practice assignment/result/question writes or Exam publication.
- No answer keys, correct-answer snapshots, PINs or student access tokens are added to the V5.6 checkpoint layer.

## Release gates

Before merge:

1. Existing V5 Regression Safety remains green on the exact PR head.
2. V5.4 and V5.5 Stable Release Checkpoint workflows remain green.
3. V5.5 Past Paper regressions remain green.
4. V5.6A, V5.6B, V5.6C and V5.6D regressions remain green.
5. V5.6 Stable Release Checkpoint CI is green.
6. Netlify deploy preview is green.
7. Student smoke test: title/badge show V5.6 Stable Release; ordinary Practice, Past Paper Practice, My Assignments, My Progress and Exam Mode open normally.
8. Teacher smoke test: Question Bank response filters, Assign Past Paper Practice, Teacher Results, Analytics, Past Paper Analytics and Release Audit open normally.
9. Release Audit shows the V5.6 checkpoint above the retained V5.5 and V5.4 audit foundation.

No new Supabase migration or data mutation is required for this release checkpoint.
