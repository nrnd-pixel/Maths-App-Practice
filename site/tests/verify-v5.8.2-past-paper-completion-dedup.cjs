const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const site = path.join(__dirname, '..');
const studentSource = fs.readFileSync(path.join(site, 'assignments-student.js'), 'utf8');
const pastPaperSource = fs.readFileSync(path.join(site, 'past-paper-assignments.js'), 'utf8');

// ── Shared lock Map must exist in both files ────────────────────────────────

assert.match(
  studentSource,
  /__practiceCompletionLock\s*=\s*ROOT\.__practiceCompletionLock\s*\|\|\s*new Map\(\)/,
  'assignments-student.js must initialise the shared lock Map on ROOT'
);
assert.match(
  pastPaperSource,
  /__practiceCompletionLock\s*=\s*ROOT\.__practiceCompletionLock\s*\|\|\s*new Map\(\)/,
  'past-paper-assignments.js must initialise the shared lock Map on ROOT'
);

// ── Lock must be checked AND set synchronously before the first await ───────
// The guard-check and set must both appear before the async RPC call in each
// function.  We verify ordering by checking character positions in the source.

function posOf(src, pattern) {
  const m = src.match(pattern);
  if (!m) return -1;
  return src.indexOf(m[0]);
}

// assignments-student.js: completeActivePracticeAssignment
const asnFnStart = studentSource.indexOf('async function completeActivePracticeAssignment');
assert.notEqual(asnFnStart, -1, 'completeActivePracticeAssignment must exist in assignments-student.js');
const asnFn = studentSource.slice(asnFnStart, asnFnStart + 3000);

const asnLockCheck = asnFn.indexOf('lockMap.get(lockKey)');
const asnLockSet   = asnFn.indexOf('lockMap.set(lockKey,true)');
const asnRpc       = asnFn.indexOf("cloud.rpc('complete_student_practice_assignment'");
assert.notEqual(asnLockCheck, -1, 'assignments-student.js must check the lock before initiating completion');
assert.notEqual(asnLockSet,   -1, 'assignments-student.js must set the lock before initiating completion');
assert.notEqual(asnRpc,       -1, 'assignments-student.js must call complete_student_practice_assignment');
assert(asnLockCheck < asnRpc,     'assignments-student.js: lock check must precede the RPC call');
assert(asnLockSet   < asnRpc,     'assignments-student.js: lock set must precede the RPC call (synchronous guard)');

// past-paper-assignments.js: completeStoredAssignmentFromResult
const ppFnStart = pastPaperSource.indexOf('async function completeStoredAssignmentFromResult');
assert.notEqual(ppFnStart, -1, 'completeStoredAssignmentFromResult must exist in past-paper-assignments.js');
const ppFn = pastPaperSource.slice(ppFnStart, ppFnStart + 3000);

const ppLockCheck = ppFn.indexOf('lockMap.get(lockKey)');
const ppLockSet   = ppFn.indexOf('lockMap.set(lockKey,true)');
const ppRpc       = ppFn.indexOf("cloud.rpc('complete_student_practice_assignment_v56b'");
assert.notEqual(ppLockCheck, -1, 'past-paper-assignments.js must check the lock before initiating completion');
assert.notEqual(ppLockSet,   -1, 'past-paper-assignments.js must set the lock before initiating completion');
assert.notEqual(ppRpc,       -1, 'past-paper-assignments.js must call complete_student_practice_assignment_v56b');
assert(ppLockCheck < ppRpc,      'past-paper-assignments.js: lock check must precede the RPC call');
assert(ppLockSet   < ppRpc,      'past-paper-assignments.js: lock set must precede the RPC call (synchronous guard)');

// ── Lock must be released (deleted) in the finally block ────────────────────

assert.match(
  studentSource,
  /finally\s*\{[^}]*lockMap\.delete\(lockKey\)/s,
  'assignments-student.js must release the lock in the finally block'
);
assert.match(
  pastPaperSource,
  /finally\s*\{[^}]*lockMap\.delete\(lockKey\)/s,
  'past-paper-assignments.js must release the lock in the finally block'
);

// ── Both files still carry their original per-module guards ─────────────────
// Removing the pre-existing guards would be a regression.

assert.match(
  studentSource,
  /if \(!context \|\| context\.completing\) return/,
  'assignments-student.js must retain the context.completing guard'
);
assert.match(
  pastPaperSource,
  /if \(resultCompletionBusy\) return/,
  'past-paper-assignments.js must retain the resultCompletionBusy guard'
);

// ── Lock is a Map (not a boolean) ───────────────────────────────────────────
assert.doesNotMatch(
  studentSource,
  /__practiceCompletionLock\s*=\s*(true|false)/,
  'assignments-student.js must not use a boolean for the shared lock'
);
assert.doesNotMatch(
  pastPaperSource,
  /__practiceCompletionLock\s*=\s*(true|false)/,
  'past-paper-assignments.js must not use a boolean for the shared lock'
);

console.log('V5.8.2 Past Paper completion dedup checks passed.');
console.log('- shared __practiceCompletionLock Map present in both observer paths');
console.log('- lock checked and set synchronously before each completion RPC');
console.log('- lock released in finally block of each path');
console.log('- pre-existing per-module guards (context.completing, resultCompletionBusy) retained');
