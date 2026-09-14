const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const EXPECTED = Object.freeze({
  'supabase/20260907073416_add_adaptive_route_preview_v1.sql': Object.freeze({
    bytes: 5938,
    sha256: 'cefc80b2943dc7e0d8bf616686962bcc8fa98448ac5632ce6313b8394fbc75e4',
    gitBlob: 'd00b2284dd639f58ef16de880cb995346b5532d9',
    required: [
      'create or replace function public.adaptive_route_preview_v1(p_question_id uuid)',
      'security invoker',
      "grant execute on function public.adaptive_route_preview_v1(uuid) to service_role;",
    ],
  }),
  'supabase/20260907080542_adaptive_pilot_feature_gate_v1.sql': Object.freeze({
    bytes: 3864,
    sha256: '5040991d5f91c183422842e456db6f4a15658c1c695c89350b3d1df0326ce957',
    gitBlob: '5565dfd1a4e67384cf69a61188b1e3452a24af39',
    required: [
      'create table if not exists public.adaptive_pilot_settings',
      'create or replace function public.student_adaptive_route_preview_v1(',
      "grant execute on function public.student_adaptive_route_preview_v1(text, uuid) to anon, authenticated, service_role, postgres;",
    ],
  }),
  'supabase/20260907150643_v59b_interactive_adaptive_diagnostic_pilot.sql': Object.freeze({
    bytes: 15415,
    sha256: '3d53564b91cb566c5f5cb9053a0ee3b95f9cac363471035a006f50f04afeb318',
    gitBlob: '28454d0b3bb19972be5915271842b36d920d3aba',
    required: [
      'create table if not exists public.adaptive_pilot_diagnostic_plan',
      'create table if not exists public.adaptive_pilot_diagnostic_events',
      'create or replace function public.student_adaptive_trigger_check_v1(',
      'create or replace function public.student_adaptive_diagnostic_plan_v1(',
      'create or replace function public.student_adaptive_diagnostic_grade_v1(',
      'commit;',
    ],
  }),
});

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(header).update(buffer).digest('hex');
}

for (const [relativePath, expected] of Object.entries(EXPECTED)) {
  const absolutePath = path.join(ROOT, relativePath);
  assert.ok(fs.existsSync(absolutePath), `${relativePath} must exist`);
  const bytes = fs.readFileSync(absolutePath);
  const source = bytes.toString('utf8');

  assert.equal(bytes.length, expected.bytes, `${relativePath} byte length drifted`);
  assert.equal(sha256(bytes), expected.sha256, `${relativePath} SHA-256 drifted from the deployed production migration record`);
  assert.equal(gitBlobSha(bytes), expected.gitBlob, `${relativePath} Git blob SHA drifted from the reconciled production source`);

  for (const token of expected.required) {
    assert.ok(source.includes(token), `${relativePath} missing contract token: ${token}`);
  }
}

console.log('Adaptive production source reconciliation: PASS');
