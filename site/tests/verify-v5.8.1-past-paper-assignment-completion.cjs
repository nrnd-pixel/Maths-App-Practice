const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const site = path.join(__dirname,'..');
const migration = fs.readFileSync(path.join(site,'DATABASE-MIGRATIONS-V5.8.1.txt'),'utf8');

// Submission contract must retain Past Paper attribution rather than coercing it to mixed.
assert.match(migration,/\('mixed','strand_topic','past_paper'\)/,
  'submit_practice_session_v3 must allow past_paper mode.');
assert.match(migration,/practice_mode,strand,topic,exam_year,paper/,
  'Past Paper session insert must persist exam_year and paper.');
assert.match(migration,/Past Paper Practice answers do not match the selected paper/,
  'Past Paper attribution must be validated against saved question IDs.');

// Assignment completion must remain evidence-based and safe for legacy sessions.
assert.match(migration,/practice_logical_item_key_v53d1/,
  'Assignment completion must count logical questions rather than physical rows.');
assert.match(migration,/Multiple completed Practice sessions matched this assignment; teacher review is required/,
  'Fallback auto-linking must refuse ambiguous candidate sessions.');
assert.match(migration,/q0\.exam_year is distinct from v_assignment\.exam_year/,
  'Fallback matching must verify assigned exam year.');
assert.match(migration,/lower\(trim\(coalesce\(q0\.paper,''\)\)\)<>lower\(trim\(coalesce\(v_assignment\.paper,''\)\)\)/,
  'Fallback matching must verify assigned paper.');
assert.doesNotMatch(migration,/if v_assignment\.assignment_type='past_paper' and v_session\.practice_mode<>'past_paper'/,
  'Legacy mixed-labelled Past Paper sessions must not be rejected before question-level verification.');

console.log('V5.8.1 Past Paper assignment completion checks passed.');
console.log('- Past Paper mode + exam year/paper attribution retained on submission');
console.log('- assignment completion uses question-level evidence and logical-question counts');
console.log('- ambiguous fallback matches are refused rather than auto-linked');
