'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const site = path.join(__dirname, '..');
const modulePath = path.join(site, 'v59b-adaptive-diagnostic-pilot-v2.js');
const configPath = path.join(site, 'config.js');
const source = fs.readFileSync(modulePath, 'utf8');
const config = fs.readFileSync(configPath, 'utf8');

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

assert.match(source, /latestCompletedWrongAnswer/,
  'adaptive checks must run only after ordinary Practice records a completed wrong answer');
assert.match(source, /restoreNormalPractice/,
  'pilot must provide a normal-Practice restoration path');
assert.match(source, /diagnostic plan unavailable[\s\S]*restoreNormalPractice\(\)/,
  'plan/network failure must fail closed back to normal Practice');
assert.match(source, /This activity does not change your Practice score, XP, mastery or assignment result/,
  'pilot UI must state the unscored boundary');
assert.match(source, /This retry is for learning only and does not change your Practice result/,
  'target retry must be explicitly unscored');

console.log('V5.9B adaptive diagnostic pilot V2 integrity checks passed.');
console.log('- explicit ?adaptivePilot=2 gate; disabled path makes no runtime wrapper changes');
console.log('- wraps only ordinary submit after authoritative grading; no cloud.rpc wrapper');
console.log('- requires pilot trigger + Metadata V2 readiness before loading diagnostics');
console.log('- diagnostics and target retry use only student_adaptive_diagnostic_grade_v1');
console.log('- no answer-key/table access, no Practice result/XP/mastery write path');
console.log('- failure/skip restores ordinary Practice interaction');