const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Keep the Phase 4 Checkpoint 1 integrity guard inside the maintained CI path.
require('./verify-phase4-gamification-checkpoint1-integrity.cjs');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');

const coreSource = read('gamification-core.js');
const studentSource = read('gamification-student.js');
const source = `${coreSource}\n${studentSource}`;
const config = read('config.js');
const sql = fs.readFileSync(path.join(site,'..','supabase','v571a_student_gamification_foundation.sql'),'utf8');

new vm.Script(coreSource,{filename:'gamification-core.js'});
new vm.Script(studentSource,{filename:'gamification-student.js'});
const api = require(path.join(site,'gamification-student.js')).xp;

// Starter level bands remain unchanged from the accepted V5.7.1A behavior.
assert.deepEqual(api.levelForXp(0),{number:1,title:'Maths Starter',start_xp:0,next_level_xp:100,progress_percent:0});
assert.equal(api.levelForXp(99).number,1);
assert.equal(api.levelForXp(100).number,2);
assert.equal(api.levelForXp(249).number,2);
assert.equal(api.levelForXp(250).number,3);
assert.equal(api.levelForXp(499).number,3);
assert.equal(api.levelForXp(500).number,4);
assert.equal(api.levelForXp(899).number,4);
assert.deepEqual(api.levelForXp(900),{number:5,title:'Maths Master',start_xp:900,next_level_xp:null,progress_percent:100});
assert.equal(api.levelForXp(340).progress_percent,36);

// Payload normalization remains defensive and does not trust arbitrary level labels/counts.
const normalized = api.normalizePayload({
  xp:{total:340},
  level:{number:3,title:'Problem Solver',start_xp:250,next_level_xp:500,progress_percent:36},
  activity:{first_try_correct:20,second_try_correct:3,completed_sessions:8},
  rules:{first_try_correct_xp:10,second_try_correct_xp:6,completed_session_xp:10,past_paper_extra_xp:20,completed_assignment_xp:20}
});
assert.equal(normalized.xp,340);
assert.equal(normalized.level.number,3);
assert.equal(normalized.level.title,'Problem Solver');
assert.equal(normalized.activity.first_try_correct,20);
assert.equal(normalized.rules.completed_assignment_xp,20);

// Consolidation keeps the client passive, read-only and Practice-only.
assert.match(source,/get_student_gamification_v571a/);
assert.match(coreSource,/V57CStudentContinueLearningHome\?\.passivePracticeAccess/);
assert.match(coreSource,/V57ACrossDevicePastPaperResume\?\.passivePracticeAccess/);
assert.doesNotMatch(source,/validateStudentAccess\(['"]exam['"]\)/);
assert.doesNotMatch(source,/correct_answer|correctAnswer|service_role/i);
assert.doesNotMatch(source,/cloud\.from\(|\.insert\(|\.update\(|\.delete\(/);
assert.match(studentSource,/v571a:gamification-updated/);
assert.match(studentSource,/How XP works/);
assert.match(studentSource,/First Try correct/);
assert.match(studentSource,/Second Try correct/);
assert.match(studentSource,/Past Paper bonus/);
assert.match(studentSource,/Assignment bonus/);

// Consolidated gamification loads after V5.7 and before the V5.7.5 checkpoint.
assert.match(config,/\.\/v57-stable-release-checkpoint\.js'[\s\S]*\.\/gamification-core\.js'[\s\S]*\.\/gamification-student\.js'[\s\S]*\.\/gamification-teacher\.js'[\s\S]*\.\/v575-gamification-stable-checkpoint\.js'/);
assert.doesNotMatch(config,/['"]\.\/v571a-gamification-foundation\.js['"]/);
assert.doesNotMatch(studentSource,/document\.title|Version 5\.7|Stable Release/);

// Server XP contract is untouched: token-gated, saved-Practice-derived, non-Exam and read-only.
assert.match(sql,/security definer/i);
assert.match(sql,/student_access_tickets/);
assert.match(sql,/extensions\.digest/);
assert.match(sql,/practice_mode <> 'exam'/);
assert.match(sql,/sa\.correct and sa\.first_try/);
assert.match(sql,/sa\.correct and not sa\.first_try/);
assert.match(sql,/\* 10/);
assert.match(sql,/\* 6/);
assert.match(sql,/completed_sessions,0\) \* 10/);
assert.match(sql,/completed_past_papers,0\) \* 20/);
assert.match(sql,/completed_assignments,0\) \* 20/);
assert.doesNotMatch(sql,/\binsert\b|\bupdate\b|\bdelete\b/i);
assert.doesNotMatch(sql,/correct_answer_snapshot|explanation_snapshot|final_answer/);
assert.match(sql,/revoke all on function public\.get_student_gamification_v571a\(text\) from public/i);
assert.match(sql,/grant execute on function public\.get_student_gamification_v571a\(text\) to anon, authenticated/i);

console.log('V5.7.1A Gamification Foundation checks passed from consolidated student gamification.');
console.log('- XP + starter levels retain the accepted rules and boundaries');
console.log('- shared access remains passive, Practice-only and answer-key free');
console.log('- server summary contract remains derived/read-only and unchanged');
