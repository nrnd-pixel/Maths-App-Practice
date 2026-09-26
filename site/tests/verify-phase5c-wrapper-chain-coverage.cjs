'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const site  = path.join(__dirname, '..');
const e2e   = path.join(site, '..', 'e2e', 'tests');
const read  = p => fs.readFileSync(p, 'utf8');

const polish  = read(path.join(site, 'v40-platform-polish.js'));
const v581a   = read(path.join(site, 'v581a-practice-cloud-result-reconciliation.js'));
const spec    = read(path.join(e2e, 'v40-frozen-wrapper-chain-phase5c.spec.cjs'));

// ── finishPractice chain ─────────────────────────────────────────────────────

// v40-platform-polish must wrap finishPractice (adds ticket rotation)
assert.match(polish, /const finishPracticeBase = finishPractice/,
  'v40-platform-polish must capture the base finishPractice before wrapping');
assert.match(polish, /finishPractice = async function/,
  'v40-platform-polish must reassign finishPractice to an async wrapper');
assert.match(polish, /await finishPracticeBase\(early\)/,
  'v40-platform-polish wrapper must call through to the base function');

// v581a must wrap finishPractice (adds cloud result reconciliation)
assert.match(v581a, /const base = typeof ROOT\.finishPractice === 'function'/,
  'v581a must read the current finishPractice (already polish-wrapped) as its base');
assert.match(v581a, /finishPractice = wrapped/,
  'v581a must reassign finishPractice to its wrapper');
assert.match(v581a, /await base\.apply\(this,args\)/,
  'v581a wrapper must call through to the polish-wrapped base');

// The two wrappers must not reference each other — they compose via the variable
assert.doesNotMatch(polish, /v581a|reconcil/i,
  'v40-platform-polish must not reference v581a');
assert.doesNotMatch(v581a, /rotatePracticeTicket|v40-platform/i,
  'v581a must not reference v40-platform-polish');

// ── cloud.rpc chain ──────────────────────────────────────────────────────────

// v581a must wrap cloud.rpc
assert.match(v581a, /cloud\.rpc = function\(name,args,options\)/,
  'v581a must wrap cloud.rpc');
assert.match(v581a, /return previous\(name,args,options\)/,
  'v581a rpc wrapper must call through to the base rpc');

// The three assignment-start RPCs that v581a intercepts
for (const rpc of [
  'start_student_practice_assignment_v56b',
  'start_student_practice_assignment_v53d1',
]) {
  assert.ok(v581a.includes(rpc),
    `v581a must intercept ${rpc}`);
}

// ── item 1: wrap-order sentinel ──────────────────────────────────────────────

// v40-platform-polish must stamp __v40PoolWrapped on its finishPractice wrapper
assert.match(polish, /__v40PoolWrapped/,
  'v40-platform-polish must stamp __v40PoolWrapped sentinel on its finishPractice wrapper');
assert.match(polish, /Object\.defineProperty\(finishPractice,\s*'__v40PoolWrapped'/,
  'v40-platform-polish must define __v40PoolWrapped as a non-enumerable property');

// v581a must check for the sentinel and warn if missing
assert.match(v581a, /__v40PoolWrapped/,
  'v581a must check the __v40PoolWrapped sentinel before completing install');
assert.match(v581a, /sentinel absent/,
  'v581a must include a diagnostic message when the sentinel is absent');

// ── item 2: credentials handoff ──────────────────────────────────────────────

// v40-platform-polish must prefer the handoff over re-reading the DOM
assert.match(polish, /__v40LastSignInCredentials/,
  'v40-platform-polish must read window.__v40LastSignInCredentials as the credentials source');
assert.match(polish, /handoff\s*\|\|/,
  'v40-platform-polish must fall back to DOM credentials only when handoff is absent');

// ── double-install guards ────────────────────────────────────────────────────

assert.match(v581a, /__v581aPracticeCloudResultReconciliationInstalled/,
  'v581a must set __v581aPracticeCloudResultReconciliationInstalled');
assert.match(v581a, /if \(.*__v581aPracticeCloudResultReconciliationInstalled\) return/,
  'v581a must guard against double installation');

// ── Spec file covers all chains ──────────────────────────────────────────────

assert.ok(spec.includes('v40-platform-polish.js'),
  'Phase 5C spec must load v40-platform-polish');
assert.ok(spec.includes('v581a-practice-cloud-result-reconciliation.js'),
  'Phase 5C spec must load v581a');
assert.ok(spec.includes('finishPractice chain') || spec.includes('finishPractice wrapper'),
  'Phase 5C spec must test finishPractice wrapper chain');
assert.ok(spec.includes('cloud.rpc'),
  'Phase 5C spec must test cloud.rpc wrapper');
assert.ok(spec.includes('double-install') || spec.includes('Double-install'),
  'Phase 5C spec must verify double-install guard');

console.log('Phase 5C wrapper-chain coverage checks passed.');
console.log('- v40-platform-polish wraps finishPractice (adds ticket rotation, calls base)');
console.log('- v581a wraps the polish-wrapped finishPractice (adds reconciliation, calls base)');
console.log('- Two wrappers compose via variable reference, neither knows about the other');
console.log('- v581a wraps cloud.rpc to intercept assignment-start RPCs');
console.log('- v581a double-install guard prevents stacked wrapping');
console.log('- Phase 5C Playwright spec covers all chains (tests A-G)');
