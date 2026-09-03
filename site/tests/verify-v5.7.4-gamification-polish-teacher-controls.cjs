const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const mod = require(path.join(ROOT, 'v574-gamification-polish-teacher-controls.js'));
const source = fs.readFileSync(path.join(ROOT, 'v574-gamification-polish-teacher-controls.js'), 'utf8');
const config = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');
const sql = fs.readFileSync(path.resolve(ROOT, '..', 'supabase', 'v574_gamification_polish_teacher_controls.sql'), 'utf8');

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

assert(source.includes('5,10,15,20') || source.includes('[5,10,15,20]'), 'UI should restrict target presets to 5/10/15/20');
assert(source.includes('no student rankings') || source.includes('no student rankings'.replace('student ','')) || /no student rankings/i.test(source), 'Student copy should preserve non-ranking design');
assert(!/leaderboard\s*=|rank_students|xp_rank/i.test(source), 'V5.7.4 must not introduce ranking logic');
assert(!/correct_answer|correctAnswer|service_role/i.test(source), 'Browser source must not expose protected grading content or service-role material');
assert(!/validateStudentAccess\(['"]exam['"]\)/.test(source), 'V5.7.4 must not request Exam access');

assert(sql.includes('create table if not exists public.class_gamification_settings_v574'));
assert(sql.includes('check (questions_per_active_student in (5,10,15,20))'));
assert(sql.includes("if not public.is_teacher() then raise exception 'Teacher access required'; end if;"));
assert(sql.includes('revoke all on table public.class_gamification_settings_v574 from public, anon, authenticated'));
assert(sql.includes('grant execute on function public.get_student_class_challenge_v574(text) to anon,authenticated'));
assert(sql.includes('grant execute on function public.update_teacher_class_challenge_v574(uuid,boolean,integer) to authenticated,service_role'));
assert(!/correct_answer|answer_key|explanation/i.test(sql), 'V5.7.4 SQL should not return answer-key content');

const v573 = config.indexOf("'./v573-class-challenges-teacher-gamification.js'");
const v574 = config.indexOf("'./v574-gamification-polish-teacher-controls.js'");
assert(v573 >= 0 && v574 > v573, 'V5.7.4 must load after V5.7.3');
assert(config.includes('XP rules are unchanged'));
assert(config.includes('Student reads remain aggregate'));

console.log('V5.7.4 gamification polish + teacher controls regression passed.');
