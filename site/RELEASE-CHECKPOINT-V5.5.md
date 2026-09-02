# Maths Practice V5.5 Stable Release Checkpoint

Date: 2026-09-02

## Accepted base

- Production `main` before this checkpoint: `ab90f2b2e5d2078346794a6cd977ec542ea02fd0`
- Accepted feature sequence: V5.5A through V5.5D, including the V5.5C.1 resume button bridge
- Supabase project: `SR Lumapas Math Practice`
- No Supabase migration or data mutation is required for this checkpoint

## V5.5 accepted scope

### V5.5A — Past Paper Practice Library

Students can choose Past Paper Practice inside Practice Mode, select an available exam year and paper, and practise only currently authorised Practice-bank questions from that source. Mixed Practice, Topic Practice and Exam Mode remain separate.

### V5.5B — Full Available Past-Paper Practice

Past Paper Practice offers two scopes:

- **Quick Session** keeps the existing 5 / 10 / 15 / 20 Practice-session length.
- **All Available Questions** uses every currently Practice-eligible logical question from the selected paper in source question-number order.

This remains Practice Mode with normal hints, second attempts, AI Learning Help, grading and Practice saving.

### V5.5C — Resume Past Paper Practice

Same-device Past Paper Practice checkpoints allow a student to continue a longer session at the next unanswered logical question. Checkpoints expire after 7 days, exclude PINs/access tokens/answer keys/hints/explanations, and revalidate the current authorised Practice bank before restoration.

### V5.5C.1 — Resume Button Bridge

The Practice Next Question control is explicitly rebound to the V5.5C checkpoint-aware navigation path so progress is saved after completed logical questions.

### V5.5D — Past Paper Practice Result Attribution

Completed Past Paper Practice sessions are identified using the existing Practice session fields:

- `practice_mode = past_paper`
- selected `exam_year`
- selected `paper`
- teacher-facing Activity label based on the selected year and paper

Question-level topic and skill evidence remains unchanged for learning analytics.

## Stable release identity

The final V5.5 presentation advances to:

- Document title: **Math Practice V5.5**
- Start badge: **Version 5.5 • Stable Release**
- Release Audit heading: **V5.5 Release Audit**
- Release note: summarizes Past Paper Practice, Quick Session / All Available Questions, same-device resume and teacher result attribution

The established V5.4 RC1-RC3 functional, security and production-polish audits remain the underlying foundation. V5.5 adds a separate checkpoint summary for the accepted V5.5A-D sequence rather than rewriting the historical V5.4 audit evidence.

## Product boundaries retained

- Student modes remain Practice and Exam.
- Mixed Practice and Topic Practice retain their existing behaviour.
- Exam Mode remains explicitly published, deterministic and AI-free.
- Student access, grading, hints, AI Learning Help, recommendations, assignments, reporting and Reviewed Work contracts are not changed by the V5.5 stable checkpoint.
- No answer keys, PINs or student access tokens are added to the V5.5 checkpoint layer.

## Release gates

Before merge:

1. Existing V5 Regression Safety must remain green on the exact PR head.
2. V5.4 Stable Release Checkpoint CI must remain green on the same head.
3. V5.5A, V5.5B, V5.5C and V5.5D regression workflows must remain green.
4. V5.5 Stable Release Checkpoint CI must be green.
5. Netlify deploy preview must be green.
6. Student smoke test: title/badge show V5.5 Stable Release; Mixed Practice, Topic Practice, Past Paper Practice, resume and Exam Mode open normally.
7. Past Paper smoke test: Quick Session and All Available Questions remain available, source ordering remains correct, resume still works, and completed work retains year/paper attribution.
8. Teacher smoke test: Results still show the selected past-paper Activity and Release Audit shows the V5.5 checkpoint above the retained V5.4 audit foundation.

No Supabase migration or data mutation is required for this release checkpoint.
