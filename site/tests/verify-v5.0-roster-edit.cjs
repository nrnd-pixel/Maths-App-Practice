const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const release = fs.readFileSync(path.join(siteRoot, 'v40-release.js'), 'utf8');
const owner = fs.readFileSync(path.join(siteRoot, 'teacher-launch-operations.js'), 'utf8');
const sql = fs.readFileSync(path.join(repoRoot, 'supabase', 'v50_roster_student_identity_edit.sql'), 'utf8');

const start='/* V5.0 launch roster maintenance';
const begin=owner.indexOf(start);
assert.ok(begin>=0,'Roster Edit section must exist in consolidated operations owner.');
const ui=owner.slice(begin).trimEnd();
new vm.Script(owner, { filename:'teacher-launch-operations.js' });

assert.match(release, /loadScriptOnce\('teacher-launch-operations\.js', 'data-teacher-launch-operations'\)/);
assert.ok(owner.indexOf('/* V5.0D2 — Teacher Operational Tools.') < begin,
  'Roster Edit extension must remain after Teacher Operations inside the consolidated owner.');

assert.match(ui, /Edit student/);
assert.match(ui, /Student ID/);
assert.match(ui, /Student name/);
assert.match(ui, /Save Changes/);
assert.match(ui, /cloud\.rpc\('edit_roster_student_identity_v50'/);
assert.match(ui, /Change Student ID from/,
  'Changing the Student ID must require an explicit confirmation.');
assert.match(ui, /Student ID changes are blocked once learning history exists/);
assert.doesNotMatch(ui, /\.from\(/,
  'Roster identity editing must use the teacher RPC rather than direct table writes.');
assert.doesNotMatch(ui, /localStorage\.setItem|sessionStorage\.setItem/);

assert.match(sql, /create or replace function public\.edit_roster_student_identity_v50\(\s*p_roster_student_id uuid,\s*p_student_id text,\s*p_student_name text/i);
assert.match(sql, /if not public\.is_teacher\(\) then/i);
assert.match(sql, /security definer/i);
assert.match(sql, /set search_path to ''/i);
assert.match(sql, /length\(v_new_id\) < 1 or length\(v_new_id\) > 40/i);
assert.match(sql, /length\(v_new_name\) < 1 or length\(v_new_name\) > 80/i);
assert.match(sql, /for update;/i,
  'Roster row must be locked before identity mutation.');
assert.match(sql, /other\.id <> v_student\.id[\s\S]*other\.active = true[\s\S]*osc\.active = true[\s\S]*lower\(trim\(other\.student_id\)\) = lower\(v_new_id\)/i,
  'Active Student IDs must remain globally unique using the same normalized rule as Launch Readiness.');
assert.match(sql, /if v_normalized_id_changed then[\s\S]*v_history_total[\s\S]*Student ID cannot be changed after learning history exists/i,
  'Student ID edits must be blocked after learning history exists.');
assert.match(sql, /update public\.class_students\s+set student_id = v_new_id,\s*student_name = v_new_name,\s*updated_at = now\(\)\s*where id = v_student\.id/i);
assert.doesNotMatch(sql, /set[\s\S]{0,180}\bclass_id\s*=/i,
  'Identity editing must not move the student to another class.');
assert.doesNotMatch(sql, /\bpin_hash\s*=/i,
  'Identity editing must not change or clear the PIN hash.');
assert.match(sql, /update public\.student_access_tickets[\s\S]*expires_at = least\(expires_at, now\(\)\)/i,
  'Student ID changes must invalidate current access tickets without deleting evidence.');
assert.doesNotMatch(sql, /delete\s+from/i);
assert.match(sql, /'student_identity_updated'/i);
assert.match(sql, /'pin_preserved', true/i);
assert.match(sql, /'roster_uuid_preserved', true/i);
assert.match(sql, /revoke all on function public\.edit_roster_student_identity_v50\(uuid,text,text\) from public/i);
assert.match(sql, /revoke all on function public\.edit_roster_student_identity_v50\(uuid,text,text\) from anon/i);
assert.match(sql, /grant execute on function public\.edit_roster_student_identity_v50\(uuid,text,text\) to authenticated/i);

console.log('V5.0 roster edit verification passed.');
console.log('- consolidated Roster Edit remains downstream of D2');
console.log('- existing roster UUID/class/PIN are preserved');
console.log('- duplicate active IDs are blocked');
console.log('- Student ID edits stop once history exists; name corrections remain available');
console.log('- current access tickets are expired instead of deleted when the normalized ID changes');
