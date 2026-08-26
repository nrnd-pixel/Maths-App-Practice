const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const release = fs.readFileSync(path.join(siteRoot, 'v40-release.js'), 'utf8');
const audit = fs.readFileSync(path.join(siteRoot, 'v50-release-audit.js'), 'utf8');
const sql = fs.readFileSync(path.join(repoRoot, 'supabase', 'v50rc1_functional_audit.sql'), 'utf8');

new vm.Script(audit, { filename: 'v50-release-audit.js' });

assert.match(release, /v50-teacher-operations\.js\?v=50d2-1', 'data-v50-teacher-operations'/,
  'Existing D2 loader must remain stable.');
assert.match(release, /v50-release-audit\.js\?v=50rc1-1/);
assert.match(release, /data-v50-release-audit/);

assert.match(audit, /V5\.0 Release Candidate Audit/);
assert.match(audit, /RC1 — Functional regression audit/);
assert.match(audit, /RC2 — Security & launch configuration/);
assert.match(audit, /RC3 — UX & production polish/);
assert.match(audit, /cloud\.rpc\('get_teacher_release_audit_v50rc1'\)/);
assert.match(audit, /Exam settings still required/);
assert.match(audit, /Open Exam Settings/);
assert.match(audit, /Pending-review synchronization/);
assert.match(audit, /Exam result links/);
assert.match(audit, /Practice assignment links/);
assert.match(audit, /Mark bounds/);
assert.match(audit, /Exam deadline states/);
assert.match(audit, /Legacy Exam class identity/);
assert.doesNotMatch(audit, /\.from\(/,
  'Release Audit browser code must remain read-only through the teacher audit RPC.');
assert.doesNotMatch(audit, /localStorage\.setItem|sessionStorage\.setItem/);
assert.doesNotMatch(audit, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/);
assert.doesNotMatch(audit, /grade_practice_response|request_practice_hint|finalize_exam_attempt/i,
  'Release Audit must not introduce grading, hints or Exam finalization logic.');

// Derived review-count repair only: no answer/result/history deletion or score mutation.
assert.match(sql, /update public\.practice_sessions ps\s+set pending_review_count = actual\.pending_count/i);
assert.match(sql, /where ps\.id = actual\.session_id[\s\S]*pending_review_count/i);
assert.match(sql, /create or replace function public\.sync_session_pending_review_count\(\)/i);
assert.match(sql, /after insert or delete or update of review_status on public\.session_answers/i);
assert.doesNotMatch(sql, /\bdelete\s+from\b|\btruncate\b/i,
  'RC1 integrity repair must not delete student data.');
assert.doesNotMatch(sql, /set\s+(marks_awarded|marks_possible|correct|first_try_score|mastery_score|auto_marks_awarded)\s*=/i,
  'RC1 must not rewrite grading outcomes.');
assert.doesNotMatch(sql, /update\s+public\.(questions|exam_attempts|session_answers|class_students|practice_assignments|exam_assignments)\b/i,
  'RC1 must not rewrite questions, attempts, answers, roster or assignment definitions.');

assert.match(sql, /create or replace function public\.get_teacher_release_audit_v50rc1\(\)/i);
assert.match(sql, /security definer/i);
assert.match(sql, /set search_path to ''/i);
assert.match(sql, /if not public\.is_teacher\(\) then/i);
assert.match(sql, /revoke all on function public\.get_teacher_release_audit_v50rc1\(\) from anon/i);
assert.match(sql, /grant execute on function public\.get_teacher_release_audit_v50rc1\(\) to authenticated/i);

assert.match(sql, /v_configured_exam_papers = v_active_exam_papers/i,
  'Every active Exam paper must have explicit settings before RC1 passes.');
assert.match(sql, /v_available_exam_papers > 0/i,
  'At least one explicitly configured Exam paper must be available.');
assert.match(sql, /v_pending_review_mismatches = 0/i);
assert.match(sql, /v_exam_link_issues = 0/i);
assert.match(sql, /v_practice_assignment_link_issues = 0/i);
assert.match(sql, /v_answer_marks_out_of_bounds = 0/i);
assert.match(sql, /v_overdue_in_progress_exams = 0/i);
assert.match(sql, /v_duplicate_active_student_ids = 0/i);
assert.match(sql, /legacy_registered_exam_attempts_missing_class_id/i);
assert.match(sql, /Historical warning only/i,
  'Legacy class-ID drift must be reported without rewriting historical Exam rows.');

// RC1 must not stamp V5.0 yet; final branding belongs to RC3 after all passes.
assert.match(release, /Math Practice V4\.9/);
assert.match(release, /Version 4\.9 • Student Progress Experience/);

console.log('V5.0RC1 release-audit verification passed.');
console.log('- RC1 audit dashboard is read-only and teacher-only');
console.log('- every active Exam paper requires explicit settings before RC1 passes');
console.log('- pending-review cache repair is derived-only and non-destructive');
console.log('- Exam/Practice links, mark bounds, deadlines and Student IDs are audited');
console.log('- final V5.0 branding remains deferred until RC3');
