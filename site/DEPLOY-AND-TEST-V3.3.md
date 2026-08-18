# Deploy and Test V3.3

## Before deployment

1. Confirm production is currently V3.2G.3 and Cloud Connected.
2. Do not run SQL for V3.3.
3. Preserve the production `config.js` values.
4. Run `node tests/verify-v3.3.cjs` using Node.js 18 or newer.

## Deploy preview

1. Create a branch such as `release-v3.3-site` from `main`.
2. Replace the site files with the V3.3 upgrade package.
3. Open the Netlify deploy preview before merging.

## Smoke tests

### Existing workflows

- Home displays `Version 3.3 • Learning insights` and `Cloud Connected`.
- Start and complete one Practice session.
- Open an existing submitted Exam result and confirm score/review status still renders.
- Sign in as a teacher and confirm Results, Exam Attempts, Classes & Assignments, Student Access, Review Queue, Exam Settings, Question Bank and Bulk Import still open.

### Learning insights

- Open Teacher Dashboard -> Analytics.
- Confirm Learning insights cards appear for recorded topic-level answers.
- Change Period, Class, Year and Activity; confirm overview, learning cards and student rows change together.
- Confirm a pending drawing/manual response increases `pending review` but does not lower the topic percentage.
- Confirm a topic with fewer than three scored responses says `Early evidence`.
- Click `View profile` for a student and verify topic performance and recent completed activity.
- Click `Export Learning CSV` and confirm the columns include topic, skills, learners, marks, percentage, pending review and status.

### Regression sample

- Confirm PSR Mathematics Paper 1 2025 still reports 40 questions and 90 marks.
- Confirm Q29 is a 2-mark drawing response and enters the Review Queue after submission.
- Review Q29 and confirm the final result remains correct.

## Release

Merge the preview branch only after all checks pass. Netlify may then publish `main` automatically. Create GitHub Release `v3.3` with the full and upgrade ZIP files.

## Rollback

Restore the V3.2G.3 `index.html` and redeploy. V3.3 has no database changes, so no SQL rollback is required.
