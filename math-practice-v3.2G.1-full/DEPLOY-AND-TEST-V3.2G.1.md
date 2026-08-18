# Deploy and Test V3.2G.1

## Deploy

1. Do not run any SQL for V3.2G.1.
2. Copy the working `config.js` from the currently deployed V3.2F.3 package into the V3.2G.1 upgrade folder if it is not already present.
3. Confirm `index.html` and the configured `config.js` are directly inside the deployment folder.
4. Drag the V3.2G.1 upgrade folder into Netlify Deploys.
5. Wait for Published, then hard-refresh the site with `Ctrl + Shift + R`.
6. Confirm the home screen shows Version 3.2G.1.

## Analytics checks

1. Sign in to Teacher Dashboard and open Analytics.
2. Check that the overview loads without an error.
3. Change Period, Class, Year and Activity filters.
4. Search for a known Student ID.
5. Confirm Practice-only excludes Exam activity and Exam-only excludes Practice sessions.
6. Confirm an in-progress Exam is not shown as completed.
7. Confirm a submitted Exam awaiting manual review is not included in Average final exam.
8. Complete its teacher review and confirm it becomes fully marked and contributes to the final average.
9. Export Summary CSV and verify that it reflects the current filters.

## V3.2F.3 regression

1. Open access: start one Practice session and one Exam.
2. Student ID restriction: reject an unknown ID and accept an active roster ID.
3. Student ID + PIN: reject a wrong PIN and accept the correct PIN.
4. Resume an interrupted Exam and confirm saved responses remain.
5. Submit an Exam and retrieve it using its result code.
6. Review a manual/drawing response and confirm the student's final result updates.
7. Confirm Classes, Assignments, Student Access, Review Queue, Exam Settings and Question Bank still open normally.
