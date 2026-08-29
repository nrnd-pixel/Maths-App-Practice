const fs = require('fs');
const path = require('path');
const assert = require('assert');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');

const readme = read('README.md');
const release = read('v40-release.js');
const config = read('config.js');
const migrations = read('DATABASE-MIGRATIONS-V5.1.txt');
const checklist = read('DEPLOY-AND-TEST-V5.1.md');

assert.match(readme,/^# Maths Practice V5\.1/m,'V5.1 README identity missing');
assert.match(readme,/release-candidate line/i,'README must describe V5.1 as the current release-candidate line');
assert.match(readme,/current production-visible identity remains \*\*V5\.0 Stable Release until final V5\.1 sign-off\*\*/i,'RC must explicitly defer visible V5.1 stable branding');
assert.match(readme,/V5\.1A — Past-paper import pipeline/);
assert.match(readme,/V5\.1B — Question Bank QA and publication safety/);
assert.match(readme,/V5\.1C — Student Exam experience/);
assert.match(readme,/787c9cccf5561dc041c74a5c498631dee28e22c9/,'README must record the accepted C2/RC base');

// RC preparation must not silently change the current production-visible identity.
assert.match(config,/Math Practice V5\.0/,'V5.1 RC must keep the current production bootstrap title until final sign-off');
assert.match(release,/Version 5\.0 • Stable Release/,'V5.1 RC must not stamp stable V5.1 branding early');

// All accepted V5.1 modules must remain in the staged release loader.
[
  'v51-paper-profile-validator.js',
  'v51-bulk-question-image-upload.js',
  'v51-paper-package-preview.js',
  'v51-one-confirmation-paper-import.js',
  'v51-post-import-integrity.js',
  'v51-question-bank-qa.js',
  'v51-question-bank-bulk-status.js',
  'v51-question-bank-bulk-metadata.js',
  'v51-question-review-workflow.js',
  'v51-question-change-history.js',
  'v51-multipart-question-management.js',
  'v51-exam-publication-safety.js',
  'v51-student-exam-paper-library.js',
  'v51-student-exam-resume-progress.js'
].forEach(name => assert(release.includes(name),`V5.1 RC loader missing ${name}`));

assert.match(migrations,/20260828155458 v51b2c_question_review_workflow/);
assert.match(migrations,/20260828225115 v51b2d_question_change_history/);
assert.match(migrations,/20260829011834 v51b2e_multipart_question_management/);
assert.match(migrations,/20260829181613 v51b3_exam_publication_bulk_cleanup/,'V5.1 migration record must include the synchronized production head');
assert.match(migrations,/V5\.1C2 — no new database migration required/);
assert.match(migrations,/Do not run SQL solely to deploy the V5\.1 release candidate/);

[
  'V5.1A — paper import pipeline smoke test',
  'V5.1B — Question Bank QA and publication safety',
  'V5.1C1 — Student Exam Paper Library',
  'V5.1C2 — Exam resume and progress clarity',
  'Existing Practice / Exam regression smoke test',
  'Teacher workflows and reporting',
  'Responsive / accessibility smoke test',
  'Final RC decision'
].forEach(text => assert(checklist.includes(text),`V5.1 RC checklist missing: ${text}`));

assert.match(checklist,/Resume available/);
assert.match(checklist,/Continue Exam/);
assert.match(checklist,/2025 · Paper 1/);
assert.match(checklist,/40 questions \/ 90 marks/);
assert.match(checklist,/AI Help is not exposed in Exam Mode/);
assert.match(checklist,/V5 Regression Safety is green on the exact candidate head/);

console.log('V5.1 release candidate checks passed.');
console.log('- V5.1 A/B/C1/C2 loader coverage verified');
console.log('- synchronized V5.1 database migration record verified');
console.log('- final one-pass RC checklist verified');
console.log('- visible V5.1 stable branding remains deliberately deferred until final sign-off');
