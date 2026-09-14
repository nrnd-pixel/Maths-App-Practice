#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SITE_ROOT = path.join(REPO_ROOT, 'site');
const migrationPath = path.join(
  REPO_ROOT,
  'supabase',
  '20260914134600_student_adaptive_question_readiness_v2.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');
const includes = (needle, message) => assert.ok(sql.includes(needle), message);

function runtimeFiles(root) {
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    const relative = path.relative(SITE_ROOT, full).replaceAll(path.sep, '/');
    if (entry.isDirectory()) {
      if (relative === 'tests' || relative.startsWith('tests/')) continue;
      out.push(...runtimeFiles(full));
      continue;
    }
    if (/\.(?:js|html)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

// Versioned, additive server-only RPC boundary.
includes('create or replace function public.student_adaptive_question_readiness_v2(', 'readiness V2 RPC must exist');
includes('p_access_token text', 'RPC must require a Practice access token');
includes('p_question_id uuid', 'RPC must require a target question');
includes('p_require_diagnostic_route boolean default true', 'diagnostic-route readiness must default fail-closed');
includes('returns jsonb', 'RPC must return a compact JSON status');
includes('stable', 'readiness RPC must remain read-only/stable');
includes('security definer', 'readiness RPC needs scoped definer authority');
includes("set search_path to ''", 'readiness RPC must use an empty search path');

// Practice ticket validation must match the established token boundary.
includes("t.token_hash = extensions.digest(trim(coalesce(p_access_token, '')), 'sha256')", 'ticket token must be hashed server-side');
includes('t.expires_at > now()', 'expired Practice tickets must be rejected');
includes("t.purpose = 'practice'", 'only Practice-purpose tickets may pass');
includes('v_ticket.roster_student_id is null', 'readiness must require a roster-backed ticket');
includes('v_ticket.year_level is null', 'readiness must require ticket year context');
includes("'status', 'ACCESS_DENIED'", 'invalid tickets must fail closed');

// Question availability and year isolation are mandatory before Metadata V2 is read.
includes('where q.id = p_question_id', 'target question lookup must be exact');
includes('and q.active = true', 'target question must be active');
includes('and q.practice_eligible = true', 'target question must be Practice-eligible');
includes('v_question.year_level is distinct from v_ticket.year_level', 'target question must match ticket year level');
includes("'status', 'QUESTION_NOT_AVAILABLE'", 'unavailable questions need a coarse status');
includes("'status', 'YEAR_MISMATCH'", 'year mismatch must fail closed explicitly');

// Metadata V2 is an eligibility/evidence gate only; every authored safety condition is rechecked.
includes('from public.question_demand_profile_v2 p', 'readiness must use Metadata V2 server-side');
includes("v_profile.profile_status <> 'reviewed'", 'profile must be reviewed');
includes("v_profile.source_evidence_status not in ('verified', 'verified_with_correction')", 'source evidence must be verified');
includes("v_profile.adaptive_use_status <> 'eligible'", 'adaptive use must be explicitly eligible');
includes('cardinality(v_profile.held_dimensions) <> 0', 'held dimensions must fail closed');
for (const column of [
  'procedural_demand',
  'conceptual_reasoning',
  'reading_context_load',
  'visual_spatial_demand',
  'response_complexity',
]) {
  includes(`v_profile.${column} is null`, `readiness must reject missing ${column}`);
}
for (const status of [
  'NO_METADATA_PROFILE',
  'PROFILE_NOT_REVIEWED',
  'SOURCE_NOT_VERIFIED',
  'ADAPTIVE_NOT_ELIGIBLE',
  'PROFILE_HELD_OR_INCOMPLETE',
]) {
  includes(`'status', '${status}'`, `${status} must remain a stable fail-closed result`);
}

// Response types are deliberately narrow. Drawing/manual are explicitly rejected.
includes("v_response_type in ('drawing', 'manual')", 'drawing/manual must be explicitly rejected');
for (const supported of [
  'text',
  'number',
  'number_unit',
  'fraction',
  'multiple_choice',
  'multi_select',
  'multi_blank',
]) {
  includes(`'${supported}'`, `${supported} must remain in the supported response whitelist`);
}
includes("'status', 'UNSUPPORTED_RESPONSE_TYPE'", 'unsupported response types must fail closed');

// Curated curriculum mapping remains the diagnostic route authority.
includes('if v_require_route then', 'route readiness must be conditional but default on');
includes('v_route := public.adaptive_route_preview_v1(p_question_id);', 'route readiness must delegate to the curated route preview');
includes("coalesce(v_route->>'status', '') = 'NO_PRIMARY_MAPPING'", 'missing PRIMARY mapping must be preserved as an explicit failure');
includes("coalesce(v_route->>'status', '') <> 'READY'", 'non-ready curated routes must be rejected');
includes("'status', 'NO_PRIMARY_MAPPING'", 'NO_PRIMARY_MAPPING status must remain stable');
includes("'status', 'ROUTE_NOT_READY'", 'ROUTE_NOT_READY status must remain stable');

// Ready output is deliberately minimal and never returns demand/evidence/audit details.
includes("'version', 'adaptive_question_readiness_v2'", 'RPC must identify its contract version');
includes("'status', 'READY'", 'RPC must expose a READY result only after every gate');
includes("'diagnostic_route_ready'", 'ready payload may state only the boolean route result');
for (const forbidden of [
  'evidence_note',
  'reviewed_by',
  'question_demand_profile_v2_history',
  'old_profile',
  'new_profile',
]) {
  assert.ok(!sql.includes(forbidden), `${forbidden} must never be exposed by the student readiness RPC`);
}

// Stage 1 must not absorb the V5.9B pilot allow-list or mutate any adaptive/question/profile data.
assert.doesNotMatch(sql, /adaptive_pilot_settings/i, 'pilot settings remain a separate activation boundary');
assert.doesNotMatch(sql, /student_adaptive_pilot_access_v59b/i, 'pilot access remains separate from Metadata V2 readiness');
assert.doesNotMatch(sql, /\binsert\s+into\b/i, 'Stage 1 readiness migration must not insert application data');
assert.doesNotMatch(sql, /\bupdate\s+public\./i, 'Stage 1 readiness migration must not update application data');
assert.doesNotMatch(sql, /\bdelete\s+from\b/i, 'Stage 1 readiness migration must not delete application data');
assert.doesNotMatch(sql, /grade_practice_response|request_practice_hint|submit_practice_session/i, 'Stage 1 must not replace grading/hint/submission owners');

// No browser runtime may read Metadata V2 directly.
for (const file of runtimeFiles(SITE_ROOT)) {
  const source = fs.readFileSync(file, 'utf8');
  assert.ok(
    !source.includes('question_demand_profile_v2') && !source.includes('question_demand_profile_v2_history'),
    `${path.relative(REPO_ROOT, file)} must not directly read Metadata V2 tables`,
  );
}

// Browser roles receive only EXECUTE on the narrow SECURITY DEFINER RPC.
includes('revoke all on function public.student_adaptive_question_readiness_v2(text, uuid, boolean)', 'readiness RPC must revoke default execute first');
includes('from public, anon, authenticated;', 'default/browser execute must start revoked');
includes('grant execute on function public.student_adaptive_question_readiness_v2(text, uuid, boolean)', 'readiness RPC needs an explicit execute grant');
includes('to anon, authenticated, postgres, service_role;', 'execute grant must stay limited to established RPC roles');

console.log('PASS: adaptive question readiness V2 is server-only, fail-closed, Metadata-V2-gated, route-aware, and non-mutating.');
