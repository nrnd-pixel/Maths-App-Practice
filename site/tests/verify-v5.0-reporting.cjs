const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const release = fs.readFileSync(path.join(siteRoot, 'v40-release.js'), 'utf8');
const report = fs.readFileSync(path.join(siteRoot, 'v50-teacher-class-report.js'), 'utf8');
const studentReport = fs.readFileSync(path.join(siteRoot, 'v50-teacher-student-report.js'), 'utf8');
const exporter = fs.readFileSync(path.join(siteRoot, 'v50-reporting-export.js'), 'utf8');

new vm.Script(report, { filename: 'v50-teacher-class-report.js' });
new vm.Script(studentReport, { filename: 'v50-teacher-student-report.js' });
new vm.Script(exporter, { filename: 'v50-reporting-export.js' });

assert.match(release, /v47-intervention-history\.js\?v=47a-1', 'data-v47a-intervention-history'/,
  'Existing V4.7 history loader key must remain stable.');
assert.match(release, /v50-teacher-class-report\.js\?v=50c1-2/);
assert.match(release, /data-v50-teacher-class-report/);
assert.match(release, /v50-teacher-student-report\.js\?v=50c2-1/);
assert.match(release, /data-v50-teacher-student-report/);
assert.match(release, /v50-reporting-export\.js\?v=50c3a-1/);
assert.match(release, /data-v50-reporting-export/);

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

assert.match(exporter, /v50c3a-export-class-csv/);
assert.match(exporter, /v50c3a-export-student-csv/);
assert.match(exporter, /Export CSV/);
assert.match(exporter, /analyticsVisibleRows/);
assert.match(exporter, /analyticsLearningRows/);
assert.match(exporter, /analyticsContext/);
assert.match(exporter, /analyticsAnswerScore/);
assert.match(exporter, /analyticsFinalExamPercent/);
assert.match(exporter, /aggregateLearning/);
assert.match(exporter, /learningBand/);
assert.match(exporter, /record_type/,
  'C3A exports must use typed rows so metrics, topics, students and activities stay machine-readable.');
assert.match(exporter, /Class Performance Report - /);
assert.match(exporter, /Student Performance Report - /);
assert.match(exporter, /practice_mastery_percent/);
assert.match(exporter, /exam_final_percent/);
assert.match(exporter, /exam_auto_marks_so_far/);
assert.match(exporter, /exam&&pending===0 \? finalExamPercent\(session\) : null/,
  'Pending Exam review must never be exported as a final Exam percentage.');
assert.ok(exporter.includes('\\uFEFF'),
  'CSV export must include a UTF-8 BOM for reliable Excel opening.');
assert.ok(exporter.includes("if (/^\\s*[=+\\-@]/.test(text))"),
  'CSV text cells must be guarded against spreadsheet formula injection.');
assert.match(exporter, /text\/csv;charset=utf-8/);
assert.match(exporter, /URL\.createObjectURL/);
assert.match(exporter, /MutationObserver/,
  'C3A must attach export actions without rewriting the validated C1/C2 report implementation.');

assert.doesNotMatch(exporter, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(|fetch\(/,
  'V5.0C3A must not make its own network/data request.');
assert.doesNotMatch(exporter, /localStorage\.setItem|sessionStorage\.setItem/,
  'V5.0C3A export must not persist report data in browser storage.');
assert.doesNotMatch(exporter, /percent\s*[<>]=?\s*(60|80)/,
  'V5.0C3A must reuse established mastery bands instead of introducing thresholds.');
assert.doesNotMatch(exporter, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/,
  'V5.0C3A must not contain server-side secrets.');

console.log('V5.0 reporting verification passed.');
console.log('- established V4.7 loader key remains stable');
console.log('- V5.0C1 class report pagination and filename safeguards remain active');
console.log('- V5.0C2 student report evidence boundaries remain active');
console.log('- V5.0C3A adds structured Class and Student CSV exports from loaded Analytics evidence');
console.log('- CSV files are Excel-friendly, formula-injection guarded and consistently named');
console.log('- Practice mastery, final Exam results and pending review remain separate in export data');
console.log('- no new data request, persistence, mastery threshold, AI score or server-side secret is introduced');
