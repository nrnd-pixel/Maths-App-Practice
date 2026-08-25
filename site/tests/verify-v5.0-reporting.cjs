const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const release = fs.readFileSync(path.join(siteRoot, 'v40-release.js'), 'utf8');
const report = fs.readFileSync(path.join(siteRoot, 'v50-teacher-class-report.js'), 'utf8');
const studentReport = fs.readFileSync(path.join(siteRoot, 'v50-teacher-student-report.js'), 'utf8');

new vm.Script(report, { filename: 'v50-teacher-class-report.js' });
new vm.Script(studentReport, { filename: 'v50-teacher-student-report.js' });

assert.match(release, /v50-teacher-class-report\.js\?v=50c1-2/);
assert.match(release, /data-v50-teacher-class-report/);
assert.match(release, /v50-teacher-student-report\.js\?v=50c2-1/);
assert.match(release, /data-v50-teacher-student-report/);

assert.match(report, /analyticsVisibleRows/);
assert.match(report, /analyticsLearningRows/);
assert.match(report, /analyticsContext/);
assert.match(report, /learningBand/);
assert.match(report, /aggregateLearning/);
assert.match(report, /renderAnalytics/);

assert.match(report, /Print \/ Save PDF/);
assert.match(report, /Class report/);
assert.match(report, /@media print/);
assert.match(report, /role','dialog/);
assert.match(report, /aria-modal','true/);
assert.match(report, /event\.key==='Escape'/);

assert.match(report, /v50c1-student-section/,
  'Student summary must have its own print-pagination hook.');
assert.match(report, /v50c1-student-section\{break-inside:auto;page-break-inside:auto\}/,
  'Long student tables must be allowed to paginate instead of being kept as one section.');
assert.match(report, /thead\{display:table-header-group\}/,
  'Student table headers should repeat on subsequent printed pages when supported.');
assert.match(report, /tr\{break-inside:avoid;page-break-inside:avoid\}/,
  'Printed student rows should not be split across pages.');
assert.match(report, /Class Performance Report - /,
  'Saved PDF should receive a report-specific document title/filename hint.');
assert.match(report, /document\.title = reportDocumentTitle\(filterScope\(\)\)/,
  'Print flow must set the report title immediately before printing.');
assert.match(report, /document\.title = previousTitle/,
  'Print flow must restore the app title after printing.');

assert.doesNotMatch(report, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/,
  'V5.0C1 must not make its own Supabase/API request.');
assert.doesNotMatch(report, /percent\s*[<>]=?\s*(60|80)/,
  'V5.0C1 must reuse existing mastery bands rather than introduce threshold comparisons.');
assert.doesNotMatch(report, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/,
  'V5.0C1 must not contain server-side secrets.');

assert.match(studentReport, /analyticsVisibleRows/);
assert.match(studentReport, /selectedAnalyticsStudentKey/);
assert.match(studentReport, /analyticsContext/);
assert.match(studentReport, /analyticsAnswerScore/);
assert.match(studentReport, /analyticsFinalExamPercent/);
assert.match(studentReport, /aggregateLearning/);
assert.match(studentReport, /learningBand/);
assert.match(studentReport, /Practice mastery and final Exam percentages remain separate/,
  'V5.0C2 must preserve the Practice/Exam evidence boundary.');
assert.match(studentReport, /pending \? `\$\{Number\(session\.auto_marks_awarded\|\|0\)\} marks so far`/,
  'Pending Exam review must not be presented as a final percentage.');

assert.match(studentReport, /Student report/);
assert.match(studentReport, /Print \/ Save PDF/);
assert.match(studentReport, /Student Performance Report - /);
assert.match(studentReport, /@page\{size:A4 portrait/);
assert.match(studentReport, /v50c2-paged\{break-inside:auto;page-break-inside:auto\}/,
  'Long individual report tables must be printable across pages.');
assert.match(studentReport, /thead\{display:table-header-group\}/,
  'V5.0C2 table headers should repeat on subsequent printed pages when supported.');
assert.match(studentReport, /role','dialog/);
assert.match(studentReport, /aria-modal','true/);
assert.match(studentReport, /event\.key==='Escape'/);
assert.match(studentReport, /document\.title = reportDocumentTitle\(row\)/);
assert.match(studentReport, /document\.title = previousTitle/);

assert.doesNotMatch(studentReport, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/,
  'V5.0C2 must reuse loaded Teacher Analytics data rather than make its own request.');
assert.doesNotMatch(studentReport, /percent\s*[<>]=?\s*(60|80)/,
  'V5.0C2 must reuse established mastery bands instead of introducing thresholds.');
assert.doesNotMatch(studentReport, /learningIndependence\s*=|independenceScore\s*=|aiScore\s*=/i,
  'V5.0C2 must not invent a learning-independence or AI-derived score.');
assert.doesNotMatch(studentReport, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/,
  'V5.0C2 must not contain server-side secrets.');

console.log('V5.0 reporting verification passed.');
console.log('- V5.0C1 class report pagination and filename safeguards remain active');
console.log('- V5.0C2 reuses the selected Teacher Analytics learner and current filter scope');
console.log('- Practice mastery, final Exam results and pending review remain separate');
console.log('- no new data request, mastery threshold, AI score or server-side secret is introduced');
console.log('- both reports retain print/PDF and dialog accessibility safeguards');
