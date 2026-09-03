const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const site=path.join(__dirname,'..');
const repo=path.join(site,'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');

const config=read('config.js');
const moduleSource=read('v576-classroom-feedback-support.js');
const positionSource=read('v5761-feedback-trigger-position.js');
const sql=fs.readFileSync(path.join(repo,'supabase','v576_classroom_feedback_support.sql'),'utf8');
const pinFix=fs.readFileSync(path.join(repo,'supabase','v5762_student_pin_reset_lockout_fix.sql'),'utf8');
const stable=read('v575-gamification-stable-checkpoint.js');

new vm.Script(moduleSource,{filename:'v576-classroom-feedback-support.js'});
new vm.Script(positionSource,{filename:'v5761-feedback-trigger-position.js'});

assert.match(moduleSource,/__v576ClassroomFeedbackSupportInstalled/);
assert.match(moduleSource,/submit_student_feedback_v576/);
assert.match(moduleSource,/get_teacher_feedback_v576/);
assert.match(moduleSource,/update_teacher_feedback_v576/);
assert.match(moduleSource,/💬 Send Feedback/);
assert.match(moduleSource,/💬 Feedback Inbox/);
assert.match(moduleSource,/Problem/);
assert.match(moduleSource,/Suggestion/);
assert.match(moduleSource,/Question/);
assert.match(moduleSource,/Acknowledged/);
assert.match(moduleSource,/Resolved/);
assert.match(moduleSource,/If a problem is visual, showing your teacher a screenshot can also help/);

// V5.7.6 is a feature layer after the accepted V5.7.5 stable checkpoint.
assert.match(config,/\.\/v575-gamification-stable-checkpoint\.js'[\s\S]*\.\/v576-classroom-feedback-support\.js'[\s\S]*\.\/v5761-feedback-trigger-position\.js'/);
assert.match(stable,/Math Practice V5\.7\.5/);
assert.doesNotMatch(moduleSource,/document\.title\s*=/,'V5.7.6 must not replace the accepted V5.7.5 release identity.');

// V5.7.6.1 moves only the student trigger: compact icon, top-right Home hero, accessible label.
assert.match(positionSource,/__v5761FeedbackTriggerPositionInstalled/);
assert.match(positionSource,/#start \.v40-learning-hub-hero/);
assert.match(positionSource,/button\.textContent='💬'/);
assert.match(positionSource,/aria-label','Send feedback'/);
assert.match(positionSource,/title','Send feedback'/);
assert.match(positionSource,/position:absolute;top:10px;right:10px/);
assert.match(positionSource,/border-radius:50%/);
assert.doesNotMatch(positionSource,/cloud\.rpc\(|cloud\.from\(|fetch\(/,'Trigger-position polish must not make network/data calls.');

// Student feedback uses an existing temporary Practice ticket and sends only safe context.
assert.match(moduleSource,/passivePracticeAccess/);
assert.match(moduleSource,/p_access_token:access\.access_token/);
assert.match(moduleSource,/release_badge/);
assert.match(moduleSource,/viewport/);
assert.match(moduleSource,/user_agent/);
assert.doesNotMatch(moduleSource,/service_role|serviceRole/i);
assert.doesNotMatch(moduleSource,/correct_answer|answer_key|mark_scheme|grading_authority/i);
assert.doesNotMatch(moduleSource,/validateStudentAccess\(['"]exam['"]\)/);

// Database table is private; student submit is token-gated; teacher read/update are teacher-only.
assert.match(sql,/create table if not exists public\.app_feedback_v576/);
assert.match(sql,/enable row level security/);
assert.match(sql,/revoke all on table public\.app_feedback_v576 from public, anon, authenticated/);
assert.match(sql,/token_hash = extensions\.digest\(trim\(coalesce\(p_access_token,''\)\),'sha256'\)/);
assert.match(sql,/t\.expires_at > now\(\)/);
assert.match(sql,/t\.roster_student_id is not null/);
assert.match(sql,/cs\.active=true/);
assert.match(sql,/sc\.active=true/);
assert.match(sql,/if not public\.is_teacher\(\) then raise exception 'Teacher access required'/);
assert.match(sql,/grant execute on function public\.submit_student_feedback_v576\(text,text,text,jsonb\) to anon,authenticated/);
assert.match(sql,/revoke all on function public\.get_teacher_feedback_v576\(uuid,text\) from public,anon/);
assert.match(sql,/revoke all on function public\.update_teacher_feedback_v576\(uuid,text,text\) from public,anon/);
assert.match(sql,/grant execute on function public\.get_teacher_feedback_v576\(uuid,text\) to authenticated,service_role/);
assert.match(sql,/grant execute on function public\.update_teacher_feedback_v576\(uuid,text,text\) to authenticated,service_role/);

// V5.7.6.2 keeps PIN reset teacher-only and clears stale login failures for that Student ID.
assert.match(pinFix,/create or replace function public\.set_student_pin\(p_student_uuid uuid, p_pin text\)/);
assert.match(pinFix,/if not public\.is_teacher\(\) then/);
assert.match(pinFix,/delete from public\.student_access_failures/);
assert.match(pinFix,/identifier_hash=extensions\.digest\(lower\(trim\(v_student\.student_id\)\),'sha256'\)/);
assert.match(pinFix,/cleared_failed_attempts/);
assert.match(pinFix,/revoke all on function public\.set_student_pin\(uuid,text\) from public,anon/);
assert.match(pinFix,/grant execute on function public\.set_student_pin\(uuid,text\) to authenticated,service_role/);

// Input and workflow limits remain bounded.
assert.match(sql,/feedback_type in \('problem','suggestion','question'\)/);
assert.match(sql,/between 5 and 1500/);
assert.match(sql,/octet_length\(v_context::text\) > 6000/);
assert.match(sql,/status in \('new','acknowledged','resolved'\)/);
assert.match(sql,/limit 300/);
assert.match(sql,/Teacher note must be 1000 characters or fewer/);

// No learning or Exam authority is added by this support layer.
for(const forbidden of [
  'grade_practice_response','request_practice_hint','finalize_exam_attempt','submit_practice_session',
  'save_exam_attempt','create_teacher_past_paper_assignments','update_teacher_past_paper_assignment'
]) assert(!moduleSource.includes(forbidden),`Feedback UI must not call ${forbidden}.`);

console.log('V5.7.6 Classroom Feedback + Support checks passed.');
console.log('- student feedback is token-gated and contains safe diagnostic context only');
console.log('- feedback trigger is a compact accessible top-right Home icon');
console.log('- PIN reset now clears temporary failed-login lockout for that Student ID');
console.log('- teacher inbox is authenticated with acknowledge/resolve workflow');
console.log('- V5.7.5 release identity and learning/Exam boundaries remain unchanged');
