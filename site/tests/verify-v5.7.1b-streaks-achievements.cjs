const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');
const source = read('v571b-streaks-achievements.js');
const config = read('config.js');
const sql = fs.readFileSync(path.join(site,'..','supabase','v571b_student_streaks_achievements.sql'),'utf8');

new vm.Script(source,{filename:'v571b-streaks-achievements.js'});
const api = require(path.join(site,'v571b-streaks-achievements.js'));

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

// Client remains a passive, read-only student Home enhancement.
assert.match(source,/get_student_gamification_achievements_v571b/);
assert.match(source,/V571AGamificationFoundation\?\.passivePracticeAccess/);
assert.match(source,/V57CStudentContinueLearningHome\?\.passivePracticeAccess/);
assert.doesNotMatch(source,/validateStudentAccess\(['"]exam['"]\)/);
assert.doesNotMatch(source,/correct_answer|correctAnswer|service_role/i);
assert.doesNotMatch(source,/cloud\.from\(|\.insert\(|\.update\(|\.delete\(/);
assert.match(source,/v571a:gamification-updated/);
assert.match(source,/v57c:home-updated/);
assert.match(source,/Latest Achievement/);
assert.match(source,/View achievements/);
assert.match(source,/Achievement unlocked!/);

// V5.7.1B loads after the accepted XP/Level foundation and does not own release identity.
assert.match(config,/\.\/v571a-gamification-foundation\.js'[\s\S]*\.\/v571b-streaks-achievements\.js'/);
assert.doesNotMatch(source,/document\.title|Version 5\.7|Stable Release/);

// Server streaks/badges are derived from saved non-Exam Practice in Brunei local dates.
assert.match(sql,/get_student_gamification_achievements_v571b/);
assert.match(sql,/security definer/i);
assert.match(sql,/student_access_tickets/);
assert.match(sql,/extensions\.digest/);
assert.match(sql,/practice_mode <> 'exam'/);
assert.match(sql,/Asia\/Brunei/);
assert.match(sql,/questions_completed >= 5/);
assert.match(sql,/paa\.status = 'completed'/);
assert.match(sql,/v_today - 1/); // yesterday remains alive until the current day ends.
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

console.log('V5.7.1B Practice Streaks + Achievement Badges checks passed.');
console.log('- gentle streak uses meaningful Practice and preserves yesterday until today ends');
console.log('- achievement badges are derived from saved learning evidence, not client writes');
console.log('- Home decoration remains Practice-only, answer-key free and compatible with V5.7.1A');
