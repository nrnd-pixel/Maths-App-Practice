# Maths Practice V5.1

V5.1 is the **Stable Release** for Maths Practice. It builds on the signed-off V5.0 foundation and releases a safer past-paper content pipeline, stronger Question Bank quality controls, guarded Exam publication, and a clearer student Exam experience.

The visible application identity is **V5.1 Stable Release**. V5.1 preserves the established grading rules, Practice/Exam separation, AI-free Exam boundaries, student identity/security rules, teacher-review authority and reporting semantics.

## V5.1 scope

### V5.1A — Past-paper import pipeline

V5.1A makes the existing 25-column question import workflow safer and easier to operate:

- paper-profile validation for Paper 1 and Paper 2;
- bulk question-image matching/upload to the existing Storage path;
- abandoned image-batch cleanup and image-persistence safeguards;
- full digitisation-package preview using `questions.csv`, `manifest.json`, `audit_report.xlsx` and matched images;
- one-confirmation validated paper import;
- post-import integrity verification against the live Question Bank and Exam Settings state.

The 25-column CSV contract remains unchanged.

### V5.1B — Question Bank QA and publication safety

V5.1B adds teacher-facing controls around existing Question Bank data:

- Question Bank QA and completeness checks;
- safe bulk activate/deactivate;
- safe bulk metadata editing;
- persistent question review workflow;
- append-only correction audit history;
- multipart-question management;
- guarded Exam publication/readiness controls.

Exam publication remains explicit. A paper is not exposed to students merely because question rows exist or are active.

### V5.1C — Student Exam experience

V5.1C improves the student-facing Exam entry/recovery experience while keeping the established secure Exam engine authoritative:

- **C1 — Student Exam Paper Library:** students see only papers that are currently published for their year and choose from a clearer past-paper library;
- **C2 — Student Exam Resume & Progress Clarity:** an unfinished paper on the current device shows `Resume available`, answered-question progress, current question, flags, last-save state and timer/deadline state before the student continues.

C2 is presentation-only over the existing secure attempt/recovery implementation. It does not create attempts, alter autosave, change grading, retrieve questions through a new path, or modify publication rules.

## Accepted baselines

- V5.0 Stable Release: established production foundation before V5.1.
- V5.1B3 accepted publication-safety merge: `48483029840114e766610eda93f4827e173a78c3`.
- V5.1C1 accepted merge: `64e12d9b97aa9adb67aa9151c1597efb05a55fbb`.
- V5.1C2 accepted merge: `787c9cccf5561dc041c74a5c498631dee28e22c9`.
- V5.1 Release Candidate accepted merge / stable-release base: `5c625f6103f037a6bdce592eb985df0ad47a9f42`.

## Database status

V5.1A, C1 and C2 require no new database migration. V5.1B introduced the Question Bank review/audit/multipart/publication-safety database layers.

The synchronized production database is healthy and its migration history at V5.1 release preparation ends at:

- `20260829181613 v51b3_exam_publication_bulk_cleanup`

See the repository-root `CHANGELOG.md` for the consolidated V5.1 migration record and deployment guidance.

## Production content state at V5.1 release preparation

The synchronized production Question Bank contains:

- 237 total question rows;
- 235 active rows;
- 230 past-paper rows;
- 7 practice rows;
- 0 unresolved `needs_review` rows.

Complete active paper profiles include 2025 Paper 1, 2025 Paper 2, 2024 Paper 1, 2022 Paper 1 and 2020 Paper 2. 2019 Paper 2 remains intentionally incomplete at 29/30 active logical questions and 87/90 active marks.

Only **2025 Paper 1** is currently published to students in Exam Mode. Publication state remains controlled by the guarded Exam Settings flow.

## Security and assessment boundaries

V5.1 preserves the established production boundaries:

- student PINs are never stored in browser persistence;
- Practice and Exam use separate temporary access paths;
- Practice grading remains server-authoritative;
- Exam Mode remains deterministic and AI-free;
- teacher-review responses remain under teacher authority;
- answer release remains server-controlled;
- published Exam papers require explicit availability settings;
- student Exam recovery reuses the established attempt/resume/autosave implementation;
- V5.1C presentation layers do not write or delete recovery state.

## Release validation

The repository-root `CHANGELOG.md` now contains the consolidated V5.1 deploy/test acceptance record. The accepted V5.1 RC passed GitHub V5 Regression Safety and Netlify validation without changing runtime application files. The final stable-release stamp changes release identity/presentation and matching regression assertions only.

Before merging the final stable-release stamp:

- V5 Regression Safety must pass on the exact stable candidate head;
- Netlify Deploy Preview must pass on the exact stable candidate head;
- the start screen must show `Version 5.1 • Stable Release`;
- Teacher → Release Audit must identify the stable V5.1 baseline and keep its functional/security/polish checks usable;
- C1 paper-library and C2 resume behavior must remain unchanged.

## Release discipline

The `release/v5.1-stable` branch is a release-stamp branch only. Do not add unrelated feature work to it.

After final V5.1 Stable Release merge, treat the resulting clean `main` commit as the production baseline for subsequent development. Preserve the production Supabase configuration and do not re-run historical V5.1 migrations solely because the application version changed.
