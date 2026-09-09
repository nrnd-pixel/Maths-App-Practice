const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const release = fs.readFileSync(path.join(siteRoot, 'v40-release.js'), 'utf8');
const auditOwner = fs.readFileSync(path.join(siteRoot, 'release-audit-ui.js'), 'utf8');
const checkpoint = fs.readFileSync(path.join(siteRoot, 'v54-stable-release-checkpoint.js'), 'utf8');
const versionSource = fs.readFileSync(path.join(siteRoot, 'version.js'), 'utf8');
const sql = fs.readFileSync(path.join(repoRoot, 'supabase', 'v50rc1_functional_audit.sql'), 'utf8');

function section(source,start,next){
  const begin=source.indexOf(start);
  assert.ok(begin>=0,`Missing consolidated section: ${start}`);
  const end=next ? source.indexOf(next,begin+start.length) : source.length;
  assert.ok(end>begin,`Missing consolidated section boundary after: ${start}`);
  return source.slice(begin,end).trimEnd();
}
const polish=section(auditOwner,'/* V5.4 — UX & Production Polish.','/* V5.0 Release Candidate Audit');
const audit=section(auditOwner,'/* V5.0 Release Candidate Audit','/* V5.0RC2 launch audit polish.');
const rc3Audit=section(auditOwner,'/* V5.4 — extends the existing read-only Release Audit');

new vm.Script(auditOwner, { filename: 'release-audit-ui.js' });
new vm.Script(checkpoint, { filename: 'v54-stable-release-checkpoint.js' });
new vm.Script(versionSource, { filename: 'version.js' });

assert.match(release, /loadScriptOnce\('teacher-launch-operations\.js', 'data-teacher-launch-operations'\)/,
  'Consolidated Teacher Operations owner must remain loaded.');
assert.match(release, /loadScriptOnce\('v50-security-hardening\.js\?v=50rc2-1', 'data-v50-security-hardening'\)/,
  'Security hardening must retain its established loader and ownership boundary.');
assert.match(release, /loadScriptOnce\('release-audit-ui\.js', 'data-release-audit-ui'\)/,
  'The consolidated Release Audit UI owner must remain loaded.');
assert.ok(release.indexOf("data-v50-security-hardening") < release.indexOf("data-release-audit-ui"),
  'Release Audit UI must remain after Security Hardening.');

// The underlying RC1/RC2 audit remains the same read-only diagnostic surface.
assert.match(audit, /V5\.0 Release Candidate Audit/);
assert.match(audit, /RC1 — Functional regression audit/);
assert.match(audit, /RC2 — Security & launch configuration/);
assert.match(audit, /RC3 — UX & production polish/);
assert.match(audit, /cloud\.rpc\('get_teacher_release_audit_v50rc1'\)/);
assert.match(audit, /Deferred Exam Settings/);
assert.match(audit, /Open Exam Settings/);
assert.match(audit, /Pending-review synchronization/);
assert.match(audit, /Exam result links/);
assert.match(audit, /Practice assignment links/);
assert.match(audit, /Mark bounds/);
assert.match(audit, /Exam deadline states/);
assert.match(audit, /Legacy Exam class identity/);
assert.doesNotMatch(audit, /\.from\(/,
  'Release Audit browser code must remain read-only through teacher audit RPCs.');
assert.doesNotMatch(audit, /localStorage\.setItem|sessionStorage\.setItem/);
assert.doesNotMatch(audit, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/);
assert.doesNotMatch(audit, /grade_practice_response|request_practice_hint|finalize_exam_attempt/i,
  'Release Audit must not introduce grading, hints or Exam finalization logic.');

// Historical V5.4 audit presentation remains, but current title/badge ownership is centralized.
assert.match(rc3Audit, /V50ProductionPolish\?\.getAudit/);
assert.match(rc3Audit, /V5\.4 Release Audit/);
assert.match(rc3Audit, /Stable-release identity/);
assert.match(rc3Audit, /RC3 — UX & production polish/);
assert.match(rc3Audit, /V5\.4 production-polish checks pass/);
assert.match(polish, /MathAppVersion\?\.applyIdentity/);
assert.match(checkpoint, /MathAppVersion\?\.CURRENT_RELEASE/);
assert.match(checkpoint, /V5\.4 Stable Release:/);
assert.doesNotMatch(polish, /const TITLE = 'Math Practice V5\.4'|const BADGE = 'Version 5\.4/);
assert.doesNotMatch(checkpoint, /const TITLE = 'Math Practice V5\.4'|const BADGE = 'Version 5\.4/);
assert.doesNotMatch(rc3Audit, /cloud\.rpc\(|cloud\.from\(|fetch\(/,
  'Stable audit presentation must not make data requests.');
assert.doesNotMatch(rc3Audit, /localStorage|sessionStorage/,
  'Stable audit presentation must not persist state.');
assert.doesNotMatch(rc3Audit, /reset_student_launch_activity|generate_missing_student_pins|set_student_pin|manage_teacher_assignment|transfer_roster_student/,
  'Stable audit presentation must not expose mutation workflows.');
assert.doesNotMatch(checkpoint, /cloud\.rpc\(|cloud\.from\(|fetch\(|localStorage|sessionStorage/,
  'V5.4 release checkpoint must remain presentation-only.');

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

// Historical V5.1 presenter remains recoverable, while its title/badge writes now use version.js.
assert.match(release, /function applyV51StableRelease\(\)/);
assert.match(release, /MathAppVersion\?\.applyIdentity/);
assert.match(release, /V5\.1 Stable Release:/);
assert.doesNotMatch(release, /Version 5\.1 • Release Candidate|V5\.1 Release Candidate:/);
assert.match(polish, /MathAppVersion\?\.CURRENT_RELEASE/);
assert.match(checkpoint, /MathAppVersion\?\.CURRENT_RELEASE/);

console.log('Release-audit verification passed for the V5.4 historical checkpoint.');
console.log('- consolidated audit owner preserves RC1/RC2 read-only logic and RC3 presentation');
console.log('- every active Exam paper still requires explicit settings before RC1 passes');
console.log('- pending-review cache repair remains derived-only and non-destructive');
console.log('- current app title/badge are delegated to the shared config-derived version source');
