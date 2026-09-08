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
  'verify-phase4-teacher-assignments-checkpoint2-integrity.cjs',
  'verify-phase4-teacher-assignments-checkpoint2-dormant-reference-integrity.cjs',
]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith('.cjs') ? [full] : [];
  });
}

function variants(name) {
  const regexEscaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const slashEscaped = name.replace(/\./g, '\\.');
  return new Set([name, regexEscaped, slashEscaped]);
}

const offenders = [];
const files = walk(testsRoot);
for (const file of files) {
  const relative = path.relative(testsRoot, file).replace(/\\/g, '/');
  if (allow.has(relative)) continue;
  const source = fs.readFileSync(file, 'utf8');
  for (const name of retired) {
    if ([...variants(name)].some(value => source.includes(value))) {
      offenders.push(`${relative} -> ${name}`);
    }
  }
}

assert.deepEqual(
  offenders,
  [],
  `Maintained verifiers must reference the four active checkpoint-2 owners rather than dormant V44/V45B/V46/V47/V48 files:\n${offenders.join('\n')}`,
);

console.log('Phase 4 teacher assignments checkpoint 2 dormant-reference integrity passed.');
console.log(`- scanned ${files.length} maintained .cjs verifier files`);
console.log('- retired V44/V45B/V46/V47/V48 browser filenames are confined to the checkpoint 2 integrity/reference guards');
