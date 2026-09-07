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
const sql = fs.readFileSync(path.join(site,'..','supabase','v571b_student_streaks_achievements.sql'),'utf8');

new vm.Script(coreSource,{filename:'gamification-core.js'});
new vm.Script(studentSource,{filename:'gamification-student.js'});
const api = require(path.join(site,'gamification-student.js')).achievements;

const payload = {
  streak:{current:4,longest:7,days_this_week:3,meaningful_days:12,today_qualified:true,today_questions:5,last_qualified_day:'2026-09-03'},
  badges:[
    {id:'perfect_five',title:'Perfect Five',description:'Complete a perfect set.',icon:'⭐',earned:true,earned_at:'2026-09-03T04:00:00Z'},
    {id:'seven_day_streak',title:'7-Day Streak',description:'Seven consecutive days.',icon:'🔥',earned:false,earned_at:null}
  ],
  latest_badge:{id:'perfect_five',title:'Perfect Five',description:'Complete a perfect set.',icon:'⭐',earned:true,earned_at:'2026-09-03T04:00:00Z'},
  rules:{meaningful_questions_per_day:5,past_paper_completes_day:true,assignment_completes_day:true,timezone:'Asia/Brunei'}
};
const model = api.normalizePayload(payload);
assert.equal(model.streak.current,4);
assert.equal(model.streak.longest,7);
assert.equal(model.earned_count,1);
assert.equal(model.latest_badge.id,'perfect_five');
assert.equal(model.rules.meaningful_questions_per_day,5);
assert.match(api.streakMessage(model),/Streak secured today/);

const keepGoing = api.normalizePayload({streak:{current:3,today_qualified:false,today_questions:0},rules:{meaningful_questions_per_day:5}});
assert.equal(api.streakMessage(keepGoing),'Practise today to keep your 3-day streak going.');
const partial = api.normalizePayload({streak:{current:0,today_qualified:false,today_questions:2},rules:{meaningful_questions_per_day:5}});
assert.equal(api.streakMessage(partial),'2/5 questions today · 3 more to start a streak.');
const fresh = api.normalizePayload({streak:{current:0,today_qualified:false,today_questions:0},rules:{meaningful_questions_per_day:5}});
assert.equal(api.streakMessage(fresh),'Complete 5 questions today to start a Practice streak.');

const now = Date.parse('2026-09-03T04:08:00Z');
assert.equal(api.celebrationCandidate(model,now)?.id,'perfect_five');
assert.equal(api.celebrationCandidate(model,Date.parse('2026-09-03T04:20:01Z')),null);

// Client behavior remains passive/read-only, now coordinated directly by the consolidated student module.
assert.match(source,/get_student_gamification_achievements_v571b/);
assert.match(coreSource,/V57CStudentContinueLearningHome\?\.passivePracticeAccess/);
assert.doesNotMatch(source,/validateStudentAccess\(['"]exam['"]\)/);
assert.doesNotMatch(source,/correct_answer|correctAnswer|service_role/i);
assert.doesNotMatch(source,/cloud\.from\(|\.insert\(|\.update\(|\.delete\(/);
assert.match(studentSource,/v571b:achievements-updated/);
assert.match(studentSource,/Latest Achievement/);
assert.match(studentSource,/View achievements/);
assert.match(studentSource,/Achievement unlocked!/);
assert.match(studentSource,/const achievementsOk=await loadAchievements\(force\)/);
assert.doesNotMatch(studentSource,/addEventListener\(['"]v571a:gamification-updated/);

// The exact historical achievement DOM remains available to V5.8A.
assert.match(coreSource,/achievementCard:'v571b-latest-achievement'/);
assert.match(studentSource,/FIRST_PRACTICE_BADGE_SELECTOR/);
assert.match(studentSource,/v571b-badge/);
assert.match(studentSource,/data-badge-id/);

// Checkpoint 1 uses the consolidated modules and keeps release identity ownership elsewhere.
assert.match(config,/\.\/gamification-core\.js'[\s\S]*\.\/gamification-student\.js'[\s\S]*\.\/v573-class-challenges-teacher-gamification\.js'/);
assert.doesNotMatch(config,/['"]\.\/v571b-streaks-achievements\.js['"]/);
assert.doesNotMatch(studentSource,/document\.title|Version 5\.7|Stable Release/);

// Server streak/badge contract remains untouched.
assert.match(sql,/get_student_gamification_achievements_v571b/);
assert.match(sql,/security definer/i);
assert.match(sql,/student_access_tickets/);
assert.match(sql,/extensions\.digest/);
assert.match(sql,/practice_mode <> 'exam'/);
assert.match(sql,/Asia\/Brunei/);
assert.match(sql,/questions_completed >= 5/);
assert.match(sql,/paa\.status = 'completed'/);
assert.match(sql,/v_today - 1/);
assert.match(sql,/three_day_streak/);
assert.match(sql,/seven_day_streak/);
assert.match(sql,/perfect_five/);
assert.match(sql,/mastery_maker/);
assert.match(sql,/past_paper_beginner/);
assert.doesNotMatch(sql,/create\s+table/i);
assert.doesNotMatch(sql,/\binsert\s+into\b|\bupdate\s+public\.|\bdelete\s+from\b/i);
assert.doesNotMatch(sql,/correct_answer_snapshot|explanation_snapshot|final_answer/);
assert.match(sql,/revoke all on function public\.get_student_gamification_achievements_v571b\(text\) from public/i);
assert.match(sql,/grant execute on function public\.get_student_gamification_achievements_v571b\(text\) to anon, authenticated/i);

console.log('V5.7.1B Practice Streaks + Achievement Badges checks passed from consolidated student gamification.');
console.log('- streak and badge normalization/celebration behavior is retained');
console.log('- legacy achievement event and V5.8A DOM compatibility remain available');
console.log('- server derivation/read-only contract remains unchanged');
