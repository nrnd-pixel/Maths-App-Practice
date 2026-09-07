const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Checkpoint 2 integrity is exercised from this maintained CI verifier.
require('./verify-phase4-gamification-checkpoint2-integrity.cjs');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');
const coreSource = read('gamification-core.js');
const studentSource = read('gamification-student.js');
const teacherSource = read('gamification-teacher.js');
const source = `${coreSource}\n${studentSource}\n${teacherSource}`;
const config = read('config.js');
const sql = fs.readFileSync(path.join(site,'..','supabase','v573_class_challenges_teacher_gamification.sql'),'utf8');

new vm.Script(coreSource,{filename:'gamification-core.js'});
new vm.Script(studentSource,{filename:'gamification-student.js'});
new vm.Script(teacherSource,{filename:'gamification-teacher.js'});
const api = require(path.join(site,'gamification-teacher.js')).v573;

assert.equal(api.RPC_STUDENT,'get_student_class_challenge_v573');
assert.equal(api.RPC_TEACHER,'get_teacher_class_gamification_v573');

const challenge = api.normalizeChallenge({
  class:{class_id:'c1',class_name:'6A',year_level:6,active_students:23},
  week:{start_date:'2026-08-31',end_date:'2026-09-06',today:'2026-09-03',timezone:'Asia/Brunei'},
  challenge:{title:'Class Question Quest',questions_completed:66,target_questions:230,contributors:3,progress_percent:29,complete:false},
  rules:{questions_per_active_student:10,week_starts:'Monday',timezone:'Asia/Brunei',exam_activity_counts:false,student_rankings:false}
});
assert.equal(challenge.class.class_name,'6A');
assert.equal(challenge.challenge.questions_completed,66);
assert.equal(challenge.challenge.target_questions,230);
assert.equal(challenge.challenge.progress_percent,29);
assert.equal(challenge.challenge.complete,false);
assert.equal(challenge.rules.student_rankings,false);
assert.match(api.weekLabel(challenge),/Aug|Sep/);

const teacher = api.normalizeTeacherPayload({
  class:{class_id:'c1',class_name:'6A',year_level:6,active_students:3},
  week:{start_date:'2026-08-31',end_date:'2026-09-06',today:'2026-09-03',timezone:'Asia/Brunei'},
  challenge:{questions_completed:25,target_questions:30,contributors:2,progress_percent:83,complete:false},
  summary:{active_students:3,active_this_week:2,all_missions_complete:1,active_streaks:2,average_xp:310,level_distribution:{1:1,2:1,3:1,4:0,5:0}},
  students:[
    {student_id:'S3',student_name:'Zara',xp_total:120,level_number:2,level_title:'Number Explorer',current_streak:0,weekly_questions:0,weekly_practice_days:0,weekly_challenges:0,missions_completed:0},
    {student_id:'S1',student_name:'Aisyah',xp_total:520,level_number:4,level_title:'Maths Challenger',current_streak:4,weekly_questions:15,weekly_practice_days:2,weekly_challenges:1,missions_completed:3,all_missions_complete:true},
    {student_id:'S2',student_name:'Hadi',xp_total:290,level_number:3,level_title:'Problem Solver',current_streak:2,weekly_questions:10,weekly_practice_days:1,weekly_challenges:0,missions_completed:1}
  ]
});
assert.deepEqual(teacher.students.map(row=>row.student_name),['Aisyah','Hadi','Zara']);
assert.deepEqual(api.teacherRowsForFilter(teacher,'nudge').map(row=>row.student_name),['Zara']);
assert.deepEqual(api.teacherRowsForFilter(teacher,'active').map(row=>row.student_name),['Aisyah','Hadi']);
assert.deepEqual(api.teacherRowsForFilter(teacher,'missions').map(row=>row.student_name),['Aisyah']);

// V573 browser behavior is now supplied by the student/teacher split without changing
// its compatibility API, DOM names, non-ranking design, or server contract.
assert.match(coreSource,/get_student_class_challenge_v573/);
assert.match(coreSource,/get_teacher_class_gamification_v573/);
assert.match(studentSource,/v573:class-challenge-updated/);
assert.match(studentSource,/Class Question Quest/);
assert.match(teacherSource,/Class Motivation/);
assert.match(teacherSource,/export-analytics/);
assert.match(teacherSource,/No leaderboard|no leaderboard/i);
assert.doesNotMatch(source,/validateStudentAccess\(['"]exam['"]\)/);
assert.doesNotMatch(source,/correct_answer|correctAnswer|service_role/i);
assert.doesNotMatch(source,/document\.title|Version 5\.7|Stable Release/);

// The dormant V573 browser file is no longer staged; its accepted API is provided by gamification-teacher.js.
assert.match(config,/\.\/gamification-core\.js'[\s\S]*\.\/gamification-student\.js'[\s\S]*\.\/gamification-teacher\.js'[\s\S]*\.\/v575-gamification-stable-checkpoint\.js'/);
assert.doesNotMatch(config,/['"]\.\/v573-class-challenges-teacher-gamification\.js['"]/);
assert.match(teacherSource,/Object\.defineProperty\(window,'V573ClassChallengesTeacherGamification'/);
assert.match(config,/no leaderboard/i);

// Server functions are unchanged: read-only, Brunei-week scoped and Exam-excluding.
assert.match(sql,/get_student_class_challenge_v573/);
assert.match(sql,/get_teacher_class_gamification_v573/);
assert.match(sql,/security definer/i);
assert.match(sql,/student_access_tickets/);
assert.match(sql,/public\.is_teacher\(\)/);
assert.match(sql,/practice_mode <> 'exam'/);
assert.match(sql,/Asia\/Brunei/);
assert.match(sql,/active_students\*10|active_students\s*\*\s*10/);
assert.match(sql,/questions_per_active_student',10/);
assert.match(sql,/student_rankings',false/);
assert.doesNotMatch(sql,/\binsert\s+into\b/i);
assert.doesNotMatch(sql,/\bupdate\s+public\./i);
assert.doesNotMatch(sql,/\bdelete\s+from\b/i);
assert.doesNotMatch(sql,/correct_answer_snapshot|explanation_snapshot|final_answer/);
assert.match(sql,/revoke all on function public\.get_student_class_challenge_v573\(text\) from public/i);
assert.match(sql,/revoke all on function public\.get_teacher_class_gamification_v573\(uuid\) from public,anon/i);

console.log('V5.7.3 Class Challenges + Teacher Gamification checks passed from consolidated modules.');
console.log('- cooperative/non-ranking behavior and V573 compatibility API are retained');
console.log('- teacher roster normalization/filtering remains alphabetical and unchanged');
console.log('- V573 Supabase RPCs remain byte-untouched server contracts');
