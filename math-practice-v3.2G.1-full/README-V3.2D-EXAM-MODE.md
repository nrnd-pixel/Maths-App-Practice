# Math Practice V3.2D — Practice + Exam Mode

V3.2D adds a full-paper Exam Mode while preserving the existing Practice Mode.

## Exam Mode
- Select Year, Exam Year and Paper.
- Loads the complete active paper in question-number order.
- Multi-part questions stay grouped.
- Previous / Next navigation and a 40-question style navigator.
- Answered, partly answered, unanswered and flagged states.
- Answers persist while moving between questions.
- No hints, second attempts or correctness feedback before submission.
- Drawing/manual questions are sent to the teacher Review Queue.
- Private result code remains available for reviewed marks and feedback.
- Elapsed time is recorded; no countdown time limit is imposed yet.

## Upgrade
1. Run `migrate-v3.2C.1-to-v3.2D-exam-mode.sql` in Supabase SQL Editor.
2. Keep your existing working `config.js` and `images/`.
3. Replace `index.html` in the V3.2 DEV deployment folder.
4. Redeploy to the same DEV Netlify site and hard refresh.

Do not run the fresh schema on an existing project.
