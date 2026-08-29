# V5.1 Release Candidate — Deploy & Test

Candidate base: `787c9cccf5561dc041c74a5c498631dee28e22c9`

This is a release-candidate validation pass only. Do not add unrelated feature work while running this checklist.

## 1. Candidate identity and safety

- [ ] Open the exact Netlify Deploy Preview for the `release/v5.1-rc` PR.
- [ ] Confirm the app still shows **V5.0 Stable Release**. V5.1 stable branding is deliberately deferred until final sign-off.
- [ ] Confirm GitHub **V5 Regression Safety** passes on the exact candidate head.
- [ ] Confirm no SQL is required solely for this RC; production migration history should already include `20260829181613 v51b3_exam_publication_bulk_cleanup` or a later deliberate migration.

## 2. V5.1A — paper import pipeline smoke test

Teacher → Question Bank / import workflow:

- [ ] Open the package preview workflow and confirm `questions.csv`, `manifest.json`, `audit_report.xlsx` and image matching can be inspected without an automatic write.
- [ ] Confirm Paper Profile QA still distinguishes physical rows from logical questions and checks Paper 1 = 40 logical questions / 90 marks and Paper 2 = 30 logical questions / 90 marks.
- [ ] Confirm bulk image matching still reports matched/missing/orphan files and does not silently import unresolved local image references.
- [ ] Confirm one-confirmation import remains disabled for an invalid/incomplete package and available only for a clean validated package with new rows.
- [ ] Do not deliberately import duplicate production content merely for RC testing.
- [ ] Confirm the post-import integrity panel remains available and read-only when verifying an already imported paper.

## 3. V5.1B — Question Bank QA and publication safety

Teacher → Question Bank:

- [ ] Confirm QA summary loads and Question Bank cards remain usable.
- [ ] Confirm bulk activate/deactivate selection controls are present.
- [ ] Confirm bulk metadata editing exposes only the established safe metadata fields.
- [ ] Confirm Question Review state/filter controls are present.
- [ ] Select one multipart sibling and confirm multipart-group inspection loads the complete group.
- [ ] Select one question and confirm Correction Audit History loads read-only history when records exist.

Teacher → Exam Settings / publication controls:

- [ ] Confirm the guarded V5.1B3 Exam publication/readiness interface loads.
- [ ] Confirm only papers passing the established readiness rules can be published.
- [ ] Confirm current production intent remains: **2025 Paper 1 available**, other configured papers unavailable unless deliberately changed by the teacher.
- [ ] Do not change publication state solely for RC testing.

## 4. V5.1C1 — Student Exam Paper Library

Student start screen:

- [ ] Sign in with the normal registered-student flow.
- [ ] Choose Exam Mode.
- [ ] Confirm the past-paper library is shown cleanly on desktop/mobile width.
- [ ] Confirm only currently available papers are shown.
- [ ] Confirm **2025 · Paper 1** shows 40 questions / 90 marks and is selectable.
- [ ] Start 2025 Paper 1 and confirm all 40 logical questions load in the established secure Exam Mode.
- [ ] Navigate forward/back and confirm entered responses remain attached to the correct question.

## 5. V5.1C2 — Exam resume and progress clarity

Using 2025 Paper 1:

- [ ] Answer at least one question.
- [ ] Flag a question if practical.
- [ ] Use **Leave Exam** and confirm leaving.
- [ ] Immediately on the start screen, confirm **Resume available** appears without waiting or changing selectors.
- [ ] Confirm the normal start control says **Continue Exam** for the matching unfinished attempt.
- [ ] Confirm answered count, current question, flags, last-save state and timer/deadline wording are sensible.
- [ ] Click **Continue Exam**.
- [ ] Confirm the previously entered response is restored correctly.
- [ ] Confirm the secure Exam engine remains authoritative; C2 itself must not create, save, submit or grade attempts.

## 6. Existing Practice / Exam regression smoke test

Practice:

- [ ] Start a normal Practice session.
- [ ] Confirm answer submission and deterministic grading work.
- [ ] Confirm Hint/AI Help remains available only in the established Practice contexts.
- [ ] Confirm Practice completion/result flow works.

Exam:

- [ ] Confirm AI Help is not exposed in Exam Mode.
- [ ] Confirm Exam navigation, flags, autosave state and submission controls remain usable.
- [ ] Do not submit a production test attempt unless that evidence is intentionally wanted.

## 7. Student progress and assignments

- [ ] My Progress loads the consolidated progress overview and existing topic drill-down.
- [ ] Practice Assignments load and existing due-date/deadline presentation remains intact.
- [ ] No duplicate retired V4.9 progress panels appear.

## 8. Teacher workflows and reporting

- [ ] Teacher Dashboard opens normally.
- [ ] Analytics loads.
- [ ] Class Performance Report opens and print/PDF layout remains usable.
- [ ] Student Performance Report opens and remains usable.
- [ ] CSV report export remains available.
- [ ] Report Archive loads and existing archived snapshots remain isolated from live evidence.
- [ ] Classes & Assignments and teacher operational tools load normally.
- [ ] Release Audit remains usable.

## 9. Responsive / accessibility smoke test

- [ ] Student start screen and paper library are clean at narrow/mobile width.
- [ ] Resume card is readable at narrow/mobile width.
- [ ] Teacher Dashboard tabs remain usable at narrow width.
- [ ] Dark Mode remains readable across student start, Exam library/resume and Teacher Dashboard.
- [ ] Keyboard focus/close behavior remains intact for established accessible dialogs.

## 10. Final RC decision

Before final V5.1 stable release preparation:

- [ ] V5 Regression Safety is green on the exact candidate head.
- [ ] Netlify Deploy Preview is green on the exact candidate head.
- [ ] Sections 1–9 are accepted or any deliberately deferred cosmetic issue is documented.
- [ ] No unresolved core grading, access-control, publication, autosave/resume, question-integrity or data-safety defect remains.

After this checklist passes, create a separate final V5.1 Stable Release slice for visible V5.1 branding/release stamping. Do not mix new feature development into that final release stamp.
