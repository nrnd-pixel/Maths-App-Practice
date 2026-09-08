const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const testsRoot = __dirname;
const retired = [
  'v44-action-center-practice.js',
  'v44-shared-focus-groups.js',
  'v44-intervention-follow-through.js',
  'v44-intervention-highlight-clarity.js',
  'v45-intervention-outcomes.js',
  'v46-intervention-export.js',
  'v47-intervention-history.js',
  'v47-follow-up-from-history.js',
  'v47-class-intervention-overview.js',
  'v48-teacher-deadline-monitoring.js',
  'v48-student-deadline-experience.js',
  'v48-deadline-follow-up.js',
];
const allow = new Set([
  'verify-phase4-teacher-assignments-v44-v48-checkpoint2-integrity.cjs',
  'verify-phase4-teacher-assignments-v44-v48-dormant-reference-integrity.cjs',
]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.cjs')) out.push(full);
  }
  return out;
}
function escapedForms(name) {
  const slash = name.replace(/\./g, '\\.');
  const doubled = slash.replace(/\\/g, '\\\\');
  return [name, slash, doubled];
}

const violations = [];
const files = walk(testsRoot);
for (const file of files) {
  const rel = path.relative(testsRoot, file).replace(/\\/g, '/');
  if (allow.has(rel)) continue;
  const source = fs.readFileSync(file, 'utf8');
  for (const oldName of retired) {
    if (escapedForms(oldName).some(form => source.includes(form))) violations.push(`${rel} -> ${oldName}`);
  }
}
assert.deepEqual(violations, [], `Dormant V44/V45B/V46/V47/V48 owners remain referenced by verifier scripts:\n${violations.join('\n')}`);

// Maintained owner mapping: one canonical source per phase.
const expectedOwners = {
  'verify-v5.8-intervention-workflow.cjs': [
    'assignment-interventions.js',
    'v45-intervention-queue.js',
    'assignment-intervention-queue-support.js',
    'assignment-intervention-history.js',
    'assignment-deadlines.js',
  ],
};
for (const [name, owners] of Object.entries(expectedOwners)) {
  const file = path.join(testsRoot, name);
  assert.ok(fs.existsSync(file), `${name} must remain maintained`);
  const source = fs.readFileSync(file, 'utf8');
  for (const owner of owners) assert.ok(source.includes(owner), `${name} must target ${owner}`);
}

console.log('Phase 4 teacher assignments V44-V48 dormant-reference integrity passed.');
console.log(`- scanned ${files.length} verifier scripts recursively`);
console.log('- historical 12 browser owners are referenced only by the two checkpoint guards');
