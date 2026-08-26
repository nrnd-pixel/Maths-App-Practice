const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const release = fs.readFileSync(path.join(siteRoot, 'v40-release.js'), 'utf8');
const operations = fs.readFileSync(path.join(siteRoot, 'v50-teacher-operations.js'), 'utf8');
const coreSql = fs.readFileSync(path.join(repoRoot, 'supabase', 'v50d2_teacher_operations.sql'), 'utf8');
const safetySql = fs.readFileSync(path.join(repoRoot, 'supabase', 'v50d2_teacher_operations_safety.sql'), 'utf8');

new vm.Script(operations, { filename: 'v50-teacher-operations.js' });

// Loader compatibility: D1 remains stable and D2 is additive.
assert.match(release, /v50-student-launch-readiness\.js\?v=50d1-1', 'data-v50-student-launch-readiness'/,
  'Existing D1 loader must remain stable.');
assert.match(release, /v50-teacher-operations\.js\?v=50d2-1/);
assert.match(release, /data-v50-teacher-operations/);

// Teacher-only operational UI.
assert.match(operations, /Teacher Operational Tools/);
assert.match(operations, /Roster operations/);
assert.match(operations, /Assignment operations/);
assert.match(operations, /Term \/ year rollover preflight/);
assert.match(operations, /PIN administration/);
assert.match(operations, /Delete if unused/);
assert.match(operations, /Check Transfer/);
assert.match(operations, /Confirm Transfer/);
assert.match(operations, /role','dialog/);
assert.match(operations, /aria-modal','true/);
assert.match(operations, /event\.key==='Escape'/);
assert.match(operations, /cloud\.rpc\('get_teacher_operations_v50d2'/);
assert.match(operations, /cloud\.rpc\('set_roster_student_active_v50d2'/);
assert.match(operations, /cloud\.rpc\('transfer_roster_student_v50d2'/);
assert.match(operations, /cloud\.rpc\('manage_teacher_assignment_v50d2'/);
assert.doesNotMatch(operations, /\.from\(/,
  'D2 browser code must not directly mutate or query operational tables.');
assert.doesNotMatch(operations, /localStorage\.setItem|sessionStorage\.setItem/,
  'D2 must not copy operational or credential data into browser storage.');
assert.doesNotMatch(operations, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/);
assert.doesNotMatch(operations, /grade_practice_response|request_practice_hint|finalize_exam_attempt|marks_awarded\s*=/i,
  'D2 must not introduce grading, hint or Exam-finalization logic.');

// Audit log is teacher-owned and read-only from the browser role.
assert.match(coreSql, /create table if not exists public\.teacher_operations_log/i);
assert.match(coreSql, /alter table public\.teacher_operations_log enable row level security/i);
assert.match(coreSql, /public\.is_teacher\(\)/i);
assert.match(coreSql, /executed_by = \(select auth\.uid\(\)\)/i);
assert.match(coreSql, /revoke all on table public\.teacher_operations_log from anon/i);
assert.match(coreSql, /revoke all on table public\.teacher_operations_log from authenticated/i);
assert.match(coreSql, /grant select on table public\.teacher_operations_log to authenticated/i);
assert.doesNotMatch(coreSql, /grant\s+(insert|update|delete)[^;]*teacher_operations_log/i,
  'Authenticated clients must not directly mutate the operations audit log.');

for (const signature of [
  'get_teacher_operations_v50d2\\(\\)',
  'set_roster_student_active_v50d2\\(uuid,boolean\\)',
  'transfer_roster_student_v50d2\\(uuid,uuid,boolean\\)',
  'manage_teacher_assignment_v50d2\\(text,uuid,text,boolean\\)'
]) {
  assert.match(coreSql, new RegExp(`revoke all on function public\\.${signature} from anon`, 'i'));
  assert.match(coreSql, new RegExp(`grant execute on function public\\.${signature} to authenticated`, 'i'));
}

// Final D2 deactivation semantics: revoke access without cascading evidence deletion.
assert.match(safetySql, /create or replace function public\.set_roster_student_active_v50d2/i);
assert.match(safetySql, /update public\.student_access_tickets\s+set expires_at = least\(expires_at, now\(\)\)/i,
  'Deactivation must expire tickets instead of deleting them.');
assert.doesNotMatch(safetySql, /delete\s+from\s+public\.student_access_tickets/i,
  'Operational deactivation/transfer must never delete access tickets because ticket-linked evidence cascades.');
assert.match(safetySql, /'history_preserved', true/i);
assert.match(safetySql, /'pin_preserved', true/i);
assert.doesNotMatch(safetySql, /set\s+pin_hash\s*=/i,
  'D2 roster status and transfer tools must never alter student PIN hashes.');

// Final D2 transfer semantics: same year + completely clean roster record only.
assert.match(safetySql, /V5\.0D2 only allows transfers between classes in the same year level/i);
assert.match(safetySql, /v_history_total :=[\s\S]*v_practice_sessions[\s\S]*v_exam_attempts[\s\S]*v_learning_days[\s\S]*v_assignment_attempts[\s\S]*v_assignment_recipients[\s\S]*v_ai_help[\s\S]*v_messages[\s\S]*v_practice_answer_events/i,
  'Transfer preflight must treat all learning/assigned evidence as a blocker.');
assert.match(safetySql, /if v_history_total > 0 then/i);
assert.match(safetySql, /Class transfer is limited to clean\/new roster records/i);
assert.match(safetySql, /practice_assignment_recipients/i,
  'Targeted assigned work must block a roster transfer even before an attempt starts.');
assert.match(safetySql, /student_practice_answer_events/i,
  'Ticket-linked Practice answer events must count as history.');
assert.match(safetySql, /Student activity changed after preflight\. Refresh and check the transfer again/i,
  'Confirmed transfer must re-check history to guard against stale preflight state.');
assert.match(safetySql, /update public\.class_students\s+set class_id = v_target\.id/i);
assert.doesNotMatch(safetySql, /update public\.(practice_sessions|exam_attempts|session_answers|student_learning_activity_days)\s+set\s+class_id/i,
  'Class transfer must never rewrite historical class attribution.');

// Assignment operations preserve attempts and only delete truly unused definitions.
assert.match(safetySql, /Assignment cannot be activated for an inactive class/i);
assert.match(safetySql, /if v_attempts > 0 then[\s\S]*cannot be deleted\. Deactivate it instead/i);
assert.match(safetySql, /if not coalesce\(p_confirm,false\) then[\s\S]*This unused assignment can be permanently deleted/i,
  'Unused assignment deletion must have a server-side preflight before confirmation.');
assert.match(safetySql, /Student attempt history appeared after preflight\. Deactivate this assignment instead/i,
  'Confirmed deletion must re-check attempt history.');
assert.match(safetySql, /delete from public\.exam_assignments where id = p_assignment_id/i);
assert.match(safetySql, /delete from public\.practice_assignments where id = p_assignment_id/i);
assert.doesNotMatch(safetySql, /delete\s+from\s+public\.(exam_attempts|practice_assignment_attempts|practice_sessions|session_answers|student_learning_activity_days|student_ai_help_interactions|student_motivation_messages|student_practice_answer_events)/i,
  'D2 assignment cleanup must never delete student evidence.');

// D2 must remain outside content, grading, reporting and access-policy mutation boundaries.
for (const table of [
  'questions', 'exam_paper_settings', 'report_archives', 'teacher_profiles',
  'app_access_settings', 'ai_help_settings'
]) {
  assert.doesNotMatch(safetySql, new RegExp(`(?:delete\\s+from|update)\\s+public\\.${table}\\b`, 'i'),
    `D2 must not mutate preserved table ${table}.`);
}
assert.doesNotMatch(safetySql, /\btruncate\b/i);
assert.doesNotMatch(safetySql, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/);

console.log('V5.0D2 teacher-operations verification passed.');
console.log('- operational browser code uses teacher-only RPCs only');
console.log('- deactivation expires access tickets without cascading learning evidence');
console.log('- class transfer is limited to clean/new same-year roster records');
console.log('- assignment activation respects class status and deletion preserves attempt history');
console.log('- grading, reports, questions, access policy and AI settings remain outside D2 mutation scope');
