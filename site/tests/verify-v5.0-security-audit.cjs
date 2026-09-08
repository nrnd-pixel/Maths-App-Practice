const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const read = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

const release = read('site/v40-release.js');
const hardening = read('site/v50-security-hardening.js');
const audit = read('site/v50-release-audit.js');
const sql = read('supabase/v50rc2_security_launch_audit.sql');
const alignmentSql = read('supabase/v50rc2_security_privilege_alignment.sql');
const triggerSql = read('supabase/v50rc2_trigger_search_path_alignment.sql');

new vm.Script(hardening,{filename:'v50-security-hardening.js'});
new vm.Script(audit,{filename:'v50-release-audit.js'});

// Loader stability + RC2 modules.
assert.match(release,/assignment-intervention-history\.js/,'Consolidated V4.7 history owner must remain staged.');
assert.match(release,/v50-teacher-operations\.js\?v=50d2-1/,'D2 loader must remain stable.');
assert.match(release,/v50-security-hardening\.js\?v=50rc2-1', 'data-v50-security-hardening'/);
assert.match(release,/v50-release-audit\.js\?v=50rc2-1', 'data-v50-release-audit'/);

// Browser hardening: remove the pre-auth Student-ID-only assignment lookup from active UI.
assert.match(hardening,/window\.refreshStudentAssignmentAccess\s*=\s*secureExamAccessNote/);
assert.match(hardening,/Student access and class participation will be verified securely when you start the paper/);
assert.doesNotMatch(hardening,/cloud\.rpc\(|cloud\.from\(|fetch\(/,
  'RC2 browser hardening must not make a replacement pre-auth data request.');
assert.doesNotMatch(hardening,/localStorage|sessionStorage/,
  'RC2 hardening must not persist security state in browser storage.');

// Release Audit is read-only and reports RC1 + RC2 separately.
assert.match(audit,/get_teacher_release_audit_v50rc1/);
assert.match(audit,/get_teacher_release_audit_v50rc2/);
assert.match(audit,/RC2 — Security & launch configuration/);
assert.match(audit,/Manual final-release checks/);
assert.match(audit,/These can be configured later/);
assert.doesNotMatch(audit,/reset_student_launch_activity|generate_missing_student_pins|set_student_pin|manage_teacher_assignment|transfer_roster_student/,
  'Release Audit must not expose mutation RPCs.');
assert.doesNotMatch(audit,/\.from\(/,
  'Release Audit must remain RPC-only and read-only.');

// Explicit Exam configuration boundary.
assert.match(sql,/create or replace function public\.get_available_exam_papers/i);
assert.match(sql,/join public\.exam_paper_settings s[\s\S]*?s\.is_available = true/i,
  'Student paper discovery must require an explicit available settings row.');
assert.match(sql,/create or replace function public\.get_student_questions/i);
assert.match(sql,/if p_exam_year is not null then[\s\S]*?public\.exam_paper_settings[\s\S]*?s\.is_available = true[\s\S]*?raise exception 'This exam paper is not currently available'/i,
  'Exam question retrieval must enforce configured availability server-side.');
assert.doesNotMatch(sql,/q\.answer|q\.hint|q\.explanation/i,
  'The redacted student-question RPC must not expose answers, hints or explanations.');
assert.match(sql,/create or replace function public\.start_or_resume_exam_attempt_v3/i);
assert.match(sql,/if not found then\s*raise exception 'Exam paper settings must be configured before this paper can be started'/i);
assert.match(sql,/if v_available is not true then\s*raise exception 'This exam paper is not currently available'/i);
assert.doesNotMatch(sql,/coalesce\(v_available,\s*true\)/i,
  'Missing Exam settings must never fall back to available.');

// Pre-login class list must not advertise inactive classes.
assert.match(sql,/create or replace function public\.get_student_class_options/i);
assert.match(sql,/where sc\.active = true/i);
assert.match(sql,/set search_path to ''/i);

// Teacher-only controls must not remain public to anon.
for (const signature of [
  'save_student_access_mode\\(text\\)',
  'set_student_pin\\(uuid,text\\)',
  'is_teacher\\(\\)'
]) {
  assert.match(sql,new RegExp(`revoke all on function public\\.${signature} from anon`,'i'));
}

// Internal helpers must also lose PostgreSQL's inherited PUBLIC EXECUTE grant.
for (const signature of [
  'get_student_exam_access\\(text,smallint,smallint,text\\)',
  'apply_exam_roster_identity\\(\\)',
  'exam_attempt_json\\(public\\.exam_attempts,boolean\\)',
  'sync_session_pending_review_count\\(\\)',
  'make_result_code\\(\\)',
  'set_updated_at\\(\\)',
  'set_exam_paper_settings_updated_at\\(\\)'
]) {
  assert.match(alignmentSql,new RegExp(`revoke all on function public\\.${signature} from public, anon, authenticated`,'i'),
    `Internal helper must lose PUBLIC/anon/authenticated EXECUTE: ${signature}`);
}

// Trigger helpers use fixed empty search paths and remain internal after replacement.
for (const name of ['set_updated_at','set_exam_paper_settings_updated_at']) {
  assert.match(triggerSql,new RegExp(`create or replace function public\\.${name}\\(\\)[\\s\\S]*?set search_path to ''`,'i'),
    `${name} must use a fixed empty search_path.`);
  assert.match(triggerSql,new RegExp(`revoke all on function public\\.${name}\\(\\) from public, anon, authenticated`,'i'),
    `${name} must remain internal-only after replacement.`);
}

// Direct anonymous table surface is closed; Exam settings retain read-only presentation access.
for (const table of [
  'school_classes','class_students','questions','app_access_settings','practice_sessions','session_answers',
  'exam_attempts','student_access_tickets','student_access_failures','practice_assignments',
  'practice_assignment_attempts','practice_assignment_recipients','exam_assignments','report_archives',
  'student_launch_reset_log','teacher_operations_log'
]) {
  assert.match(sql,new RegExp(`revoke all on table public\\.${table} from anon`,'i'),
    `Sensitive table must be revoked from anon: ${table}`);
}
assert.match(sql,/revoke all on table public\.exam_paper_settings from anon/i);
assert.match(sql,/grant select on table public\.exam_paper_settings to anon/i,
  'Exam settings may remain anonymously readable for non-sensitive timer/release presentation only.');

// Intentional student RPCs remain callable pre-login.
for (const signature of [
  'get_student_access_policy\\(\\)',
  'get_student_class_options\\(\\)',
  'get_available_exam_papers\\(smallint\\)',
  'validate_student_access\\(text,text,text,text,smallint,text\\)',
  'get_student_questions\\(text,smallint,smallint,text\\)',
  'grade_practice_response_v3\\(text,uuid,jsonb\\)',
  'request_practice_hint_v3\\(text,uuid\\)',
  'submit_practice_session_v3\\(text,jsonb,jsonb\\)',
  'start_or_resume_exam_attempt_v3\\(text,text,text,text,text,smallint,text,smallint,text,integer,text,integer\\)',
  'save_exam_attempt\\(uuid,text,jsonb,jsonb,integer,integer,integer,integer\\)',
  'finalize_exam_attempt\\(uuid,text,text,jsonb,jsonb\\)',
  'get_student_review\\(text\\)'
]) {
  assert.match(sql,new RegExp(`grant execute on function public\\.${signature} to anon`,'i'),
    `Required pre-login student RPC must remain available: ${signature}`);
}

// RC2 diagnostics are teacher-only and distinguish security pass from deferred launch cleanup.
assert.match(sql,/create or replace function public\.get_teacher_release_audit_v50rc2\(\)/i);
assert.match(sql,/if not public\.is_teacher\(\) then\s*raise exception 'Teacher access required'/i);
assert.match(sql,/revoke all on function public\.get_teacher_release_audit_v50rc2\(\) from anon/i);
assert.match(sql,/grant execute on function public\.get_teacher_release_audit_v50rc2\(\) to authenticated/i);
assert.match(sql,/'security_ready'/i);
assert.match(sql,/'pin_missing'/i);
assert.match(sql,/'history_total'/i);
assert.match(sql,/'possible_test_students_count'/i);
assert.match(sql,/'missing_exam_settings_count'/i);
assert.match(sql,/Enable Supabase leaked-password protection before public launch/i);
assert.match(sql,/Protect the GitHub main branch\/ruleset and require V5 Regression Safety/i);

// No cleanup/destructive data migration belongs in RC2.
for (const source of [sql,alignmentSql,triggerSql]) {
  assert.doesNotMatch(source,/\btruncate\b/i);
  assert.doesNotMatch(source,/delete\s+from\s+public\.(practice_sessions|session_answers|exam_attempts|class_students|school_classes|questions|exam_assignments|practice_assignments)/i);
  assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/);
}

console.log('V5.0RC2 security & launch-configuration verification passed.');
console.log('- unconfigured Exam papers are hidden and blocked server-side');
console.log('- legacy Student-ID-only Exam participation lookup is removed from active browser use');
console.log('- sensitive direct anon table access and PUBLIC/anon helper RPC exposure are closed');
console.log('- trigger helpers use fixed search paths and remain internal-only');
console.log('- required PIN/token/resume-token student RPCs remain available pre-login');
console.log('- RC2 audit remains read-only and launch cleanup stays deferred');
