#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const migrationPath = path.join(REPO_ROOT, 'supabase', 'question_metadata_v2_demand_profile.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

const includes = (needle, message) => assert.ok(sql.includes(needle), message);

// Additive, one-row-per-question profile surface.
includes('create table public.question_demand_profile_v2 (', 'Metadata V2 profile table must exist');
includes('question_id uuid primary key', 'profile must be one row per physical question');
includes('references public.questions(id) on delete cascade', 'profile must follow question lifecycle without blocking question deletion');
includes("metadata_version text not null", 'rubric version must be explicit');
assert.doesNotMatch(sql, /assessment_stage/i, 'uncalibrated assessment_stage must stay out of the first schema');

for (const column of [
  'procedural_demand',
  'conceptual_reasoning',
  'reading_context_load',
  'visual_spatial_demand',
  'response_complexity',
]) {
  assert.match(sql, new RegExp(`${column}\\s+smallint\\s+null`, 'i'), `${column} must remain typed smallint`);
  assert.match(sql, new RegExp(`${column}\\s+is null or ${column} between 0 and 3`, 'i'), `${column} must remain bounded to 0–3`);
  includes(`'${column}'`, `${column} must be an allowed HOLD dimension`);
}

includes("held_dimensions text[] not null default '{}'::text[]", 'HOLD dimensions must be explicit and default empty');
includes("held_dimensions <@ array[", 'held_dimensions must reject unknown dimension names');
includes("source_evidence_status text not null default 'needs_review'", 'source evidence must default safe');
includes("source_evidence_status in ('verified', 'verified_with_correction', 'needs_review')", 'source evidence states must remain controlled');
includes("adaptive_use_status text not null default 'hold'", 'adaptive use must default to hold');
includes("adaptive_use_status in ('eligible', 'hold', 'excluded')", 'adaptive use states must remain controlled');
includes("profile_status text not null default 'draft'", 'profiles must default draft');
includes("profile_status in ('draft', 'reviewed')", 'profile states must remain controlled');

// Reviewed completeness: every dimension is exactly scored XOR held, with evidence.
includes('constraint question_demand_profile_v2_reviewed_complete check', 'reviewed-profile completeness constraint must exist');
includes("profile_status <> 'reviewed'", 'draft rows may remain incomplete');
includes('char_length(btrim(evidence_note)) > 0', 'reviewed profiles must carry evidence rationale');
for (const column of [
  'procedural_demand',
  'conceptual_reasoning',
  'reading_context_load',
  'visual_spatial_demand',
  'response_complexity',
]) {
  includes(`(${column} is null and '${column}' = any(held_dimensions))`, `${column} HOLD must require NULL score`);
  includes(`(${column} is not null and not ('${column}' = any(held_dimensions)))`, `${column} scored state must not also be held`);
}

// Adaptive readiness remains database-authoritative and fail-closed.
includes('constraint question_demand_profile_v2_adaptive_eligibility check', 'adaptive eligibility constraint must exist');
includes("adaptive_use_status <> 'eligible'", 'only eligible rows should enter the strict readiness branch');
includes("profile_status = 'reviewed'", 'adaptive eligibility must require reviewed profile');
includes("source_evidence_status in ('verified', 'verified_with_correction')", 'adaptive eligibility must require verified source evidence');
includes('cardinality(held_dimensions) = 0', 'adaptive eligibility must reject held dimensions');
for (const column of [
  'procedural_demand',
  'conceptual_reasoning',
  'reading_context_load',
  'visual_spatial_demand',
  'response_complexity',
]) {
  includes(`${column} is not null`, `adaptive eligibility must require ${column}`);
}

// Separate append-only audit surface, written only through private trigger authority.
includes('create table public.question_demand_profile_v2_history (', 'profile history table must exist');
includes("operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE'))", 'history operations must be controlled');
includes('old_profile jsonb null', 'history must preserve old profile snapshots');
includes('new_profile jsonb null', 'history must preserve new profile snapshots');
includes("question_identity jsonb not null default '{}'::jsonb", 'history must preserve durable question identity context');
includes('create or replace function private.capture_question_demand_profile_v2_history()', 'audit trigger function must live in private schema');
includes('security definer', 'audit trigger needs scoped definer authority to write protected history');
includes("set search_path to ''", 'audit trigger must use an empty search_path');
includes('auth.uid()', 'audit history should record the current teacher when available');
includes('after insert or update or delete on public.question_demand_profile_v2', 'all profile lifecycle mutations must be audited');
includes('execute function private.capture_question_demand_profile_v2_history()', 'profile history trigger must use private audit function');
includes('revoke all on function private.capture_question_demand_profile_v2_history()', 'audit trigger function must not be a browser RPC');
includes('from public, anon, authenticated;', 'audit trigger execute privilege must be revoked from browser roles');

// RLS + explicit Data API privileges: teachers only, no direct student/anon profile access.
includes('alter table public.question_demand_profile_v2 enable row level security;', 'profile RLS must be enabled');
includes('alter table public.question_demand_profile_v2_history enable row level security;', 'history RLS must be enabled');
includes('revoke all on table public.question_demand_profile_v2 from public, anon, authenticated;', 'profile grants must start fail-closed');
includes('grant select, insert, update, delete on table public.question_demand_profile_v2 to authenticated;', 'authenticated role needs RLS-gated teacher CRUD');
includes('revoke all on table public.question_demand_profile_v2_history from public, anon, authenticated;', 'history grants must start fail-closed');
includes('grant select on table public.question_demand_profile_v2_history to authenticated;', 'history must be teacher-readable only through RLS');

for (const policy of [
  'teachers select question demand profile v2',
  'teachers insert question demand profile v2',
  'teachers update question demand profile v2',
  'teachers delete question demand profile v2',
  'teachers select question demand profile v2 history',
]) {
  includes(`create policy "${policy}"`, `${policy} policy must exist`);
}
includes('using ((select public.is_teacher()))\nwith check ((select public.is_teacher()));', 'teacher UPDATE policy must enforce both USING and WITH CHECK');
assert.doesNotMatch(sql, /to\s+anon\b/i, 'no Metadata V2 RLS policy may target anon');
assert.doesNotMatch(sql, /grant\s+[^;]*\s+to\s+anon\b/i, 'no Metadata V2 table privilege may be granted to anon');

// The schema-only checkpoint must not populate data or alter legacy/runtime owners.
assert.doesNotMatch(sql, /insert\s+into\s+public\.question_demand_profile_v2\s*\(/i, 'schema-only migration must not populate profile rows');
assert.doesNotMatch(sql, /update\s+public\.questions\b/i, 'migration must not rewrite Question Bank rows');
assert.doesNotMatch(sql, /alter\s+table\s+public\.questions\b/i, 'migration must not expand the legacy questions compatibility surface');
assert.doesNotMatch(sql, /update\s+public\.question_skill_map\b/i, 'migration must not change curriculum mappings');
assert.doesNotMatch(sql, /alter\s+table\s+public\.question_skill_map\b/i, 'migration must not repurpose curriculum mapping columns');
assert.doesNotMatch(sql, /adaptive_pilot_settings/i, 'migration must not expand the V5.9B adaptive pilot');

console.log('PASS: Question Metadata V2 schema-only contract is additive, teacher-gated, audited, and fail-closed for adaptive eligibility.');
