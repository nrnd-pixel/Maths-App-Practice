# Maths Practice V5.7 Stable Release Checkpoint

Date: 2026-09-03

## Accepted base

- Production `main` before this checkpoint: `4a5759ed81a89449531ae061b1de6e4f722dc86b`
- Accepted feature sequence: V5.7A through V5.7D, including V5.7A.1/A.2 resume hardening and V5.7D.1 Teaching Focus Plan fallback
- Supabase project: `SR Lumapas Math Practice`
- No new Supabase migration or data mutation is required by this stable checkpoint

## V5.7 accepted scope

### V5.7A — Cross-Device Past Paper Resume

Past Paper Practice now stores a secure server-backed unfinished checkpoint for the authenticated roster student. Students can start on one device and continue on another with the selected paper, question order and completed Practice evidence preserved. The accepted V5.5C same-device checkpoint remains as a fallback, and stale local checkpoints are removed when the same work has already been completed elsewhere. PINs, access tokens, correct answers, explanations and hint text are not stored in the checkpoint payload.

### V5.7B — Better Teacher Assignment Management

Teachers can inspect Past Paper Practice assignments with Assigned, Not Started, In Progress, Completed and Overdue status counts, review individual learner completion, edit availability/due dates, close or reopen an assignment without deleting work, and deliberately reassign as new while preserving the original assignment and results.

### V5.7C — Student Continue Learning Home

The signed-in Home screen now prioritises the most useful Practice action: saved Past Paper work first, then teacher assignments, then recommended Practice and finally general Learn access. Recent Practice activity is surfaced without requiring Exam access, and the Practice-first student entry remains intact.

### V5.7D — Past Paper Analytics Actions

Teacher Past Paper Analytics now turns read-only evidence into safe next steps. Teachers can prepare an unassigned-incomplete cohort or support re-practice cohort in the existing assignment form, open the V5.7B assignment manager, and generate a Teaching Focus Plan containing class coverage, support learners, weakest questions and topic/skill focus. V5.7D never submits the final assignment automatically.

### V5.7D.1 — Teaching Focus Plan Copy Fallback

The Teaching Focus Plan always opens visibly in-app before copying. Browsers that allow clipboard access can use Copy Plan; restricted contexts retain Select All and manual copy so the plan remains usable without relying on clipboard permissions.

## Stable release identity

The final V5.7 presentation advances to:

- Document title: **Math Practice V5.7**
- Start badge: **Version 5.7 • Stable Release**
- Release Audit heading: **V5.7 Release Audit**
- Release note: summarizes cross-device continuity, assignment management, Continue Learning and analytics actions

The accepted V5.6, V5.5 and V5.4 stable/audit foundations remain retained below the V5.7 checkpoint. V5.7 adds a new checkpoint summary rather than rewriting historical release evidence.

## Product boundaries retained

- Student entry remains Practice-first under the accepted V5.6.1 rollout.
- Exam Mode remains preserved in code, data, teacher publication controls, existing attempts and historical results, while its student entry point remains hidden.
- Mixed Practice, Topic Practice and Past Paper Practice retain deterministic grading and their accepted feedback behaviour.
- V5.7E is presentation/audit-only and makes no network calls.
- V5.7E does not change Supabase data, authentication, grading, Practice retrieval, assignment/result/question writes or the preserved Exam engine.
- No answer keys, correct-answer snapshots, PINs or student access tokens are added to the V5.7 checkpoint layer.

## Release gates

Before merge:

1. Existing V5 Regression Safety remains green on the exact PR head.
2. V5.4, V5.5 and V5.6 Stable Release Checkpoint workflows remain green.
3. V5.5/V5.6 Past Paper regressions remain green.
4. V5.7A, V5.7B, V5.7C and V5.7D/V5.7D.1 regressions remain green.
5. V5.7 Stable Release Checkpoint CI is green.
6. Netlify deploy preview is green.
7. Student smoke test: title/badge show V5.7 Stable Release; Practice-first Home, cross-device resume, My Assignments and My Progress open normally; Exam entry remains hidden.
8. Teacher smoke test: assignment management, Past Paper Analytics actions, Teaching Focus Plan and Release Audit open normally.
9. Release Audit shows the V5.7 checkpoint above the retained V5.6, V5.5 and V5.4 audit foundations.

No new Supabase migration or data mutation is required for this release checkpoint.
