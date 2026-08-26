const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const sql = fs.readFileSync(path.join(repoRoot, 'supabase', 'v50_launch_reset_safe_delete_hotfix.sql'), 'utf8');

assert.match(sql, /create or replace function public\.reset_student_launch_activity_v50d1\(/i);
assert.match(sql, /coalesce\(p_confirm_text,''\) <> 'RESET STUDENT ACTIVITY'/i,
  'Server reset must keep the exact destructive confirmation phrase.');
assert.match(sql, /if not public\.is_teacher\(\) then/i,
  'Reset must remain teacher-only.');
assert.match(sql, /security definer/i);
assert.match(sql, /set search_path to ''/i);

const unsafeDeletes = [...sql.matchAll(/delete\s+from\s+public\.([a-z_]+)\s*;/gi)];
assert.equal(unsafeDeletes.length, 0,
  `Whole-table reset deletes must carry an explicit WHERE clause. Unsafe targets: ${unsafeDeletes.map(m => m[1]).join(', ')}`);

const expectedDeleteTables = [
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
];
for (const table of expectedDeleteTables) {
  assert.match(sql, new RegExp(`delete\\s+from\\s+public\\.${table}\\s+where\\s+true\\s*;`, 'i'),
    `Expected explicit safe-delete form for ${table}.`);
}

for (const preserved of [
  'school_classes', 'class_students', 'questions', 'exam_paper_settings',
  'report_archives', 'teacher_profiles', 'app_access_settings', 'ai_help_settings'
]) {
  assert.doesNotMatch(sql, new RegExp(`delete\\s+from\\s+public\\.${preserved}\\b`, 'i'),
    `Launch reset must not delete preserved table ${preserved}.`);
}

assert.match(sql, /if coalesce\(p_clear_assignments,false\) then[\s\S]*delete from public\.exam_assignments where true;[\s\S]*delete from public\.practice_assignments where true;[\s\S]*end if;/i,
  'Assignment deletion must remain behind the explicit clear-assignments option.');
assert.match(sql, /if coalesce\(p_clear_pins,false\) then[\s\S]*set pin_hash = null, pin_updated_at = null/i,
  'PIN clearing must remain behind the explicit clear-PINs option.');
assert.match(sql, /update public\.practice_sessions set exam_attempt_id = null where exam_attempt_id is not null/i);
assert.match(sql, /update public\.exam_attempts set practice_session_id = null where practice_session_id is not null/i);
assert.doesNotMatch(sql, /\btruncate\b/i);
assert.match(sql, /revoke all on function public\.reset_student_launch_activity_v50d1\(text,boolean,boolean\) from anon/i);
assert.match(sql, /grant execute on function public\.reset_student_launch_activity_v50d1\(text,boolean,boolean\) to authenticated/i);

console.log('V5.0 launch reset safe-delete hotfix verification passed.');
console.log('- every intentional whole-table reset delete uses an explicit WHERE true clause');
console.log('- teacher, confirmation, assignment, PIN and preserved-table safeguards remain intact');
