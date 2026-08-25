const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const release = fs.readFileSync(path.join(siteRoot, 'v40-release.js'), 'utf8');
const report = fs.readFileSync(path.join(siteRoot, 'v50-teacher-class-report.js'), 'utf8');
const printPolish = fs.readFileSync(path.join(siteRoot, 'v50-teacher-class-report-print-polish.js'), 'utf8');

new vm.Script(report, { filename: 'v50-teacher-class-report.js' });
new vm.Script(printPolish, { filename: 'v50-teacher-class-report-print-polish.js' });

assert.match(release, /v50-teacher-class-report\.js\?v=50c1-1/);
assert.match(release, /data-v50-teacher-class-report/);
assert.match(release, /v50-teacher-class-report-print-polish\.js\?v=50c1p-1/);
assert.match(release, /data-v50-teacher-class-report-print-polish/);

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

assert.match(printPolish, /table-header-group/);
assert.match(printPolish, /page-break-inside:auto/);
assert.match(printPolish, /page-break-inside:avoid/);
assert.match(printPolish, /dedupeScopeLine/);
assert.match(printPolish, /document\.title = reportPrintTitle\(\)/);
assert.match(printPolish, /afterprint/);

for (const source of [report, printPolish]) {
  assert.doesNotMatch(source, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/,
    'V5.0C1 reporting modules must not make their own Supabase/API request.');
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/,
    'V5.0C1 reporting modules must not contain server-side secrets.');
}
assert.doesNotMatch(report, /percent\s*[<>]=?\s*(60|80)/,
  'V5.0C1 must reuse existing mastery bands rather than introduce threshold comparisons.');

console.log('V5.0C1 reporting verification passed.');
console.log('- class report reuses existing Analytics rows/topic evidence');
console.log('- no new data request or mastery threshold is introduced');
console.log('- print layout can flow the student table across pages with repeating headers');
console.log('- saved-PDF title and duplicated scope labels are polished');
