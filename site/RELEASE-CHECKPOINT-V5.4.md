# Maths Practice V5.4 Stable Release Checkpoint

Date: 2026-09-01

## Accepted base

- Production `main` before this checkpoint: `e6bf783489f306560c4066a60dafede3e1edc4a4`
- Accepted feature sequence: V5.4A through V5.4G
- Open pull requests at checkpoint start: 0
- Supabase project: `SR Lumapas Math Practice`

## Production Practice-bank invariants at checkpoint start

- Practice-eligible physical rows: **527**
- Topical-origin Practice-eligible physical rows: **292**
- Active topical rows: **0**
- Partially eligible non-topical multipart groups: **0**

## V5.4 accepted scope

### V5.4A — Unified Practice Resource Bank Visibility

Teacher Question Bank exposes Practice resource origin/status clearly across past-paper and topical-exercise rows.

### V5.4B — Teacher Practice Eligibility Controls

Teachers can safely add/remove individual non-topical logical questions from the Practice pool. Multipart groups remain all-or-none and topical rows remain managed by whole set.

### V5.4C — Compact Question Bank Browsing

Compact/Detailed card views reduce Question Bank scanning height while preserving question text, Practice status and actions.

### V5.4D — Topical Resource Library Simplification

Obsolete legacy topical publication controls are removed from the normal teacher UI while the rollback backend remains recoverable.

### V5.4E — Bulk Practice Eligibility Controls

The established Question Bank selection system supports atomic bulk Add/Remove Practice actions without introducing a second selection store.

### V5.4F — Bulk Selection Scope Safety

Question Bank filters/search and topical scope changes lock while a bulk selection is active, preventing hidden stale selections from remaining armed.

### V5.4G — Paged Manual Bulk Selection

Ordinary manual selection stays on the current 50-card page with paging locked. Explicit Select all filtered and topical Select set retain full-scope selection behavior.

## Student product boundary

- Student modes remain **Practice** and **Exam** only.
- Practice retrieves from the unified Practice resource bank.
- Exam Mode remains explicitly published, deterministic and AI-free.
- Grading, hints, submissions, assignments, recommendations, reporting and Reviewed Work boundaries are unchanged by the V5.4 stable checkpoint.

## Stable release identity

The final production presentation is advanced to:

- Document title: **Math Practice V5.4**
- Start badge: **Version 5.4 • Stable Release**
- Release Audit: **V5.4 Release Audit**
- Start release note: summarizes Practice + Exam, the unified Practice resource bank and the accepted V5.4 teacher-management improvements.

The historical V5.1 bootstrap/release presenter and V5.1 migration/checklist records remain in the repository for recovery and traceability. Current production branding is applied by the audited production-polish layer and the final `v54-stable-release-checkpoint.js` presentation layer.

## Release gates

Before merge:

1. Existing V5 Regression Safety must remain green on the exact PR head.
2. V5.4 Stable Release Checkpoint CI must be green on the same exact head.
3. Netlify deploy preview must be green.
4. Teacher smoke test: sign in, open Question Bank, verify compact/paged browsing and Practice management surfaces still render normally.
5. Student smoke test: confirm the start screen shows Practice + Exam and both modes open normally.
6. Confirm V5.4 title, badge and release note are visible.
7. Recheck the four production Practice-bank invariants before merge.

No Supabase migration or data mutation is required for this release checkpoint.
