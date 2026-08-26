const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const release = fs.readFileSync(path.join(siteRoot, 'v40-release.js'), 'utf8');
const launch = fs.readFileSync(path.join(siteRoot, 'v50-student-launch-readiness.js'), 'utf8');
const coreSql = fs.readFileSync(path.join(repoRoot, 'supabase', 'v50d1_student_launch_readiness.sql'), 'utf8');
const alignmentSql = fs.readFileSync(path.join(repoRoot, 'supabase', 'v50d1_student_launch_readiness_alignment.sql'), 'utf8');
const tuningSql = fs.readFileSync(path.join(repoRoot, 'supabase', 'v50d1_student_launch_readiness_rls_tuning.sql'), 'utf8');

new vm.Script(launch, { filename: 'v50-student-launch-readiness.js' });

assert.match(release, /v50-report-archive\.js\?v=50c3b-1', 'data-v50-report-archive'/,
  'Existing C3B archive loader must remain stable.');
assert.match(release, /v50-student-launch-readiness\.js\?v=50d1-1/);
assert.match(release, /data-v50-student-launch-readiness/);

assert.match(launch, /Student Launch Readiness/);
assert.match(launch, /Preparation needed before student launch/);
assert.match(launch, /Ready for controlled student launch/);
assert.match(launch, /const CONFIRM_PHRASE = 'RESET STUDENT ACTIVITY'/);
assert.match(launch, /cloud\.rpc\('get_teacher_launch_readiness_v50d1'\)/);
assert.match(launch, /cloud\.rpc\('generate_missing_student_pins_v50d1'/);
assert.match(launch, /cloud\.rpc\('reset_student_launch_activity_v50d1'/);
assert.match(launch, /if \(!confirm\(`\$\{summary\}/,
  'Destructive reset must require a second browser confirmation after the typed phrase.');
assert.match(launch, /p_confirm_text:CONFIRM_PHRASE/);
assert.match(launch, /p_clear_assignments:clearAssignments/);
assert.match(launch, /p_clear_pins:clearPins/);
assert.match(launch, /Plain PINs are shown once/);
assert.match(launch, /held only in this page's memory/);
assert.match(launch, /Existing PINs will not be changed/);
assert.match(launch, /Report Archive/);
assert.match(launch, /classes, roster names\/Student IDs, existing PINs, question bank, teacher account, Student Access setting, Exam paper settings and Report Archive/i);
assert.match(launch, /num\(data\.active_exam_papers\)>0/);
assert.match(launch, /num\(data\.available_exam_settings\)>0/);
assert.match(launch, /num\(data\.possible_test_students_count\)===0/);
assert.match(launch, /num\(data\.history_total\)===0/);
assert.doesNotMatch(launch, /\.from\(/,
  'D1 browser code must use teacher-only RPCs rather than direct table mutation.');
assert.doesNotMatch(launch, /localStorage\.setItem|sessionStorage\.setItem/,
  'Generated plain PINs must not be copied into browser storage.');
assert.doesNotMatch(launch, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/);

assert.match(coreSql, /create table if not exists public\.student_launch_reset_log/i);
assert.match(coreSql, /alter table public\.student_launch_reset_log enable row level security/i);
assert.match(coreSql, /executed_by = auth\.uid\(\)/i,
  'Initial reset-log policy must isolate rows to the teacher who executed the reset.');
assert.match(coreSql, /public\.is_teacher\(\)/i);
assert.match(coreSql, /revoke all on table public\.student_launch_reset_log from anon/i);
assert.match(coreSql, /revoke all on table public\.student_launch_reset_log from authenticated/i);
assert.match(coreSql, /grant select on table public\.student_launch_reset_log to authenticated/i);
assert.doesNotMatch(coreSql, /grant\s+(insert|update|delete)[^;]*student_launch_reset_log/i,
  'Teachers must not directly mutate reset audit rows.');

assert.match(tuningSql, /executed_by = \(select auth\.uid\(\)\)/i,
  'Final reset-log RLS must evaluate auth.uid() once per statement.');
assert.doesNotMatch(tuningSql, /executed_by = auth\.uid\(\)/i);

assert.match(coreSql, /coalesce\(p_confirm_text,''\) <> 'RESET STUDENT ACTIVITY'/,
  'Server reset must independently require the exact destructive confirmation phrase.');
assert.match(coreSql, /if coalesce\(p_clear_assignments,false\) then\s*[\s\S]*?delete from public\.exam_assignments;\s*delete from public\.practice_assignments;\s*end if;/i,
  'Assignment definitions may be deleted only behind the explicit clear-assignments option.');
assert.match(coreSql, /if coalesce\(p_clear_pins,false\) then\s*[\s\S]*?update public\.class_students/i,
  'PIN clearing may occur only behind the explicit clear-PINs option.');
assert.match(coreSql, /set pin_hash = null, pin_updated_at = null/i);
assert.match(coreSql, /update public\.practice_sessions set exam_attempt_id = null/i);
assert.match(coreSql, /update public\.exam_attempts set practice_session_id = null/i,
  'Exam/Practice circular references must be broken safely inside the reset transaction.');
assert.doesNotMatch(coreSql, /\btruncate\b/i,
  'D1 must never use TRUNCATE for student cleanup.');

const preservedTables = [
  'school_classes',
  'class_students',
  'questions',
  'exam_paper_settings',
  'report_archives',
  'teacher_profiles',
  'app_access_settings',
  'ai_help_settings'
];
for (const table of preservedTables){
  const destructive = new RegExp(`delete\\s+from\\s+public\\.${table}\\b`, 'i');
  assert.doesNotMatch(coreSql, destructive, `Reset must never delete preserved table ${table}.`);
}

const resetDeleteTables = [...coreSql.matchAll(/delete\s+from\s+public\.([a-z_]+)/gi)].map(match=>match[1]);
const allowedDeleteTables = new Set([
  'student_ai_help_interactions',
  'student_practice_answer_events',
  'student_learning_activity_days',
  'student_motivation_messages',
  'practice_assignment_attempts',
  'student_access_failures',
  'exam_attempts',
  'practice_sessions',
  'student_access_tickets',
  'exam_assignments',
  'practice_assignments'
]);
for (const table of resetDeleteTables){
  assert.ok(allowedDeleteTables.has(table), `Unexpected destructive D1 target: ${table}`);
}
assert.match(coreSql, /'school_classes', \(select count\(\*\) from public\.school_classes\)/i);
assert.match(coreSql, /'class_students', \(select count\(\*\) from public\.class_students\)/i);
assert.match(coreSql, /'questions', \(select count\(\*\) from public\.questions\)/i);
assert.match(coreSql, /'exam_paper_settings', \(select count\(\*\) from public\.exam_paper_settings\)/i);
assert.match(coreSql, /'report_archives', \(select count\(\*\) from public\.report_archives\)/i);

for (const signature of [
  'get_teacher_launch_readiness_v50d1\\(\\)',
  'reset_student_launch_activity_v50d1\\(text,boolean,boolean\\)',
  'generate_missing_student_pins_v50d1\\(smallint\\)'
]){
  assert.match(coreSql, new RegExp(`revoke all on function public\\.${signature} from anon`, 'i'));
  assert.match(coreSql, new RegExp(`grant execute on function public\\.${signature} to authenticated`, 'i'));
}

assert.match(alignmentSql, /v_active_exam_papers > 0/i);
assert.match(alignmentSql, /v_available_exam_settings > 0/i);
assert.match(alignmentSql, /v_possible_test_count = 0/i);
assert.match(alignmentSql, /v_history_total = 0/i);
assert.match(alignmentSql, /v_access_mode = 'student_pin'/i,
  'Server readiness must use the same launch blockers as the UI.');
assert.match(alignmentSql, /v_floor := power\(10,p_digits - 1\)::bigint/i);
assert.match(alignmentSql, /v_span := 9 \* v_floor/i);
assert.match(alignmentSql, /v_pin := \(v_floor \+ \(v_random % v_span\)\)::text/i,
  'Generated PINs must always have the requested visible digit count and never rely on leading zeroes.');
assert.match(alignmentSql, /extensions\.gen_random_bytes\(4\)/i);
assert.match(alignmentSql, /extensions\.crypt\(v_pin, extensions\.gen_salt\('bf'\)\)/i,
  'PINs must be stored using the established bcrypt hashing path.');
assert.match(alignmentSql, /where cs\.active and sc\.active and cs\.pin_hash is null/i,
  'Bulk PIN generation must target only active students who are missing a PIN.');
assert.match(alignmentSql, /where id = v_student\.id and pin_hash is null/i,
  'Concurrent PIN generation must not overwrite an existing PIN.');
assert.match(alignmentSql, /Plain-text PINs are returned only in this response; the database stores hashes only/i);
assert.doesNotMatch(alignmentSql, /create\s+table[\s\S]*\bpin\s+text\b/i,
  'No database table may store plain student PINs.');
assert.doesNotMatch(alignmentSql, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/);

console.log('V5.0D1 launch-readiness verification passed.');
console.log('- launch readiness uses roster, PIN, access, content, clean-history and test/demo blockers');
console.log('- destructive reset requires typed + browser confirmation and is transactional');
console.log('- permanent roster/content/config/report tables are outside the delete set');
console.log('- optional assignment/PIN cleanup stays behind explicit switches');
console.log('- bulk missing-PIN generation stores bcrypt hashes and returns plain PINs only once');
console.log('- reset-log RLS uses statement-scoped auth.uid() evaluation');
