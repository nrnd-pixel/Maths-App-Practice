# Maths Practice V3.2F.1 — Recoverable Exam Attempts

V3.2F.1 protects Exam Mode work from the moment a student starts a paper. Practice Mode and the V3.2E settings system remain unchanged.

## Included

- A protected attempt record is created when an exam begins.
- Responses are saved on the device immediately and synced after edits/navigation and every 15 seconds.
- Interrupted attempts resume with answers, drawings, flags and the current question restored.
- Timed attempts retain the original server-generated deadline; refreshing does not reset time.
- The final visible response is captured before timer-expiry submission.
- A Student ID cannot silently create a second in-progress attempt for the same paper.
- Final submission is atomic and retry-safe: one attempt creates one official result.
- Teacher Dashboard → Exam Attempts shows status, progress, timestamps, flags and submission type.
- Teachers can mark a genuinely abandoned attempt incomplete, allowing the Student ID to start the paper again.

## Security model

Anonymous students do not receive direct access to the attempt table. Start, save and finalize operations use narrowly scoped database functions and a random per-attempt resume token stored on the student's device. Teachers retain read access through the existing teacher-profile check.

Result codes, `practice_sessions`, `session_answers`, Q29 manual review and V3.2E answer-release rules remain the official post-submission workflow.

Run `migrate-v3.2E-to-v3.2F.1-exam-attempts.sql` before deploying the new `index.html`.
