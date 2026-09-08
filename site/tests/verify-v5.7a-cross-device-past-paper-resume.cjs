const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const root = path.join(site,'..');
const readSite = name => fs.readFileSync(path.join(site,name),'utf8');
const readRoot = name => fs.readFileSync(path.join(root,name),'utf8');

const combined = readSite('past-paper-cross-device.js');
const a1Marker='/* V5.7A.1 — Cross-device resume bridge.';
const a2Marker='/* V5.7A.2 — Stale same-device checkpoint cleanup.';
const a1Start=combined.indexOf(a1Marker);
const a2Start=combined.indexOf(a2Marker);
assert.ok(a1Start>0&&a2Start>a1Start,'Consolidated cross-device owner must preserve V57A -> V57A1 -> V57A2 order');
const source=combined.slice(0,a1Start);
const bridge=combined.slice(a1Start,a2Start);
const staleCleanup=combined.slice(a2Start);
const config = readSite('config.js');
const sql = readRoot('supabase/v57a_cross_device_past_paper_resume.sql');
const cleanupSql = readRoot('supabase/v57a_checkpoint_completion_cleanup.sql');
const watermarkSql = readRoot('supabase/v57a_completion_watermarks.sql');

function loadApi(code,filename){
  const sandbox={module:{exports:{}},exports:{},console};
  vm.createContext(sandbox);
  new vm.Script(code,{filename}).runInContext(sandbox);
  return sandbox.module.exports;
}
new vm.Script(combined,{filename:'past-paper-cross-device.js'});
const api=loadApi(source,'past-paper-cross-device.v57a.js');
const bridgeApi=loadApi(bridge,'past-paper-cross-device.v57a1.js');
const staleApi=loadApi(staleCleanup,'past-paper-cross-device.v57a2.js');

assert.equal(api.RPC_GET,'get_student_past_paper_checkpoints_v57a');
assert.equal(api.RPC_SAVE,'save_student_past_paper_checkpoint_v57a');
assert.equal(api.RPC_DELETE,'delete_student_past_paper_checkpoint_v57a');
assert.equal(api.paperKey(2025,'Paper 1'),'2025|paper 1');
assert.equal(typeof api.restoreFromServer,'function');
assert.equal(typeof api.boundarySnapshot,'function');
assert.equal(typeof api.passivePracticeAccess,'function');
assert.equal(typeof bridgeApi.mirror,'function');
assert.equal(typeof bridgeApi.syncFromServer,'function');
assert.equal(typeof bridgeApi.signedIn,'function');
assert.equal(staleApi.RPC_NAME,'get_student_past_paper_completion_watermarks_v57a');
assert.equal(typeof staleApi.pruneStaleLocalCheckpoints,'function');
assert.equal(typeof staleApi.passivePracticeAccess,'function');

// Cross-device remains an outer layer over the accepted V55 same-device boundary.
assert.match(source,/V55CResumePastPaperPractice/);
assert.match(source,/applyCheckpointToItems/);
assert.match(source,/rehydrateAnswers/);
assert.match(source,/same-device fallback remains available/i);
assert.match(source,/if \(!ROOT\.__v55cResumePastPaperPracticeWrappersInstalled\) return false/);
assert.match(source,/const baseStart = typeof ROOT\.startPractice === 'function' \? ROOT\.startPractice : null/);
assert.match(source,/const baseNext = typeof ROOT\.nextQuestion === 'function' \? ROOT\.nextQuestion : null/);
assert.match(source,/const wrappedNext = function\(\.\.\.args\)/);
assert.doesNotMatch(source,/const wrappedNext = async function/);
assert.match(source,/const result = baseNext\.apply\(this,args\);[\s\S]*if \(snapshot\) void saveBoundary/);
assert.match(source,/startButton\.onclick\s*=\s*\(\)\s*=>\s*ROOT\.startPractice\(\)/);
assert.match(source,/nextButton\.onclick\s*=\s*\(\)\s*=>\s*ROOT\.nextQuestion\(\)/);

// Background work reads the already-authenticated Practice ticket passively.
assert.match(source,/function passivePracticeAccess\(\)/);
assert.match(source,/activeStudentAccess/);
assert.match(staleCleanup,/passivePracticeAccess/);
assert.doesNotMatch(source,/validateStudentAccess\s*\(\s*['"]practice['"]\s*\)/);
assert.doesNotMatch(staleCleanup,/validateStudentAccess\s*\(\s*['"]practice['"]\s*\)/);
assert.match(bridge,/function signedIn\(\)/);
assert.match(bridge,/if \(syncing \|\| !signedIn\(\)\) return false/);
assert.match(bridge,/window\.setTimeout\(\(\)=>\{ if \(signedIn\(\)\) void syncFromServer\(\); \},300\)/);

assert.match(source,/v57a-cross-device-save-banner/);
assert.match(source,/Saving across devices/);
assert.match(source,/Saved across devices/);
assert.match(source,/await refreshCheckpoints\(true\)/);
assert.match(config,/background checkpoint refreshes passive/i);
assert.match(config,/explicit in-quiz cloud-save confirmation/i);

assert.match(source,/questionIds:api\.questionItemIds\(questions\)/);
assert.match(source,/startedAt:state\.startedAt/);
assert.doesNotMatch(source,/correctAnswer\s*:/);
assert.doesNotMatch(source,/explanation\s*:/);
assert.doesNotMatch(source,/p_snapshot\s*:\s*\{[^}]*answers/s);

assert.match(source,/assignmentContext/);
assert.match(source,/writeAssignmentContext/);
assert.match(source,/assignment_id:snapshot\.assignmentContext\.assignmentId/);
assert.match(source,/assignment_attempt_id|attempt_id:snapshot\.assignmentContext\.attemptId/);

assert.match(bridge,/serverSaved/);
assert.match(bridge,/localSaved/);
assert.match(bridge,/if \(existing && localSaved>serverSaved\) return false/);
assert.match(bridge,/v57a:checkpoints-updated/);
assert.match(bridge,/#v55c-resume-card \[data-v55c-resume\]/);
assert.match(bridge,/restoreFromServer/);

assert.match(staleCleanup,/get_student_past_paper_completion_watermarks_v57a/);
assert.match(staleCleanup,/completedAt < savedAt/);
assert.match(staleCleanup,/matchesStudent\(snapshot,data\.student\)/);
assert.match(staleCleanup,/delete store\[key\]/);
assert.match(staleCleanup,/V55CResumePastPaperPractice/);
assert.match(staleCleanup,/v57a:local-fallback-pruned/);

const v561 = config.indexOf("'./v561-practice-first-student-experience.js'");
const crossIndex = config.indexOf("'./past-paper-cross-device.js'");
const v57b = config.indexOf("'./v57b-teacher-assignment-management.js'");
assert.ok(v561 >= 0,'V5.6.1 Practice-first layer must remain loaded');
assert.ok(crossIndex > v561,'Consolidated cross-device owner must load at the former V57A phase after V5.6.1');
assert.ok(v57b > crossIndex,'Untouched V57B must remain downstream of the cross-device owner');

// Database storage remains additive, private-by-default and token-gated.
assert.match(sql,/create table if not exists public\.student_past_paper_checkpoints_v57a/i);
assert.match(sql,/alter table public\.student_past_paper_checkpoints_v57a enable row level security/i);
assert.match(sql,/revoke all on table public\.student_past_paper_checkpoints_v57a from anon, authenticated/i);
assert.match(sql,/SECURITY DEFINER/i);
assert.match(sql,/token_hash\s*=\s*extensions\.digest\(trim\(coalesce\(p_access_token,''\)\),'sha256'\)/i);
assert.match(sql,/t\.purpose\s*=\s*'practice'/i);
assert.match(sql,/t\.expires_at\s*>\s*now\(\)/i);
assert.match(sql,/v_ticket\.roster_student_id is null/i);
assert.match(sql,/v_ticket\.class_id is null/i);
assert.match(sql,/q\.practice_eligible\s*=\s*true/i);
assert.match(sql,/lower\(trim\(coalesce\(q\.source_type,''\)\)\)\s*=\s*'past_paper'/i);
assert.match(sql,/q\.year_level\s*=\s*v_ticket\.year_level/i);
assert.match(sql,/q\.exam_year\s*=\s*v_exam_year/i);
assert.match(sql,/lower\(trim\(coalesce\(q\.paper,''\)\)\)\s*=\s*lower\(trim\(v_paper\)\)/i);
assert.match(sql,/v_scope = 'all' and v_logical_count <> v_available_count/i);
assert.match(sql,/v_scope = 'quick' and v_logical_count > least\(20, v_available_count\)/i);
assert.match(sql,/student_practice_answer_events/i);
assert.match(sql,/e\.ticket_id\s*=\s*v_ticket\.id/i);
assert.match(sql,/e\.completed\s*=\s*true/i);
assert.match(sql,/v_event\.first_correct/i);
assert.match(sql,/v_event\.final_correct/i);
assert.match(sql,/v_event\.attempt_count/i);
assert.match(sql,/v_event\.hint_used/i);
assert.match(sql,/v_contiguous := v_contiguous \+ 1/i);
assert.match(sql,/No completed Practice question is available to checkpoint yet/i);
assert.doesNotMatch(sql,/'correctAnswer'/i);
assert.doesNotMatch(sql,/'correct_answer'/i);
assert.doesNotMatch(sql,/'explanation'/i);
assert.doesNotMatch(sql,/'hint'\s*,/i);
assert.match(sql,/'hintUsed'/i);
assert.match(sql,/pg_column_size\(p_snapshot\) > 524288/i);
assert.match(sql,/att\.roster_student_id\s*=\s*v_ticket\.roster_student_id/i);
assert.match(sql,/att\.status\s*=\s*'in_progress'/i);
assert.match(sql,/pa\.class_id\s*=\s*v_ticket\.class_id/i);
assert.match(sql,/pa\.assignment_type\s*=\s*'past_paper'/i);
assert.match(sql,/v_logical_count <> greatest\(1,coalesce\(v_attempt\.question_target,1\)\)/i);
assert.match(sql,/now\(\)\+interval '7 days'/i);
assert.match(cleanupSql,/after insert or update of practice_mode, ended_early, roster_student_id, exam_year, paper/i);
assert.match(cleanupSql,/new\.practice_mode\s*=\s*'past_paper'/i);
assert.match(cleanupSql,/delete from public\.student_past_paper_checkpoints_v57a/i);
assert.match(cleanupSql,/c\.roster_student_id\s*=\s*new\.roster_student_id/i);
assert.match(watermarkSql,/get_student_past_paper_completion_watermarks_v57a/i);
assert.match(watermarkSql,/ps\.roster_student_id\s*=\s*v_ticket\.roster_student_id/i);
assert.match(watermarkSql,/ps\.class_id\s*=\s*v_ticket\.class_id/i);
assert.match(watermarkSql,/ps\.practice_mode\s*=\s*'past_paper'/i);
assert.match(watermarkSql,/coalesce\(ps\.ended_early,false\)\s*=\s*false/i);
assert.match(watermarkSql,/'completedAt', completed_at/i);
assert.doesNotMatch(watermarkSql,/session_answers|student_practice_answer_events|correct_answer|explanation|hint/i);

console.log('V5.7A Cross-device Past Paper resume regression passed.');
console.log('- consolidated owner preserves V57A -> V57A1 -> V57A2 source/runtime order');
console.log('- V57A remains an outer synchronous-next wrapper over the accepted V55 same-device boundary');
console.log('- server/local bridge and stale-local cleanup contracts remain intact');
console.log('- token-gated server checkpoint and SQL safety boundaries retained');
