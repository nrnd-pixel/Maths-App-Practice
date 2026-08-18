# V3.2E deployment and testing

## Deploy to DEV

1. In Supabase SQL Editor, run `migrate-v3.2D.1-to-v3.2E-exam-settings.sql`.
2. Confirm the query returns one row per existing year/paper combination. Defaults should be: no timer, immediate answer release, available.
3. Back up the current DEV deployment folder.
4. Replace only `index.html` from the upgrade package. Keep the existing working `config.js` and `images/`.
5. Redeploy the same DEV site and hard-refresh it.

## V3.2E focused checks

- Teacher Dashboard → Exam Settings lists every year/paper combination from the question bank.
- Save a no-timer paper; the student sees “No countdown timer” and the exam header says “No timer”.
- Save a timed paper; the student instructions show the duration and the exam displays a countdown.
- Temporarily use a short test duration in SQL if needed to verify warning styling and automatic expiry submission. Confirm the last visible response is included in the saved result.
- Set a paper unavailable; confirm it disappears from Exam Mode but remains in the question bank and Practice Mode.
- Immediate release: submitted answers and correct answers appear at submission.
- After manual review: answers remain withheld while Q29 is pending, then become available through the same result code after Q29 is reviewed.
- Never release: scores/teacher feedback remain accessible, but correct-answer snapshots and explanations are not returned by the result-code RPC.

## V3.2D.1 regression checks

- Practice Mode: number, fraction, number + unit, multi-blank, multiple choice, hints, second attempt and explanations.
- Topic filtering: Capacity & Volume and Rates & Ratio.
- Grouped questions: Q9 and Q31 remain grouped; exam navigator still shows 40 question items for PSR 2025 Paper 1.
- Exam navigation: previous/next, answer persistence, partly answered state, flags and unanswered warning.
- Q29: drawing response enters Review Queue and is not marked incorrect.
- Teacher Dashboard: results, question edit/preview/duplicate, active/inactive, filters and image handling.
- Results: full score `/90`, auto/teacher split, pending-review wording, result code, Reviewed Work shortcut, final score and teacher feedback after review.

Do not update the live pilot until the DEV checks pass.
