Math Practice V3.2C — Drawing & Manual Review

NEW
- Drawing response type: students can draw/annotate over a question diagram.
- Manual text response type: longer teacher-marked answers.
- Manual responses are submitted as Pending Review instead of auto-marked incorrect.
- Teacher Dashboard > Review Queue shows pending/reviewed responses.
- Teacher can award marks and leave a comment.
- Existing auto-marked response types continue to work.
- Multi-part questions can mix auto-marked and teacher-marked parts.

UPGRADE FROM V3.2B.2
1. In Supabase SQL Editor, run:
   database/06-migrate-v3.2B.2-to-v3.2C-manual-review.sql
2. Replace the DEV site's index.html with the V3.2C index.html.
3. Keep the existing working config.js and images folder.
4. Redeploy to the SAME V3.2 DEV Netlify project.
5. Hard refresh the DEV site.

FIRST TEST — Q29
- Teacher Dashboard > Question Bank > Q29 > Edit
- Response type: Drawing / annotate diagram
- Add student instructions, for example: "Draw the reflected shape on the diagram."
- Add a marking rubric.
- Keep the existing Q29 image.
- Preview as Student and confirm the drawing layer is placed over the diagram.
- Save and activate Q29 on the DEV site only.
- Submit a test drawing from the student side.
- Teacher Dashboard > Review Queue should show the drawing.
- Award marks and save the review.

IMPORTANT
- Keep the V3.1.2 live pilot untouched while V3.2C is being tested.
- V3.2C stores drawing strokes as compact JSON in session_answers.response_payload. It does not require a new student-response Storage bucket.
