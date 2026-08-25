const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const release = fs.readFileSync(path.join(siteRoot, 'v40-release.js'), 'utf8');
const report = fs.readFileSync(path.join(siteRoot, 'v50-teacher-class-report.js'), 'utf8');

new vm.Script(report, { filename: 'v50-teacher-class-report.js' });

assert.match(release, /v50-teacher-class-report\.js\?v=50c1-1/);
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

assert.doesNotMatch(report, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/,
  'V5.0C1 must not make its own Supabase/API request.');
assert.doesNotMatch(report, /percent\s*[<>]=?\s*(60|80)/,
  'V5.0C1 must reuse existing mastery bands rather than introduce threshold comparisons.');
assert.doesNotMatch(report, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/,
  'V5.0C1 must not contain server-side secrets.');

console.log('V5.0C1 reporting verification passed.');
console.log('- class report reuses existing Analytics rows/topic evidence');
console.log('- no new data request or mastery threshold is introduced');
console.log('- print/save-PDF and dialog accessibility hooks are present');
