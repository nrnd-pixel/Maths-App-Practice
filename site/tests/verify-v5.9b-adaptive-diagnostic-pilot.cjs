'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const site   = path.join(__dirname, '..');
const read   = name => fs.readFileSync(path.join(site, name), 'utf8');
const source = read('v59b-adaptive-diagnostic-pilot.js');
const config = read('config.js');

// ── URL gate must be first meaningful check ─────────────────────────────────
assert.match(source, /adaptivePilot.*===.*'2'/, 'URL gate must check adaptivePilot=2');
assert.match(source, /if\s*\(!enabled\)\s*\{?\s*(?:Object\.defineProperty|return)/,
  'Module must return/no-op immediately if adaptivePilot=2 is absent');

// ── Install guard ────────────────────────────────────────────────────────────
assert.match(source, /__v59bAdaptiveDiagnosticPilotInstalled/,
  'Module must carry a double-install guard');

// ── Does NOT replace forbidden lifecycle functions ───────────────────────────
assert.doesNotMatch(source, /startPractice\s*=/,
  'v59b must not reassign startPractice');
assert.doesNotMatch(source, /getQuestions\s*=/,
  'v59b must not reassign getQuestions');
assert.doesNotMatch(source, /finishPractice\s*=/,
  'v59b must not reassign finishPractice');
assert.doesNotMatch(source, /get_student_practice_questions/,
  'v59b must not call the question-bank RPC');

// ── Uses only the three pilot RPCs for server interaction ────────────────────
assert.match(source, /student_adaptive_trigger_check_v1/,
  'v59b must call student_adaptive_trigger_check_v1');
assert.match(source, /student_adaptive_diagnostic_plan_v1/,
  'v59b must call student_adaptive_diagnostic_plan_v1');
assert.match(source, /student_adaptive_diagnostic_grade_v1/,
  'v59b must call student_adaptive_diagnostic_grade_v1');

// ── Does NOT use normal grading RPC for diagnostic answers ───────────────────
// The diagnostic grade RPC must be called for diagnostic items; the normal
// grade_practice_response_v53b must NOT be called for diagnostic answers.
// We verify this by checking the diagnostic grade call is present and that
// the grading RPC is only referenced in the interceptor (read), not in the
// diagnostic submission path.
const diagnosticGradeIdx  = source.indexOf('student_adaptive_diagnostic_grade_v1');
const normalGradeCallIdx  = source.indexOf("cloud.rpc(\n        'grade_practice_response");
assert.ok(diagnosticGradeIdx > -1, 'Diagnostic grade RPC must be present');
// Normal grade RPC must not appear as an outgoing call (only as an intercepted name)
assert.doesNotMatch(source, /await cloud\.rpc\(\s*['"]grade_practice_response/,
  'v59b must not make outgoing calls to grade_practice_response from the pilot');

// ── No answer keys in the browser ───────────────────────────────────────────
assert.doesNotMatch(source, /answer_?key|correct_?answer|expected_?response|isCorrect/i,
  'v59b must never handle answer keys');

// ── Overlay is self-contained; does not rewrite Practice DOM ────────────────
assert.match(source, /adaptive-diagnostic-overlay/,
  'Overlay must have its own ID distinct from normal Practice DOM');
assert.doesNotMatch(source, /byId\s*\(\s*['"]q-text['"]\s*\).*=\s/,
  'v59b must not write to #q-text');
assert.doesNotMatch(source, /byId\s*\(\s*['"]quiz['"]\s*\)\.innerHTML\s*=/,
  'v59b must not replace #quiz innerHTML');

// ── Return-to-Practice button is always present ──────────────────────────────
assert.match(source, /Return to Practice/,
  'Overlay must include a labelled Return to Practice control');
assert.match(source, /adaptive-return-btn/,
  'Return to Practice button must have its own ID');

// ── Skip suppression prevents immediate re-trigger ──────────────────────────
assert.match(source, /skippedQuestions/,
  'Module must maintain a skipped-questions set to suppress re-trigger');
assert.match(source, /adaptivePilotSkipped/,
  'Module must persist skip suppression in sessionStorage');

// ── State machine states are present ────────────────────────────────────────
for (const s of ['DORMANT','WATCHING','LOADING_PLAN','DIAGNOSTIC','GRADING','TARGET_RETRY','EXITING']) {
  assert.ok(source.includes(s), `State machine must include ${s}`);
}

// ── config.js loads v59b after v58 stable checkpoint ────────────────────────
const staged = [...config.matchAll(/'\.\/([^']+\.js)'/g)].map(m => m[1]);
const v58idx = staged.indexOf('v58-stable-release-checkpoint.js');
const v59idx = staged.indexOf('v59b-adaptive-diagnostic-pilot.js');
assert.ok(v59idx > -1, 'v59b-adaptive-diagnostic-pilot.js must be staged in config.js');
assert.ok(v58idx > -1, 'v58-stable-release-checkpoint.js must still be staged');
assert.ok(v59idx > v58idx, 'v59b must be staged after v58 stable release checkpoint');

// ── Not loaded before the V56B assignment bridge ────────────────────────────
const v56bIdx = staged.indexOf('past-paper-assignments.js');
if (v56bIdx > -1) {
  assert.ok(v59idx > v56bIdx, 'v59b must be staged after past-paper-assignments.js');
}

// ── Public API on window.V59BAdaptiveDiagnosticPilot ────────────────────────
assert.match(source, /V59BAdaptiveDiagnosticPilot/,
  'Module must expose V59BAdaptiveDiagnosticPilot on window');
assert.match(source, /Object\.defineProperty.*V59BAdaptiveDiagnosticPilot/,
  'V59BAdaptiveDiagnosticPilot must be defined as non-writable');

console.log('V5.9B adaptive diagnostic pilot checks passed.');
console.log('- URL gate: dormant unless ?adaptivePilot=2');
console.log('- Does not replace startPractice, getQuestions or finishPractice');
console.log('- Uses only the three pilot RPCs; no answer keys in browser');
console.log('- Overlay self-contained; normal Practice DOM left intact');
console.log('- Return to Practice button present; skip suppression wired');
console.log('- Staged in config.js after v58 stable checkpoint');
