'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const site = path.join(__dirname, '..');
const repo = path.join(site, '..');
const modulePath = path.join(site, 'v59b-adaptive-diagnostic-pilot-v2.js');
const configPath = path.join(site, 'config.js');
const migrationPath = path.join(repo, 'supabase', '20260916010000_adaptive_pilot_lifecycle_telemetry_v1.sql');
const source = fs.readFileSync(modulePath, 'utf8');
const config = fs.readFileSync(configPath, 'utf8');
const migration = fs.readFileSync(migrationPath, 'utf8');

assert.ok(config.includes("'./v59b-adaptive-diagnostic-pilot-v2.js'"),
  'config.js must register the V5.9B V2 pilot module');
assert.ok(
  config.indexOf("'./v59b-adaptive-diagnostic-pilot-v2.js'") >
    config.indexOf("'./v59a-student-home-refresh.js'"),
  'adaptive pilot must load after the accepted V5.9A student Home layer'
);

assert.match(source, /adaptivePilot['"]\)\s*===\s*['"]2['"]/,
  'pilot must be dormant unless ?adaptivePilot=2 is present');
assert.match(source, /if \(!enabled\)\s*\{/,
  'disabled pilot must return through an explicit gate');
assert.match(source, /__v59bAdaptiveDiagnosticPilotV2Installed/,
  'pilot must have a double-install guard');

assert.match(source, /baseSubmit\s*=\s*submit/,
  'pilot must capture the final ordinary Practice submit owner');
assert.match(source, /submit\s*=\s*wrappedSubmit/,
  'pilot must install only a narrow submit wrapper');
assert.match(source, /checkButton\.onclick\s*=\s*wrappedSubmit/,
  'existing Check button must be rebound to the narrow submit wrapper');
assert.match(source, /await baseSubmit\.apply\(this, args\)/,
  'ordinary Practice submit/grading must finish before adaptive checks');

for (const forbidden of [
  /startPractice\s*=/,
  /getQuestions\s*=/,
  /finishPractice\s*=/,
  /cloud\.rpc\s*=(?!=)/,
]) {
  assert.doesNotMatch(source, forbidden,
    `adaptive pilot must not install forbidden runtime owner: ${forbidden}`);
}

assert.doesNotMatch(source, /validateStudentAccess\s*\(/,
  'pilot must reuse the current Practice ticket instead of reacquiring access');
assert.match(source, /s\?\.accessToken[\s\S]*activeStudentAccess\?\.access_token/,
  'pilot must use the same existing Practice-ticket sources as authoritative grading');

assert.match(source, /function activeItemQuestionIds\(question\)/,
  'pilot must identify the physical question ids inside the active Practice item');
assert.match(source, /question\?\._kind\s*===\s*['"]multipart['"][\s\S]*question\.parts[\s\S]*part\?\.id/,
  'multipart Practice items must expose their individual part ids to the pilot');
assert.doesNotMatch(source, /if \(!s \|\| !q \|\| q\?\._kind === ['"]multipart['"]\) return null/,
  'pilot must not blanket-reject multipart Practice items');
assert.match(source, /function completedWrongCandidates\(snapshot\)/,
  'pilot must derive candidates only from answers appended by the completed ordinary submit');
assert.match(source, /s\.answers\s*\.slice\(snapshot\.answersLength\)/,
  'pilot must inspect only newly appended ordinary Practice answer records');
assert.match(source, /allowedIds\.has\(questionId\)/,
  'new answer records must be constrained to the active standalone question or multipart parts');
assert.match(source, /answer\?\.correct\s*===\s*false/,
  'only completed wrong ordinary Practice answers may become adaptive candidates');
assert.match(source, /for \(const candidate of candidates\)/,
  'multipart candidates must be checked independently so an ineligible sibling cannot block an eligible part');

const triggerAt = source.indexOf("rpc('student_adaptive_trigger_check_v1'");
const readinessAt = source.indexOf("rpc('student_adaptive_question_readiness_v2'");
const planAt = source.indexOf("rpc('student_adaptive_diagnostic_plan_v1'");
assert.ok(triggerAt >= 0, 'pilot must call the server pilot trigger/allow-list gate');
assert.ok(readinessAt > triggerAt, 'Metadata V2 readiness must be checked after pilot access/trigger');
assert.ok(planAt > readinessAt, 'diagnostic plan must load only after both gates pass');
assert.match(source, /trigger\?\.should_offer\s*!==\s*true/,
  'browser must require the server should_offer decision');
assert.match(source, /readiness\?\.status\s*!==\s*['"]READY['"]/,
  'browser must require READY from Metadata V2 readiness');

assert.match(source, /student_adaptive_diagnostic_grade_v1/,
  'diagnostic answers must use the dedicated server-side diagnostic grader');
assert.match(source, /p_stage:\s*['"]diagnostic['"]/,
  'diagnostic stage must be explicit');
assert.match(source, /p_stage:\s*['"]target_retry['"]/,
  'unscored target retry must use the separate target_retry stage');

assert.match(source, /function queueLifecycleEvent\(eventType, session = adaptiveSession\)/,
  'Stage 3E lifecycle telemetry must use a dedicated non-scoring queue');
assert.match(source, /rpc\('student_adaptive_lifecycle_event_v1'/,
  'Stage 3E lifecycle events must use the narrow server telemetry RPC');
assert.match(source, /session\.telemetryTail\s*=\s*previous[\s\S]*\.catch\(error\s*=>/,
  'telemetry writes must be serialised and errors swallowed locally');
assert.doesNotMatch(source, /await\s+queueLifecycleEvent\s*\(/,
  'student interaction must never await telemetry');
for (const eventType of [
  'offer_shown',
  'offer_accepted',
  'offer_declined',
  'diagnostic_skipped',
  'diagnostic_completed',
  'target_retry_submitted',
  'returned_to_practice',
  'adaptive_error_recovered',
]) {
  assert.ok(source.includes(`'${eventType}'`), `runtime must emit ${eventType}`);
}
assert.match(source, /renderOffer\(\);\s*queueLifecycleEvent\('offer_shown'\)/,
  'offer_shown must be queued only after the offer is rendered');
assert.match(source, /queueLifecycleEvent\('offer_accepted'\);\s*loadPlan\(\)/,
  'acceptance telemetry must not replace the plan-loading action');
assert.match(source, /isLastDiagnostic[\s\S]*queueLifecycleEvent\('diagnostic_completed'\)/,
  'diagnostic_completed must be tied to completing the final diagnostic step');
assert.match(source, /addReturnAction\(actions, 'Skip and continue Practice', isLastDiagnostic \? null : 'diagnostic_skipped'\)/,
  'completed final diagnostic must not also be labelled as diagnostic_skipped');
assert.match(source, /renderTargetRetry\(\)[\s\S]*addReturnAction\(actions, 'Skip and continue Practice'\);/,
  'leaving an unsubmitted target retry must not be mislabelled as diagnostic_skipped');
assert.match(source, /queueLifecycleEvent\('target_retry_submitted'\);[\s\S]*feedbackBox/,
  'target_retry_submitted must be queued only after the dedicated grader returns READY');

for (const forbidden of [
  /question_demand_profile_v2/,
  /question_demand_profile_v2_history/,
  /\.from\s*\(\s*['"]questions['"]\s*\)/,
  /correct_answer/,
  /accepted_answers/,
  /\.insert\s*\(/,
  /\.update\s*\(/,
  /\.delete\s*\(/,
]) {
  assert.doesNotMatch(source, forbidden,
    `pilot must not expose/bypass protected data authority: ${forbidden}`);
}

assert.match(source, /restoreNormalPractice/,
  'pilot must provide a normal-Practice restoration path');
assert.match(source, /diagnostic plan unavailable[\s\S]*recoverToPractice\(\)/,
  'plan/network failure must recover back to normal Practice');
assert.match(source, /This activity does not change your Practice score, XP, mastery or assignment result/,
  'pilot UI must state the unscored boundary');
assert.match(source, /This retry is for learning only and does not change your Practice result/,
  'target retry must be explicitly unscored');

assert.match(migration, /create table if not exists public\.adaptive_pilot_lifecycle_events/,
  'Stage 3E must add an isolated lifecycle evidence table');
assert.match(migration, /unique \(flow_id, event_type\)/,
  'lifecycle events must be idempotent per flow/event type');
assert.match(migration, /practice_ticket_id uuid not null,/,
  'lifecycle evidence must retain the Practice ticket UUID as a snapshot identifier');
assert.doesNotMatch(migration, /practice_ticket_id uuid not null references public\.student_access_tickets/,
  'routine Practice-ticket cleanup must not cascade-delete lifecycle evidence');
assert.match(migration, /alter table public\.adaptive_pilot_lifecycle_events enable row level security/,
  'lifecycle table must have RLS enabled');
assert.match(migration, /revoke all on public\.adaptive_pilot_lifecycle_events from public, anon, authenticated/,
  'student/browser roles must not write the lifecycle table directly');
assert.match(migration, /create or replace function public\.student_adaptive_lifecycle_event_v1\(/,
  'Stage 3E must expose one narrow telemetry RPC');
assert.match(migration, /security definer[\s\S]*set search_path=''/,
  'telemetry RPC must preserve the SECURITY DEFINER empty-search-path boundary');
assert.match(migration, /student_adaptive_pilot_access_v59b\([\s\S]*student_adaptive_question_readiness_v2\(/,
  'telemetry RPC must independently enforce pilot access and readiness V2');
assert.match(migration, /student_adaptive_trigger_check_v1\([\s\S]*TRIGGER_BLOCKED/,
  'offer_shown must require the authoritative trigger condition server-side');
assert.match(migration, /p_flow_id is not null[\s\S]*INVALID_FLOW[\s\S]*gen_random_uuid\(\)/,
  'offer_shown must receive a server-generated flow id rather than trusting the browser');
assert.match(migration, /FLOW_NOT_FOUND/,
  'later lifecycle events must require a matching recorded offer flow');
assert.match(migration, /v_has_skipped[\s\S]*v_has_completed[\s\S]*INVALID_TRANSITION/,
  'diagnostic completed/skipped outcomes must be mutually exclusive server-side');
assert.match(migration, /v_event_type='adaptive_error_recovered'[\s\S]*v_has_accept[\s\S]*INVALID_TRANSITION/,
  'error recovery evidence must require an accepted adaptive flow');
assert.match(migration, /on conflict \(flow_id,event_type\) do nothing/,
  'duplicate browser events must be harmless and idempotent');
assert.doesNotMatch(migration, /create or replace function public\.student_adaptive_diagnostic_grade_v1/,
  'Stage 3E must not alter the diagnostic grading contract');
assert.doesNotMatch(migration, /update\s+public\.adaptive_pilot_settings/i,
  'Stage 3E must not widen or mutate the pilot allow-list');
assert.doesNotMatch(migration, /update\s+public\.question_demand_profile_v2/i,
  'Stage 3E must not mutate Metadata V2 eligibility');

const tableStart = migration.indexOf('create table if not exists public.adaptive_pilot_lifecycle_events');
const tableEnd = migration.indexOf(');', tableStart);
const tableBlock = migration.slice(tableStart, tableEnd + 2);
const forbiddenColumns = [
  ['student_name', /^\s*student_name\s+/im],
  ['student_id', /^\s*student_id\s+/im],
  ['pin', /^\s*pin\s+/im],
  ['ip_address', /^\s*ip_address\s+/im],
  ['response jsonb', /^\s*response\s+jsonb\b/im],
  ['answer', /^\s*answer\s+/im],
];
for (const [name, declarationPattern] of forbiddenColumns) {
  assert.doesNotMatch(tableBlock, declarationPattern,
    `lifecycle table must not store sensitive/answer field: ${name}`);
}

const selectorMarker = '/* Stage 3E deploy-preview-only adaptive target selector.';
const selectorAt = config.indexOf(selectorMarker);
assert.ok(selectorAt >= 0,
  'temporary Stage 3E production-smoke selector must be explicitly marked in config.js');
const selector = config.slice(selectorAt);
assert.ok(selector.includes("const preview=/^deploy-preview-\\d+--.+\\.netlify\\.app$/i.test(location.hostname);"),
  'temporary selector must be deploy-preview-only');
assert.ok(selector.includes("params.get('adaptivePilot')!=='2'"),
  'temporary selector must require ?adaptivePilot=2');
assert.ok(selector.includes("pilotRoster='5e386522-ae0f-4c82-8cf3-6bf0979272f7'"),
  'temporary selector must be restricted to the sole pilot roster UUID');
assert.ok(selector.includes("String(activeStudentAccess?.roster_student_id||'')===pilotRoster"),
  'temporary selector must verify the active roster identity');
assert.ok(selector.includes("q9b:{id:'c4feda04-6c85-4123-baf6-8e38deb1d1fa'"),
  'temporary selector must expose exact Q9(b) target');
assert.ok(selector.includes("q4:{id:'c2041abf-d204-47b3-ba92-3129c97681ae'"),
  'temporary selector must expose exact Q4 target');
assert.ok(!selector.includes('077872ec-2c3c-402f-9c51-491c77500791'),
  'Q30 must not be exposed by the Stage 3E telemetry smoke selector');
assert.ok(selector.includes('await startPractice();'),
  'temporary selector must delegate retrieval to ordinary Practice');
assert.ok(selector.includes('state.questions=[item];state.index=0;state.count=1;renderQuestion();'),
  'temporary selector may only pin an item already returned by ordinary Practice');
for (const forbidden of [
  'cloud.rpc(',
  ".from('questions')",
  'student_adaptive_lifecycle_event_v1',
  'student_adaptive_trigger_check_v1',
  'student_adaptive_question_readiness_v2',
]) {
  assert.ok(!selector.includes(forbidden),
    `temporary selector must not own server/data authority: ${forbidden}`);
}

console.log('V5.9B adaptive diagnostic pilot V2 + Stage 3E telemetry integrity checks passed.');
console.log('- explicit ?adaptivePilot=2 gate; disabled path makes no runtime wrapper changes');
console.log('- wraps only ordinary submit after authoritative grading; no cloud.rpc wrapper');
console.log('- standalone and multipart completed-wrong answer records are inspected only after grading');
console.log('- requires pilot trigger + Metadata V2 readiness before loading diagnostics');
console.log('- diagnostics and target retry use only student_adaptive_diagnostic_grade_v1');
console.log('- Stage 3E telemetry is queued, non-blocking and server-authorised');
console.log('- telemetry stores only pseudonymous flow/ticket/roster/target ids plus a lifecycle enum');
console.log('- ticket cleanup cannot erase lifecycle evidence and contradictory outcomes fail closed');
console.log('- temporary smoke selector is preview+flag+pilot-roster gated and delegates to ordinary Practice');
console.log('- no answer-key/table access, no Practice result/XP/mastery write path');
console.log('- failure/skip restores ordinary Practice interaction');