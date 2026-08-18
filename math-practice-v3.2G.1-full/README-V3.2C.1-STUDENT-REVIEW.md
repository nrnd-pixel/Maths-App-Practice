# Math Practice V3.2C.1 — Student Review & Feedback

Adds a private result-code workflow so students without accounts can return after a teacher has reviewed drawing/manual responses.

## Student workflow
1. Complete a practice session while Cloud Connected.
2. The result screen shows a private code such as `A1B2-C3D4-E5F6-G7H8`.
3. The code is also remembered on that browser/device under **Check Reviewed Work**.
4. After the teacher reviews a manual/drawing response, open **Check Reviewed Work** and load the code.
5. The student sees the submitted response/drawing, review status, marks, teacher comment, and final mark total once all reviews are complete.

## Security design
The student is not given direct SELECT access to `practice_sessions` or `session_answers`. Retrieval uses a `SECURITY DEFINER` RPC that returns only the session matching the supplied high-entropy code. Keep result codes private.

## Upgrade
Run `migrate-v3.2C-to-v3.2C.1-student-review.sql`, then replace only `index.html` in the V3.2 DEV deployment. Keep the working `config.js` and image files.

Existing sessions are preserved. Existing sessions do not automatically get a result code; new sessions do.
