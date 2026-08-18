# V3.2G.3 Operational Stabilization

V3.2G.3 preserves the V3.2G.2 server-authoritative security model and teacher workflows while completing the deferred operational stabilization work.

## Changes

- Teacher Results, Questions, Review Queue, Exam Attempts, Classes, Students and Assignments now load every row in deterministic 500-row pages instead of silently stopping at 500.
- CSV preview validates every row before import, including required fields, number ranges, enum values, safe image paths, response-type configuration and multipart relationships.
- Imports run in explicit 100-row batches. If a later batch fails, the app reports the exact CSV row range and how many earlier rows were already saved; later batches are not attempted.
- The packaged 2025 Paper 1 bank now represents 40 active logical questions and 90 marks. Q29 is an active 2-mark drawing response routed to teacher review.
- Q9 and Q31 subparts include explicit parent question, part label, part order and shared group prompt metadata.
- The CSV and XLSX templates include the six optional response and multipart columns supported by the app.

## Compatibility

- V3.2G.2 Supabase functions, RLS policies, result codes, exam attempts, answer-release rules and teacher review behavior are unchanged.
- No schema migration is required.
- Existing production question rows are not changed automatically. If Q29 is already active and configured as a drawing/manual-review response, no database action is needed.
- The corrected question-bank assets are for fresh imports, reconstruction, or deliberate teacher-managed replacement of a paper.

## Verification

Run from this folder with Node.js:

```text
node tests/verify-v3.2G.3.cjs
```

The check compiles the inline JavaScript, exercises pagination beyond 1,000 rows, verifies the question-bank contract and multipart metadata, checks CSV header alignment and confirms every referenced image exists.
