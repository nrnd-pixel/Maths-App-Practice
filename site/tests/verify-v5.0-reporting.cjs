const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const release = fs.readFileSync(path.join(siteRoot, 'v40-release.js'), 'utf8');
const report = fs.readFileSync(path.join(siteRoot, 'v50-teacher-class-report.js'), 'utf8');

new vm.Script(report, { filename: 'v50-teacher-class-report.js' });

assert.match(release, /v50-teacher-class-report\.js\?v=50c1-2/);
assert.match(release, /data-v50-teacher-class-report/);

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

console.log('V5.0C1 reporting verification passed.');
console.log('- class report reuses existing Analytics rows/topic evidence');
console.log('- no new data request or mastery threshold is introduced');
console.log('- long student summaries can paginate with repeated table headers');
console.log('- print/save-PDF uses a report-specific filename hint and restores the app title');
console.log('- dialog accessibility hooks remain present');
