const fs = require('fs');
const path = require('path');
const assert = require('assert');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');
const changelog = fs.readFileSync(path.join(site,'..','CHANGELOG.md'),'utf8');

const readme = read('README.md');
const release = read('v40-release.js');

// The former V5.1 release-candidate records now live in the repository changelog.
// The current V5.1 README is the signed-off stable record, so this verifier checks
// that the historical RC evidence remains recoverable without depending on retired files.
assert.match(readme,/^# Maths Practice V5\.1/m,'V5.1 README identity missing');
assert.match(readme,/V5\.1 is the \*\*Stable Release\*\*/,'V5.1 stable README record missing');
assert.match(changelog,/## V5\.1 — Stable Release \/ content pipeline, Question Bank safety and Exam experience/);
assert.match(changelog,/Release-candidate base: `787c9cccf5561dc041c74a5c498631dee28e22c9`/,
  'CHANGELOG must retain the accepted V5.1 C2/RC base');

// All accepted V5.1 modules must remain in the historical staged release loader.
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
].forEach(name => assert(release.includes(name),`V5.1 historical loader missing ${name}`));

// Preserve the synchronized migration record formerly kept in a version-specific file.
assert.match(changelog,/20260828155458 v51b2c_question_review_workflow/);
assert.match(changelog,/20260828225115 v51b2d_question_change_history/);
assert.match(changelog,/20260829011834 v51b2e_multipart_question_management/);
assert.match(changelog,/20260829181613 v51b3_exam_publication_bulk_cleanup/,
  'V5.1 migration history must retain the synchronized production head');
assert.match(changelog,/V5\.1C1 — no new database migration required/);
assert.match(changelog,/V5\.1C2 — no new database migration required/);
assert.match(changelog,/Do not re-run historical V5\.1B migrations merely because the app version changes/);

// Preserve the one-pass RC acceptance boundaries after documentation consolidation.
for (const text of [
  'V5.1A paper import pipeline',
  'V5.1B Question Bank QA',
  'V5.1C1 Student Exam Paper Library',
  'V5.1C2 — Exam resume and progress clarity',
  'ordinary Practice/Exam regression',
  'teacher reporting',
  'responsive/dark-mode/accessibility behavior',
  'V5 Regression Safety is green on the exact candidate head',
  'Netlify Deploy Preview was also required on the exact candidate head'
]) {
  assert(changelog.includes(text),`V5.1 historical RC record missing: ${text}`);
}

console.log('V5.1 historical release-candidate record checks passed.');
console.log('- V5.1 A/B/C1/C2 loader coverage remains recoverable');
console.log('- synchronized V5.1 database migration history is retained in CHANGELOG.md');
console.log('- final one-pass RC acceptance boundaries are retained in CHANGELOG.md');
console.log('- current README remains the signed-off V5.1 stable record');
