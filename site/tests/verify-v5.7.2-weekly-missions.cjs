const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');

const coreSource = read('gamification-core.js');
const studentSource = read('gamification-student.js');
const source = `${coreSource}\n${studentSource}`;
const config = read('config.js');
const sql = fs.readFileSync(path.join(site,'..','supabase','v572_student_weekly_missions.sql'),'utf8');

new vm.Script(coreSource,{filename:'gamification-core.js'});
new vm.Script(studentSource,{filename:'gamification-student.js'});
const api = require(path.join(site,'gamification-student.js')).missions;

const model = api.normalizePayload({
  week:{start_date:'2026-08-31',end_date:'2026-09-06',today:'2026-09-03',timezone:'Asia/Brunei'},
  summary:{completed:1,total:3,all_complete:false},
  missions:[
    {id:'question_quest',title:'Question Quest',description:'Complete 10 Practice questions this week.',icon:'🎯',progress:7,raw_progress:7,target:10,unit:'questions',complete:false,action:'learn'},
    {id:'practice_days',title:'Keep It Going',description:'Complete meaningful Practice on 2 different days this week.',icon:'🔥',progress:2,raw_progress:2,target:2,unit:'days',complete:true,action:'learn'},
    {id:'challenge_complete',title:'Challenge Complete',description:'Finish a teacher assignment or a Past Paper Practice this week.',icon:'🏁',progress:0,raw_progress:0,target:1,unit:'challenge',complete:false,action:'challenge'}
  ],
  rules:{question_target:10,practice_day_target:2,meaningful_questions_per_day:5,challenge_target:1,week_starts:'Monday',timezone:'Asia/Brunei',exam_activity_counts:false}
});

assert.equal(model.summary.completed,1);
assert.equal(model.summary.total,3);
assert.equal(model.summary.all_complete,false);
assert.equal(model.missions[0].progress,7);
assert.equal(model.missions[1].complete,true);
assert.equal(model.missions[0].title,'Question Quest');
assert.equal(model.missions[1].title,'Keep It Going');
assert.equal(model.missions[2].title,'Challenge Complete');
assert.equal(api.progressPercent(model.missions[0]),70);
assert.equal(api.progressPercent(model.missions[1]),100);
assert.match(api.missionProgressText(model.missions[0]),/7\/10 questions/);
assert.equal(api.missionProgressText(model.missions[1]),'Complete');
const label = api.weekLabel(model);
assert.match(label,/Aug/);
assert.match(label,/Sep/);
assert.match(label,/31|6/);

const completed = api.normalizePayload({
  missions:[
    {id:'a',progress:10,target:10,complete:true},
    {id:'b',progress:2,target:2,complete:true},
    {id:'c',progress:1,target:1,complete:true}
  ]
});
assert.equal(completed.summary.completed,3);
assert.equal(completed.summary.all_complete,true);

// Client remains passive/read-only while direct orchestration replaces the internal achievement-event dependency.
assert.match(source,/get_student_weekly_missions_v572/);
assert.match(coreSource,/V57CStudentContinueLearningHome\?\.passivePracticeAccess/);
assert.match(studentSource,/v572:missions-updated/);
assert.match(studentSource,/This Week\\'s Missions|This Week's Missions/);
assert.match(studentSource,/return loadMissions\(force\)/);
assert.doesNotMatch(studentSource,/addEventListener\(['"]v571b:achievements-updated/);
assert.doesNotMatch(source,/validateStudentAccess\(['"]exam['"]\)/);
assert.doesNotMatch(source,/correct_answer|correctAnswer|service_role/i);
assert.doesNotMatch(source,/cloud\.from\(|\.insert\(|\.update\(|\.delete\(/);
assert.doesNotMatch(studentSource,/document\.title|Version 5\.7|Stable Release/);

// Config keeps the consolidated student module before untouched V5.7.3/V5.7.4 consumers.
assert.match(config,/\.\/v57-stable-release-checkpoint\.js'[\s\S]*\.\/gamification-core\.js'[\s\S]*\.\/gamification-student\.js'[\s\S]*\.\/v573-class-challenges-teacher-gamification\.js'[\s\S]*\.\/v574-gamification-polish-teacher-controls\.js'/);
assert.doesNotMatch(config,/['"]\.\/v572-weekly-missions\.js['"]/);
assert.match(studentSource,/Object\.defineProperty\(window,'V572WeeklyMissions'/);
assert.match(studentSource,/openLearn,openAssignments/);

// Server mission contract is untouched: token-gated, Brunei-week scoped, Practice-only and read-only.
assert.match(sql,/security definer/i);
assert.match(sql,/student_access_tickets/);
assert.match(sql,/extensions\.digest/);
assert.match(sql,/Asia\/Brunei/);
assert.match(sql,/date_trunc\('week'/);
assert.match(sql,/practice_mode <> 'exam'/);
assert.match(sql,/v_questions >= 10/);
assert.match(sql,/v_days >= 2/);
assert.match(sql,/v_challenges >= 1/);
assert.match(sql,/Question Quest/);
assert.match(sql,/Keep It Going/);
assert.match(sql,/Challenge Complete/);
assert.doesNotMatch(sql,/\binsert\b|\bupdate\b|\bdelete\b/i);
assert.doesNotMatch(sql,/correct_answer_snapshot|explanation_snapshot|final_answer/);
assert.match(sql,/revoke all on function public\.get_student_weekly_missions_v572\(text\) from public/i);
assert.match(sql,/grant execute on function public\.get_student_weekly_missions_v572\(text\) to anon, authenticated/i);

console.log('V5.7.2 Weekly Missions checks passed from consolidated student gamification.');
console.log('- three weekly missions retain the accepted Practice-first targets');
console.log('- direct student orchestration replaces the old achievements listener chain');
console.log('- V5.7.3 compatibility API/event contracts and server RPC remain unchanged');
