const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(siteRoot, name), 'utf8');

const config = read('config.js');
const bootstrap = read('v582-bootstrap.js');

// Syntax-only compile. Browser globals are intentionally not executed here.
assert.doesNotThrow(() => new Function(config), 'config.js must remain valid JavaScript');
assert.doesNotThrow(() => new Function(bootstrap), 'V5.8.2 bootstrap must remain valid JavaScript');

// 1) config.js remains the configuration / compatibility boundary and delegates
// staged loading to exactly one application bootstrap entry point.
assert.match(config, /\.\/v582-bootstrap\.js/);
assert.match(config, /data-v582-bootstrap-entry/);
assert.doesNotMatch(config, /\.\/v38-ai-help\.js/,
  'config.js must no longer own the staged feature manifest');
assert.doesNotMatch(config, /\.\/v58-stable-release-checkpoint\.js/,
  'config.js must no longer own the staged feature manifest');
assert.match(config, /student-ai-help-v38/,
  'AI Help compatibility redirect must remain preserved');
assert.match(config, /student-ai-help-v381/,
  'AI Help compatibility redirect must remain preserved');
assert.match(config, /supabasePublishableKey:\s*'sb_publishable_/,
  'Browser config must retain only the publishable client key boundary');
assert.doesNotMatch(config, /serviceRoleKey\s*:/i,
  'Browser config must never define a service-role key');
assert.match(config, /Maths Practice • Starting/,
  'Historical V4 presentation must be neutralised before staged loading starts');

// 2) The consolidated bootstrap must preserve the exact accepted outer manifest
// order from V5.8.1. This is intentionally a loader-only change.
const expectedManifest = [
  './v38-ai-help.js',
  './v38-ai-admin.js',
  './v38-ai-polish.js',
  './v39-student-polish.js',
  './v39-practice-polish.js',
  './v39-dashboard-polish.js',
  './v39-state-polish.js',
  './v40-student-platform.js',
  './v40-student-nav.js',
  './v40-student-session.js',
  './v40-learn-setup.js',
  './v40-learning-priorities.js',
  './v40-platform-polish.js',
  './v40-release.js',
  './v40-start-shell.js',
  './v54-stable-release-checkpoint.js',
  './v55a-past-paper-practice.js',
  './v55a1-practice-type-guard.js',
  './v55b-full-paper-practice.js',
  './v55c-resume-past-paper-practice.js',
  './v55c1-resume-button-bridge.js',
  './v55d-past-paper-result-attribution.js',
  './v55-stable-release-checkpoint.js',
  './v56a-question-bank-response-filter.js',
  './v56a1-bulk-practice-confirmation-bridge.js',
  './v56b-teacher-assigned-past-paper-practice.js',
  './v56c-student-past-paper-progress.js',
  './v56d-teacher-past-paper-analytics.js',
  './v56-stable-release-checkpoint.js',
  './v561-practice-first-student-experience.js',
  './v57a-cross-device-past-paper-resume.js',
  './v57a1-cross-device-local-bridge.js',
  './v57a2-stale-local-checkpoint-cleanup.js',
  './v57b-teacher-assignment-management.js',
  './v57c-student-continue-learning-home.js',
  './v57d-past-paper-analytics-actions.js',
  './v57d1-focus-plan-copy-fallback.js',
  './v57-stable-release-checkpoint.js',
  './v571a-gamification-foundation.js',
  './v571b-streaks-achievements.js',
  './v572-weekly-missions.js',
  './v573-class-challenges-teacher-gamification.js',
  './v574-gamification-polish-teacher-controls.js',
  './v575-gamification-stable-checkpoint.js',
  './v576-classroom-feedback-support.js',
  './v5761-feedback-trigger-position.js',
  './v5763-teacher-feedback-header-icon.js',
  './v58a-student-first-use-experience.js',
  './v58b-teacher-workspace-consolidation.js',
  './v58c-parent-friendly-student-report.js',
  './v58c-parent-summary-workspace-shortcut.js',
  './v58d-content-workflow-consolidation.js',
  './v58-stable-release-checkpoint.js'
];

let previous = -1;
for (const src of expectedManifest) {
  const index = bootstrap.indexOf(`'${src}'`);
  assert.ok(index >= 0, `Bootstrap must retain ${src}`);
  assert.ok(index > previous, `${src} must retain the accepted V5.8.1 load order`);
  previous = index;
}

const manifestEntries = [...bootstrap.matchAll(/'\.\/v[^']+\.js'/g)].map(match => match[0]);
assert.equal(manifestEntries.length, expectedManifest.length,
  'Bootstrap outer manifest count must remain exactly aligned with V5.8.1');

// 3) Preserve the same dynamic-script execution semantics.
assert.match(bootstrap, /script\.async = false/);
assert.match(bootstrap, /document\.body\.appendChild\(script\)/);

// 4) Loading presentation must be neutral: students should not see the internal
// V4 -> V5 release chain during bootstrap.
assert.match(bootstrap, /Loading your learning space/);
assert.doesNotMatch(bootstrap, /Loading V\d/i);
assert.match(bootstrap, /v582-bootstrap-overlay/);

// 5) Readiness delegates to the accepted V5.8 checkpoint. The overlay stays up
// through the retained historical identity timers, then has a safety timeout so
// presentation readiness can never lock students out indefinitely.
assert.match(bootstrap, /V58StableReleaseCheckpoint/);
assert.match(bootstrap, /settleMs = 5350/);
assert.match(bootstrap, /safety-timeout/);
assert.match(bootstrap, /12000/);

// 6) Introduce only a compatibility namespace / boot API. No feature authority,
// database access, grading, auth, assignment or Exam write path belongs here.
assert.match(bootstrap, /existingMathApp\.version = '5\.8\.2-preview'/);
assert.match(bootstrap, /existingMathApp\.boot/);
for (const forbidden of [
  /cloud\.rpc\(/,
  /cloud\.from\(/,
  /supabase\.rpc\(/,
  /supabase\.from\(/,
  /grade_practice_response/,
  /submit_practice_session/,
  /finalize_exam_attempt/,
  /validate_student_access/
]) {
  assert.doesNotMatch(bootstrap, forbidden,
    `Bootstrap must not acquire application/data authority (${forbidden})`);
}

console.log('V5.8.2 bootstrap consolidation verification passed.');
