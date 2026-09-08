const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const release = fs.readFileSync(path.join(siteRoot, 'v40-release.js'), 'utf8');
const report = fs.readFileSync(path.join(siteRoot, 'v50-teacher-class-report.js'), 'utf8');
const studentReport = fs.readFileSync(path.join(siteRoot, 'v50-teacher-student-report.js'), 'utf8');
const exporter = fs.readFileSync(path.join(siteRoot, 'v50-reporting-export.js'), 'utf8');
const archive = fs.readFileSync(path.join(siteRoot, 'v50-report-archive.js'), 'utf8');
const archiveSql = fs.readFileSync(path.join(repoRoot, 'supabase', 'v50c3b_report_archives.sql'), 'utf8');

new vm.Script(report, { filename: 'v50-teacher-class-report.js' });
new vm.Script(studentReport, { filename: 'v50-teacher-student-report.js' });
new vm.Script(exporter, { filename: 'v50-reporting-export.js' });
new vm.Script(archive, { filename: 'v50-report-archive.js' });

assert.match(release, /loadScriptOnce\('assignment-intervention-history\.js', 'data-assignment-intervention-history'\)/,
  'Consolidated V4.7 history owner must remain staged.');
assert.match(release, /v50-teacher-class-report\.js\?v=50c1-2/);
assert.match(release, /data-v50-teacher-class-report/);
assert.match(release, /v50-teacher-student-report\.js\?v=50c2-2/);
assert.match(release, /data-v50-teacher-student-report/);
assert.match(release, /v50-reporting-export\.js\?v=50c3a-2/);
assert.match(release, /data-v50-reporting-export/);
assert.match(release, /v50-report-archive\.js\?v=50c3b-1/);
assert.match(release, /data-v50-report-archive/);

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
assert.match(report, /Class Performance Report - /);
assert.match(report, /document\.title = reportDocumentTitle\(filterScope\(\)\)/);
assert.match(report, /document\.title = previousTitle/);
assert.doesNotMatch(report, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/,
  'V5.0C1 must not make its own Supabase/API request.');
assert.doesNotMatch(report, /percent\s*[<>]=?\s*(60|80)/,
  'V5.0C1 must reuse existing mastery bands rather than introduce threshold comparisons.');
assert.doesNotMatch(report, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/);

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
assert.match(studentReport, /function displayPercent\(value\)/);
assert.match(studentReport, /value === null \|\| value === undefined \|\| value === ''/);
assert.match(studentReport, /const latestFullyMarkedExam = evidence\.exams/);
assert.match(studentReport, /pending_review_count\|\|0\)===0 && Number\.isFinite\(finalExamPercent\(session\)\)/);
assert.match(studentReport, /Student report/);
assert.match(studentReport, /Print \/ Save PDF/);
assert.match(studentReport, /Student Performance Report - /);
assert.match(studentReport, /@page\{size:A4 portrait/);
assert.match(studentReport, /v50c2-paged\{break-inside:auto;page-break-inside:auto\}/);
assert.match(studentReport, /thead\{display:table-header-group\}/);
assert.match(studentReport, /role','dialog/);
assert.match(studentReport, /aria-modal','true/);
assert.match(studentReport, /event\.key==='Escape'/);
assert.match(studentReport, /document\.title = reportDocumentTitle\(row\)/);
assert.match(studentReport, /document\.title = previousTitle/);
assert.doesNotMatch(studentReport, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/,
  'V5.0C2 must reuse loaded Teacher Analytics data rather than make its own request.');
assert.doesNotMatch(studentReport, /percent\s*[<>]=?\s*(60|80)/);
assert.doesNotMatch(studentReport, /learningIndependence\s*=|independenceScore\s*=|aiScore\s*=/i);
assert.doesNotMatch(studentReport, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/);

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
assert.match(exporter, /record_type/);
assert.match(exporter, /Class Performance Report - /);
assert.match(exporter, /Student Performance Report - /);
assert.match(exporter, /practice_mastery_percent/);
assert.match(exporter, /exam_final_percent/);
assert.match(exporter, /exam_auto_marks_so_far/);
assert.match(exporter, /exam\s*&&\s*pending===0\s*\?\s*finalExamPercent\(session\)\s*:\s*null/,
  'Pending Exam review must never be exported as a final Exam percentage.');
assert.ok(exporter.includes('\\uFEFF'));
assert.ok(exporter.includes("if (/^\\s*[=+\\-@]/.test(text))"));
assert.match(exporter, /text\/csv;charset=utf-8/);
assert.match(exporter, /URL\.createObjectURL/);
assert.match(exporter, /buildClassSnapshot/,
  'C3B must archive the same structured class snapshot used by CSV export.');
assert.match(exporter, /buildStudentSnapshot/,
  'C3B must archive the same structured student snapshot used by CSV export.');
assert.match(exporter, /V50ReportingExport/);
assert.match(exporter, /Object\.freeze/);
assert.match(exporter, /downloadSnapshot/);
assert.doesNotMatch(exporter, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(|fetch\(/,
  'Reporting snapshot/export builders must not make their own data request.');
assert.doesNotMatch(exporter, /localStorage\.setItem|sessionStorage\.setItem/);
assert.doesNotMatch(exporter, /percent\s*[<>]=?\s*(60|80)/);
assert.doesNotMatch(exporter, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/);

assert.match(archive, /Report Archive/);
assert.match(archive, /Save to Archive/);
assert.match(archive, /manual_delete/);
assert.match(archive, /remain stored until that teacher deletes them/,
  'C3B retention must be explicit in the teacher UI.');
assert.match(archive, /buildClassSnapshot\(\)/);
assert.match(archive, /buildStudentSnapshot\(\)/);
assert.match(archive, /snapshot_version:1/);
assert.match(archive, /schema_version:1/);
assert.match(archive, /record_count:snapshot\.records\.length/);
assert.match(archive, /Download CSV/);
assert.match(archive, /student results and live Analytics were not changed/i,
  'Archive deletion must be clearly scoped to the saved snapshot.');
assert.match(archive, /MutationObserver/);
assert.doesNotMatch(archive, /\.update\(/,
  'Archived reports are immutable in V5.0C3B.');
assert.doesNotMatch(archive, /cloud\.rpc\(|cloud\.functions\.invoke\(/,
  'C3B uses RLS-protected table operations only.');
assert.doesNotMatch(archive, /localStorage\.setItem|sessionStorage\.setItem/,
  'Archived report data must not be duplicated into browser storage.');
assert.doesNotMatch(archive, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/);
const archiveTables = [...archive.matchAll(/\.from\('([^']+)'\)/g)].map(match=>match[1]);
assert.deepEqual([...new Set(archiveTables)], ['report_archives'],
  'C3B persistence must be isolated to report_archives.');

assert.match(archiveSql, /create table if not exists public\.report_archives/i);
assert.match(archiveSql, /alter table public\.report_archives enable row level security/i);
assert.match(archiveSql, /created_by = auth\.uid\(\)/i,
  'Archive RLS must isolate rows to the creating teacher.');
assert.match(archiveSql, /public\.is_teacher\(\)/i);
assert.match(archiveSql, /retention_policy text not null default 'manual_delete'/i);
assert.match(archiveSql, /revoke all on table public\.report_archives from anon/i);
assert.match(archiveSql, /grant select, insert, delete on table public\.report_archives to authenticated/i);
assert.doesNotMatch(archiveSql, /grant[^;]*update/i,
  'V5.0C3B must not grant UPDATE on immutable archives.');
assert.doesNotMatch(archiveSql, /for update/i,
  'V5.0C3B must not create an UPDATE RLS policy.');

console.log('V5.0 reporting verification passed.');
console.log('- V5.0C1/C2 PDF and evidence semantics remain protected');
console.log('- V5.0C3A exports and C3B archives share the same structured snapshot builders');
console.log('- Report Archive persistence is isolated to report_archives');
console.log('- archives are immutable, teacher-owned, manually retained and CSV-downloadable');
console.log('- student-facing flows, grading thresholds and Exam review boundaries are unchanged');
