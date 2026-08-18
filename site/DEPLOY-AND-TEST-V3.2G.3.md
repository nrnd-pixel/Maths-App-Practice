# Deploy and Test V3.2G.3

V3.2G.3 is a client and packaged-data stabilization release. It requires no Supabase migration and preserves the V3.2G.2 security boundary.

## 1. Before deployment

1. Confirm the live site is already working on V3.2G.2.
2. Save the current production deploy or note its Netlify deploy ID for rollback.
3. Keep the existing production `config.js`; never replace it with credentials from another project.
4. Run `node tests/verify-v3.2G.3.cjs` in the full package.

## 2. Verify the existing paper

In Teacher → Questions, filter to 2025 and Paper 1. Confirm:

- 40 logical questions and 90 total marks;
- Q9 and Q31 display as grouped subparts;
- Q29 is active, worth 2 marks and uses Drawing or Manual teacher review.

Do not re-import the packaged bank over a working production paper merely to deploy V3.2G.3. The updated CSV/XLSX bank is intended for a fresh import, reconstruction, or a deliberate data correction.

## 3. Deploy web files

Publish the V3.2G.3 web files through the GitHub pull-request workflow. Netlify should build a preview before the pull request is merged. Confirm the preview badge reads `Version 3.2G.3 • Operational stabilization`.

## 4. Required preview tests

1. Sign in as a teacher and open Results, Review Queue, Exam Attempts, Classes & Assignments, Questions and Analytics.
2. Confirm all panels finish loading and the browser console shows no paging or permission error.
3. Download the question-import template and confirm its filename contains `v3.2G.3` and it has 25 columns.
4. Preview the packaged question-bank CSV. Confirm all 42 physical rows validate, representing 40 logical questions and 90 active marks.
5. Preview intentionally invalid rows and confirm the app reports the CSV row plus a specific reason before enabling Import.
6. In a non-production test paper, force an import failure after an earlier batch and confirm the message states the saved row count and failed row range.
7. Submit a student exam containing Q29. Confirm the initial result shows the full-paper total, 2 marks pending teacher review, and Q29 as Pending—not Incorrect.
8. Mark Q29 in the existing teacher Review Queue and confirm the student’s result code shows the final score and released statuses according to the configured answer-release rule.

## 5. Production and rollback

Merge only after the preview tests pass. Netlify will deploy `main` automatically. Smoke-test teacher login, Practice, Exam, result-code lookup and Q29 review.

If a client regression appears, restore the previous Netlify production deploy or revert the V3.2G.3 pull request. No database rollback is required because V3.2G.3 has no migration.
