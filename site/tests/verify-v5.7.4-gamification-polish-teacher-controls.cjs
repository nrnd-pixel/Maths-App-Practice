const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const coreSource = fs.readFileSync(path.join(ROOT, 'gamification-core.js'), 'utf8');
const studentSource = fs.readFileSync(path.join(ROOT, 'gamification-student.js'), 'utf8');
const teacherSource = fs.readFileSync(path.join(ROOT, 'gamification-teacher.js'), 'utf8');
const source = `${coreSource}\n${studentSource}\n${teacherSource}`;
const config = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');
const sql = fs.readFileSync(path.resolve(ROOT, '..', 'supabase', 'v574_gamification_polish_teacher_controls.sql'), 'utf8');

new vm.Script(coreSource,{filename:'gamification-core.js'});
new vm.Script(studentSource,{filename:'gamification-student.js'});
new vm.Script(teacherSource,{filename:'gamification-teacher.js'});
const mod = require(path.join(ROOT, 'gamification-teacher.js')).v574;

assert.equal(mod.RPC_STUDENT, 'get_student_class_challenge_v574');
assert.equal(mod.RPC_TEACHER, 'get_teacher_class_gamification_v574');
assert.equal(mod.RPC_UPDATE, 'update_teacher_class_challenge_v574');

const model = mod.normalize({
  class: { class_id:'class-1', class_name:'6A', year_level:6, active_students:23 },
  week: { start_date:'2026-08-31', end_date:'2026-09-06' },
  challenge: { enabled:true, questions_completed:120, target_questions:230, contributors:8, progress_percent:52 },
  settings: { challenge_enabled:true, questions_per_active_student:10, allowed_questions_per_active_student:[5,10,15,20] }
});
assert.equal(model.challenge.target_questions, 230);
assert.equal(model.settings.questions_per_active_student, 10);
assert.equal(mod.phaseLabel(model), 'Halfway there');

const finalPush = mod.normalize({
  class:{active_students:20},
  challenge:{enabled:true,questions_completed:160,target_questions:200,progress_percent:80},
  settings:{challenge_enabled:true,questions_per_active_student:10}
});
assert.equal(mod.phaseLabel(finalPush), 'Final push');

const paused = mod.normalize({
  class:{active_students:20},
  challenge:{enabled:false,questions_completed:160,target_questions:200,progress_percent:80},
  settings:{challenge_enabled:false,questions_per_active_student:10}
});
assert.equal(paused.challenge.enabled, false);
assert.equal(mod.phaseLabel(paused), 'Paused');

// Browser behavior remains the accepted V5.7.4 design, now supplied by shared core + student/teacher modules.
assert(source.includes('5,10,15,20') || source.includes('[5,10,15,20]'), 'UI should restrict target presets to 5/10/15/20');
assert(studentSource.includes('no student rankings') || /no student rankings/i.test(studentSource), 'Student copy should preserve non-ranking design');
assert(!/leaderboard\s*=|rank_students|xp_rank/i.test(source), 'Checkpoint 2 must not introduce ranking logic');
assert(!/correct_answer|correctAnswer|service_role/i.test(source), 'Browser source must not expose protected grading content or service-role material');
assert(!/validateStudentAccess\(['"]exam['"]\)/.test(source), 'Gamification must not request Exam access');
// The polished V574 id is a shared DOM contract owned by gamification-core.js;
// gamification-student.js must use that shared id for both lookup and creation.
assert(coreSource.includes("classChallengeCard:'v574-class-challenge-card'"), 'Shared core must preserve the final polished V574 student card id.');
assert(/document\.getElementById\(IDS\.classChallengeCard\)/.test(studentSource), 'Student renderer must look up the shared V574 challenge-card id.');
assert(/card\.id=IDS\.classChallengeCard/.test(studentSource), 'Student renderer must assign the shared V574 challenge-card id when creating the card.');
// The V574 teacher settings trigger follows the same shared-ID ownership pattern.
assert(coreSource.includes("settingsTrigger:'v574-class-challenge-settings'"), 'Shared core must preserve the V574 teacher settings-trigger id.');
assert(/document\.getElementById\(IDS\.settingsTrigger\)/.test(teacherSource), 'Teacher module must look up the shared V574 settings-trigger id.');
assert(/button\.id=IDS\.settingsTrigger/.test(teacherSource), 'Teacher module must assign the shared V574 settings-trigger id when creating the button.');
assert(teacherSource.includes('Save Changes'), 'Teacher settings save workflow must remain available.');
assert(teacherSource.includes('Teacher-controlled challenge'), 'Managed teacher challenge presentation must remain available.');
assert(!/scheduleTeacherPatch|patchTeacherFromCurrentClass|patchTimer/.test(teacherSource), 'Old delayed cross-file teacher patch scheduler must be removed.');

// Server contract is untouched. The V574 student RPC deliberately starts with the
// complete V573 payload and merges only challenge/rules additions, so Home does not
// need a second direct V573 network read.
assert(sql.includes('create table if not exists public.class_gamification_settings_v574'));
assert(sql.includes('check (questions_per_active_student in (5,10,15,20))'));
assert(sql.includes('v_base := public.get_student_class_challenge_v573(p_access_token);'), 'V574 student RPC must continue to wrap the complete V573 payload.');
assert(/return\s+v_base\s*\|\|\s*jsonb_build_object/.test(sql), 'V574 must retain all top-level V573 payload fields before adding overrides.');
assert(sql.includes("'challenge', coalesce(v_base->'challenge','{}'::jsonb) || jsonb_build_object("), 'V574 must merge challenge fields onto V573 rather than replace the challenge object wholesale.');
assert(sql.includes("'rules', coalesce(v_base->'rules','{}'::jsonb) || jsonb_build_object("), 'V574 must merge rules fields onto V573 rather than replace the rules object wholesale.');
assert(sql.includes("if not public.is_teacher() then raise exception 'Teacher access required'; end if;"));
assert(sql.includes('revoke all on table public.class_gamification_settings_v574 from public, anon, authenticated'));
assert(sql.includes('grant execute on function public.get_student_class_challenge_v574(text) to anon,authenticated'));
assert(sql.includes('grant execute on function public.update_teacher_class_challenge_v574(uuid,boolean,integer) to authenticated,service_role'));
assert(!/correct_answer|answer_key|explanation/i.test(sql), 'V5.7.4 SQL should not return answer-key content');

// V573/V574 browser patch files are dormant; consolidated modules load before untouched V575.
const core = config.indexOf("'./gamification-core.js'");
const student = config.indexOf("'./gamification-student.js'");
const teacher = config.indexOf("'./gamification-teacher.js'");
const v575 = config.indexOf("'./v575-gamification-stable-checkpoint.js'");
assert(core >= 0 && student > core && teacher > student && v575 > teacher, 'Gamification modules must load core -> student -> teacher -> V575.');
assert(!config.includes("'./v573-class-challenges-teacher-gamification.js'"), 'V573 browser patch file must be dormant.');
assert(!config.includes("'./v574-gamification-polish-teacher-controls.js'"), 'V574 browser patch file must be dormant.');
assert(config.includes('XP rules are unchanged'));
assert(config.includes('Student reads remain aggregate'));

console.log('V5.7.4 gamification polish + teacher controls regression passed from consolidated modules.');
console.log('- polished student class challenge and teacher settings UI are retained');
console.log('- final student challenge card keeps the shared v574-class-challenge-card DOM contract');
console.log('- teacher settings trigger keeps the shared v574-class-challenge-settings DOM contract');
console.log('- V574 student RPC remains a complete V573 payload wrapper, avoiding a duplicate Home read');
console.log('- old cross-file teacher DOM patch scheduler is no longer active');
console.log('- V5.7.4 Supabase settings/RPC contract remains unchanged');