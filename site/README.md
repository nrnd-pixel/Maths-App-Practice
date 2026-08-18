# Maths Practice V3.2G.3

V3.2G.3 is the operational stabilization release for the complete Maths Practice platform. It preserves the V3.2G.2 server-authoritative security model and all student, teacher, analytics, class, assignment, review and result-code workflows.

## What changed

- All teacher datasets load in complete, deterministic pages beyond the previous 500-row ceiling.
- CSV preview performs strict schema, response-type and multipart validation before import.
- Batch import failures report the failed CSV range and any earlier rows already saved.
- The packaged 2025 Paper 1 bank contains 40 active logical questions and 90 marks, including active 2-mark teacher-reviewed drawing question Q29.
- Q9 and Q31 include explicit multipart metadata.
- Import templates now include all supported response and multipart fields.
- V3.2G.2 server-authoritative grading, deadline enforcement and answer-release protections remain unchanged.

## Deployment

V3.2G.3 requires no SQL migration. Follow `DEPLOY-AND-TEST-V3.2G.3.md` and keep the installed V3.2G.2 database security functions unchanged.

## Compatibility

- Existing sessions, result codes, classes, assignments, exam attempts and questions are preserved.
- Teacher access and review continue under the existing RLS policies and RPCs.
- No historical result is recalculated and no production question row is modified automatically.
- The updated bank assets align fresh imports with the intended 40-question, 90-mark paper.

## Local Demo security boundary

Local Demo intentionally keeps its small built-in question bank and browser-side marking so the file can be demonstrated without Supabase. It is not an assessment-security mode: a user controlling the browser can inspect local questions, alter local storage and change local scores. Use Cloud Connected mode with the V3.2G.2 migration for real student records or assessments.

## Files

- `index.html` — V3.2G.3 client
- `DEPLOY-AND-TEST-V3.2G.3.md` — release, verification and rollback guide
- `NO-SQL-MIGRATION-V3.2G.3.txt` — database-change statement
- `README-V3.2G.3-STABILIZATION.md` — stabilization design and compatibility notes
- `tests/verify-v3.2G.3.cjs` — automated regression and package checks
- `MIGRATION-MANIFEST.md` — fresh and incremental migration order
- `README-V3.2G.2-SECURITY.md` — retained security design and threat model
