const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const root = path.join(site,'..');
const readSite = name => fs.readFileSync(path.join(site,name),'utf8');
const readRoot = name => fs.readFileSync(path.join(root,name),'utf8');

const source = readSite('v57a-cross-device-past-paper-resume.js');
const bridge = readSite('v57a1-cross-device-local-bridge.js');
const config = readSite('config.js');
const sql = readRoot('supabase/v57a_cross_device_past_paper_resume.sql');
const cleanupSql = readRoot('supabase/v57a_checkpoint_completion_cleanup.sql');

new vm.Script(source,{filename:'v57a-cross-device-past-paper-resume.js'});
new vm.Script(bridge,{filename:'v57a1-cross-device-local-bridge.js'});
const api = require(path.join(site,'v57a-cross-device-past-paper-resume.js'));
const bridgeApi = require(path.join(site,'v57a1-cross-device-local-bridge.js'));

assert.equal(api.RPC_GET,'get_student_past_paper_checkpoints_v57a');
assert.equal(api.RPC_SAVE,'save_student_past_paper_checkpoint_v57a');
assert.equal(api.RPC_DELETE,'delete_student_past_paper_checkpoint_v57a');
assert.equal(api.paperKey(2025,'Paper 1'),'2025|paper 1');
assert.equal(typeof api.restoreFromServer,'function');
assert.equal(typeof api.boundarySnapshot,'function');
assert.equal(typeof bridgeApi.mirror,'function');
assert.equal(typeof bridgeApi.syncFromServer,'function');

// V5.7A sits on top of the accepted same-device V5.5C fallback rather than replacing it.
assert.match(source,/V55CResumePastPaperPractice/);
assert.match(source,/applyCheckpointToItems/);
assert.match(source,/rehydrateAnswers/);
assert.match(source,/same-device fallback remains available/i);
assert.match(source,/startButton\.onclick\s*=\s*\(\)\s*=>\s*ROOT\.startPractice\(\)/);
assert.match(source,/nextButton\.onclick\s*=\s*\(\)\s*=>\s*ROOT\.nextQuestion\(\)/);

// The browser sends only structural checkpoint metadata. Correctness/outcomes are reconstructed server-side.
assert.match(source,/questionIds:api\.questionItemIds\(questions\)/);
assert.match(source,/startedAt:state\.startedAt/);
assert.doesNotMatch(source,/correctAnswer\s*:/);
assert.doesNotMatch(source,/explanation\s*:/);
assert.doesNotMatch(source,/p_snapshot\s*:\s*\{[^}]*answers/s);

// Cross-device restore retains a validated teacher-assignment context when present.
assert.match(source,/assignmentContext/);
assert.match(source,/writeAssignmentContext/);
assert.match(source,/assignment_id:snapshot\.assignmentContext\.assignmentId/);
assert.match(source,/assignment_attempt_id|attempt_id:snapshot\.assignmentContext\.attemptId/);

// Existing My Progress / V5.5C resume surfaces can consume the authenticated server checkpoint.
assert.match(bridge,/serverSaved/);
assert.match(bridge,/localSaved/);
assert.match(bridge,/if \(existing && localSaved>serverSaved\) return false/);
assert.match(bridge,/v57a:checkpoints-updated/);
assert.match(bridge,/#v55c-resume-card \[data-v55c-resume\]/);
assert.match(bridge,/restoreFromServer/);

// Load order: stable V5.6 + Practice-first V5.6.1, then V5.7A server layer and its compatibility bridge.
const v561 = config.indexOf("'./v561-practice-first-student-experience.js'");
const v57a = config.indexOf("'./v57a-cross-device-past-paper-resume.js'");
const v57a1 = config.indexOf("'./v57a1-cross-device-local-bridge.js'");
assert.ok(v561 >= 0,'V5.6.1 Practice-first layer must remain loaded');
assert.ok(v57a > v561,'V5.7A must load after Practice-first V5.6.1');
assert.ok(v57a1 > v57a,'V5.7A compatibility bridge must load after the server checkpoint layer');

// Database storage is additive, private-by-default and token-gated.
assert.match(sql,/create table if not exists public\.student_past_paper_checkpoints_v57a/i);
assert.match(sql,/alter table public\.student_past_paper_checkpoints_v57a enable row level security/i);
assert.match(sql,/revoke all on table public\.student_past_paper_checkpoints_v57a from anon, authenticated/i);
assert.match(sql,/SECURITY DEFINER/i);
assert.match(sql,/token_hash\s*=\s*extensions\.digest\(trim\(coalesce\(p_access_token,''\)\),'sha256'\)/i);
assert.match(sql,/t\.purpose\s*=\s*'practice'/i);
assert.match(sql,/t\.expires_at\s*>\s*now\(\)/i);
assert.match(sql,/v_ticket\.roster_student_id is null/i);
assert.match(sql,/v_ticket\.class_id is null/i);

// Every saved question must still be part of the student's current Practice-eligible past-paper bank.
assert.match(sql,/q\.practice_eligible\s*=\s*true/i);
assert.match(sql,/lower\(trim\(coalesce\(q\.source_type,''\)\)\)\s*=\s*'past_paper'/i);
assert.match(sql,/q\.year_level\s*=\s*v_ticket\.year_level/i);
assert.match(sql,/q\.exam_year\s*=\s*v_exam_year/i);
assert.match(sql,/lower\(trim\(coalesce\(q\.paper,''\)\)\)\s*=\s*lower\(trim\(v_paper\)\)/i);
assert.match(sql,/v_scope = 'all' and v_logical_count <> v_available_count/i);
assert.match(sql,/v_scope = 'quick' and v_logical_count > least\(20, v_available_count\)/i);

// Outcome evidence comes from server grading events; client counters/answers are not trusted.
assert.match(sql,/student_practice_answer_events/i);
assert.match(sql,/e\.ticket_id\s*=\s*v_ticket\.id/i);
assert.match(sql,/e\.completed\s*=\s*true/i);
assert.match(sql,/v_event\.first_correct/i);
assert.match(sql,/v_event\.final_correct/i);
assert.match(sql,/v_event\.attempt_count/i);
assert.match(sql,/v_event\.hint_used/i);
assert.match(sql,/v_contiguous := v_contiguous \+ 1/i);
assert.match(sql,/No completed Practice question is available to checkpoint yet/i);

// Stored answer JSON deliberately omits protected answer-key / feedback fields.
assert.doesNotMatch(sql,/'correctAnswer'/i);
assert.doesNotMatch(sql,/'correct_answer'/i);
assert.doesNotMatch(sql,/'explanation'/i);
assert.doesNotMatch(sql,/'hint'\s*,/i);
assert.match(sql,/'hintUsed'/i);
assert.match(sql,/pg_column_size\(p_snapshot\) > 524288/i);

// Teacher assignment linkage is server-validated against the roster student and paper.
assert.match(sql,/att\.roster_student_id\s*=\s*v_ticket\.roster_student_id/i);
assert.match(sql,/att\.status\s*=\s*'in_progress'/i);
assert.match(sql,/pa\.class_id\s*=\s*v_ticket\.class_id/i);
assert.match(sql,/pa\.assignment_type\s*=\s*'past_paper'/i);
assert.match(sql,/v_logical_count <> greatest\(1,coalesce\(v_attempt\.question_target,1\)\)/i);

// Checkpoint expires after seven days and successful Past Paper session persistence clears it.
assert.match(sql,/now\(\)\+interval '7 days'/i);
assert.match(cleanupSql,/after insert or update of practice_mode, ended_early, roster_student_id, exam_year, paper/i);
assert.match(cleanupSql,/new\.practice_mode\s*=\s*'past_paper'/i);
assert.match(cleanupSql,/delete from public\.student_past_paper_checkpoints_v57a/i);
assert.match(cleanupSql,/c\.roster_student_id\s*=\s*new\.roster_student_id/i);

console.log('V5.7A Cross-device Past Paper resume regression passed.');
console.log('- token-gated server checkpoint with RLS and no direct browser table access');
console.log('- server grading evidence determines completed questions and score counters');
console.log('- same-device V5.5C remains a fallback and existing My Progress can reuse it');
console.log('- teacher assignment context survives a validated cross-device resume');
