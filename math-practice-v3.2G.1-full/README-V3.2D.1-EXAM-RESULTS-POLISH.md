# Math Practice V3.2D.1 — Exam Results Polish

This release improves the student-facing Exam Mode result experience without changing the V3.2D database schema or teacher marking workflow.

## Student result improvements

- Full-paper score is the primary score, including marks still awaiting review.
- Separate Auto-marked and Teacher-marked breakdowns.
- Teacher review pending, Review complete, and Final score available states.
- Questions answered, questions in paper, time taken, pending-response count, and private result code.
- Clear answer-card states: Correct, Incorrect, Unanswered, Awaiting teacher review, and Teacher reviewed.
- Unanswered responses no longer look the same as incorrect answers.
- Manual responses show pending marks until the teacher reviews them.
- A direct Check Reviewed Work shortcut remains available after a cloud-backed exam submission.
- Reviewed Work changes from marks awarded so far to Final score once all manual responses have been reviewed.

## Teacher compatibility

The teacher dashboard, review queue, marks entry, comments, and result lookup continue to use the V3.2D data model and RPC functions. No teacher-side database or workflow change is required.

## Upgrade from V3.2D

Replace only `index.html`, keeping the existing `config.js` and `images/` folder. Redeploy and hard refresh.

## SQL decision

No V3.2D.1 SQL migration is included because the existing V3.2D schema already stores all required values: full marks, auto-awarded marks, pending-review marks, duration, paper question count, answer review status, teacher marks/comments, and result code.

## Compatibility with saved results

Existing V3.2D results remain compatible. New V3.2D.1 submissions include question-number context in the existing `question_snapshot` field, allowing grouped multipart questions to be counted as one question in Reviewed Work. Older results may display `Not recorded` for Questions answered; no data is altered or discarded.

## Suggested acceptance test

1. Submit a paper containing a correct answer, an incorrect answer, an unanswered question, and a drawing/manual response.
2. Confirm the primary denominator is the full paper total.
3. Confirm the answer cards show four distinct states.
4. Open Check Reviewed Work using the result code and confirm the pending marks and time.
5. Mark the manual response from the teacher review queue.
6. Reopen Reviewed Work and confirm Review complete, the final score, teacher marks, and teacher feedback.
