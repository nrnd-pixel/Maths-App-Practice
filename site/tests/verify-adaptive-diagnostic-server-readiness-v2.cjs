#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const migrationPath = path.join(
  REPO_ROOT,
  'supabase',
  '20260915023000_adaptive_diagnostic_server_readiness_v2.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');

function includes(source, needle, message) {
  assert.ok(source.includes(needle), message);
}

function functionBody(name) {
  const marker = `create or replace function public.${name}(`;
  const start = sql.indexOf(marker);
  assert.notEqual(start, -1, `${name} must be replaced by the hardening migration`);
  const end = sql.indexOf('\n$function$;', start);
  assert.notEqual(end, -1, `${name} function body terminator must exist`);
  return sql.slice(start, end + '\n$function$;'.length);
}

const plan = functionBody('student_adaptive_diagnostic_plan_v1');
const grade = functionBody('student_adaptive_diagnostic_grade_v1');

// Migration must depend on the already-deployed Stage 1 readiness contract and
// the existing V5.9B pilot functions rather than creating a parallel authority.
for (const proc of [
  'public.student_adaptive_question_readiness_v2(text,uuid,boolean)',
  'public.student_adaptive_pilot_access_v59b(text,uuid)',
  'public.student_adaptive_diagnostic_plan_v1(text,uuid)',
  'public.student_adaptive_diagnostic_grade_v1(text,uuid,uuid,text,jsonb)',
]) {
  includes(sql, `to_regprocedure('${proc}')`, `${proc} must be required by preflight`);
}

// Plan delivery must keep pilot access AND independently require Metadata V2
// readiness before returning any target/diagnostic content.
includes(plan, 'public.student_adaptive_pilot_access_v59b(p_access_token,p_target_question_id)', 'plan must retain pilot student/target allow-list access');
includes(plan, 'public.student_adaptive_question_readiness_v2(', 'plan must call readiness V2 server-side');
includes(plan, 'p_target_question_id,\n    true', 'plan must require curated diagnostic-route readiness');
includes(plan, "coalesce(v_readiness->>'status','') <> 'READY'", 'plan must fail closed on any non-READY result');
includes(plan, "'status','READINESS_BLOCKED'", 'plan must expose a stable blocked status');
assert.ok(
  plan.indexOf('student_adaptive_pilot_access_v59b') < plan.indexOf('student_adaptive_question_readiness_v2'),
  'pilot access must be checked before readiness details are evaluated',
);
assert.ok(
  plan.indexOf('student_adaptive_question_readiness_v2') < plan.indexOf('student_adaptive_safe_question_v59b(p_target_question_id)'),
  'target content must not be returned before readiness passes',
);

// Diagnostic-plan rows must themselves be safe for the current Practice ticket.
includes(plan, 'q.active is distinct from true', 'plan must reject inactive diagnostic questions');
includes(plan, 'q.practice_eligible is distinct from true', 'plan must reject Practice-ineligible diagnostic questions');
includes(plan, 'q.year_level is distinct from v_ticket.year_level', 'plan must reject cross-year diagnostic questions');
includes(plan, "'text','number','number_unit','fraction','multiple_choice','multi_select','multi_blank'", 'plan must keep the supported diagnostic response whitelist');
includes(plan, 'if v_step_count = 0 or v_invalid_step then', 'empty/unsafe plans must fail closed');
includes(plan, "'status','DIAGNOSTIC_PLAN_NOT_READY'", 'unsafe plan status must remain explicit');

// Grading must independently enforce readiness on every call before any write.
includes(grade, 'public.student_adaptive_pilot_access_v59b(p_access_token,p_target_question_id)', 'grader must retain pilot access');
includes(grade, 'public.student_adaptive_question_readiness_v2(', 'grader must call readiness V2 server-side');
includes(grade, 'p_target_question_id,\n    true', 'grader must require curated route readiness');
includes(grade, "coalesce(v_readiness->>'status','') <> 'READY'", 'grader must fail closed on non-READY target');
includes(grade, "'status','READINESS_BLOCKED'", 'grader must expose a stable blocked status');
const readinessPos = grade.indexOf('student_adaptive_question_readiness_v2');
const insertPos = grade.indexOf('insert into public.adaptive_pilot_diagnostic_events');
assert.ok(readinessPos !== -1 && insertPos !== -1 && readinessPos < insertPos, 'readiness must be checked before diagnostic-event insertion');

// Existing plan-membership, target-retry and grading boundaries must remain.
includes(grade, "p_stage not in ('diagnostic','target_retry')", 'only diagnostic/target_retry stages may grade');
includes(grade, "if p_stage='target_retry' then", 'target retry path must remain explicit');
includes(grade, 'p.diagnostic_question_id=p_question_id', 'diagnostic grading must require active plan membership');
includes(grade, 'and p.is_active=true', 'diagnostic plan membership must be active');
includes(grade, 'and q.active=true', 'graded question must be active');
includes(grade, 'and q.practice_eligible=true', 'graded question must be Practice-eligible');
includes(grade, 'and q.year_level=v_ticket.year_level', 'graded question must match Practice ticket year');
includes(grade, "'text','number','number_unit','fraction','multiple_choice','multi_select','multi_blank'", 'grader must keep the supported response whitelist');
includes(grade, 'public.student_response_is_empty', 'empty diagnostic responses must still be rejected');
includes(grade, 'public.student_response_is_correct(v_question,p_response)', 'diagnostic grading must remain server-authoritative');
assert.equal((grade.match(/insert into public\.adaptive_pilot_diagnostic_events/g) || []).length, 1, 'grader must write only one diagnostic-event path');

// No other adaptive or ordinary-Practice authority may be mutated by this migration.
assert.doesNotMatch(sql, /(?:insert\s+into|update|delete\s+from)\s+public\.question_demand_profile_v2\b/i, 'hardening must not mutate Metadata V2 profiles');
assert.doesNotMatch(sql, /(?:insert\s+into|update|delete\s+from)\s+public\.adaptive_pilot_settings\b/i, 'hardening must not mutate pilot settings');
assert.doesNotMatch(sql, /(?:insert\s+into|update|delete\s+from)\s+public\.questions\b/i, 'hardening must not mutate question rows');
assert.doesNotMatch(sql, /(?:insert\s+into|update|delete\s+from)\s+public\.student_practice_answer_events\b/i, 'hardening must not mutate ordinary Practice answer evidence');
assert.doesNotMatch(sql, /grade_practice_response|request_practice_hint|submit_practice_session/i, 'ordinary Practice grading/hint/submission owners must remain untouched');
assert.doesNotMatch(sql, /drop\s+function/i, 'hardening must replace rather than drop adaptive RPC contracts');

// Browser execute grants remain explicit and no PUBLIC execute is restored.
for (const signature of [
  'public.student_adaptive_diagnostic_plan_v1(text,uuid)',
  'public.student_adaptive_diagnostic_grade_v1(text,uuid,uuid,text,jsonb)',
]) {
  includes(sql, `revoke all on function ${signature}`, `${signature} must revoke default execute first`);
  includes(sql, `grant execute on function ${signature}`, `${signature} must receive an explicit execute grant`);
}
includes(sql, 'from public, anon, authenticated;', 'PUBLIC/browser defaults must be explicitly revoked');
includes(sql, 'to anon, authenticated, postgres, service_role;', 'execute scope must remain the established browser/server roles');

console.log('PASS: adaptive diagnostic plan/grader now enforce readiness V2 server-side before content delivery or diagnostic-event writes.');
