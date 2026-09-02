const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const site=path.join(__dirname,'..');
const root=path.join(site,'..');
const source=fs.readFileSync(path.join(site,'v57b-teacher-assignment-management.js'),'utf8');
const config=fs.readFileSync(path.join(site,'config.js'),'utf8');
const sql=fs.readFileSync(path.join(root,'supabase/v57b_teacher_assignment_management.sql'),'utf8');

new vm.Script(source,{filename:'v57b-teacher-assignment-management.js'});
const api=require(path.join(site,'v57b-teacher-assignment-management.js'));

assert.equal(api.RPC_LIST,'get_teacher_past_paper_assignment_management_v57b');
assert.equal(api.RPC_UPDATE,'update_teacher_past_paper_assignment_v57b');
assert.equal(api.RPC_REASSIGN,'reassign_teacher_past_paper_assignment_v57b');
assert.equal(api.statusLabel('completed'),'Completed');
assert.equal(api.timingLabel('closed'),'Closed');
assert.match(api.paperLabel({exam_year:2025,paper:'Paper 1'}),/2025.*Paper 1/);

// Teacher UI exposes the requested management actions and clearer completion tracking.
assert.match(source,/Manage Past Paper Assignments/);
assert.match(source,/Save dates/);
assert.match(source,/Close assignment/);
assert.match(source,/Reopen assignment/);
assert.match(source,/Reassign as new/);
assert.match(source,/Student completion tracking/);
assert.match(source,/Assigned/);
assert.match(source,/Not started/);
assert.match(source,/In progress/);
assert.match(source,/Completed/);
assert.match(source,/Overdue/);
assert.match(source,/cloud\.rpc\(RPC_LIST/);
assert.match(source,/cloud\.rpc\(RPC_UPDATE/);
assert.match(source,/cloud\.rpc\(RPC_REASSIGN/);

// Management remains teacher-side and does not contain grading/answer-key writes.
assert.doesNotMatch(source,/correct_answer|correctAnswer|answer_key|service_role/i);
assert.doesNotMatch(source,/session_answers.*insert|questions.*update/i);

// SQL functions are teacher-gated and Past Paper scoped.
assert.match(sql,/get_teacher_past_paper_assignment_management_v57b/i);
assert.match(sql,/update_teacher_past_paper_assignment_v57b/i);
assert.match(sql,/reassign_teacher_past_paper_assignment_v57b/i);
assert.match(sql,/if not public\.is_teacher\(\)/i);
assert.match(sql,/assignment_type='past_paper'/i);
assert.match(sql,/created_by is distinct from auth\.uid\(\)/i);
assert.match(sql,/Only the teacher who created this assignment can change it/i);
assert.match(sql,/Only the teacher who created this assignment can reassign it/i);
assert.match(sql,/Due date must be after the start date/i);
assert.match(sql,/create_teacher_past_paper_assignments_v56b/i);
assert.match(sql,/practice_assignment_recipients/i);
assert.match(sql,/practice_assignment_attempts/i);
assert.match(sql,/practice_sessions/i);
assert.match(sql,/first_try_percent/i);
assert.match(sql,/mastery_percent/i);
assert.match(sql,/overdue_count/i);

// Closing/reopening changes only assignment scheduling/active metadata; existing attempts/results are retained.
assert.match(sql,/set opens_at=p_opens_at,[\s\S]*closes_at=p_closes_at,[\s\S]*active=coalesce\(p_active,true\)/i);
assert.doesNotMatch(sql,/delete from public\.practice_assignment_attempts/i);
assert.doesNotMatch(sql,/delete from public\.practice_sessions/i);

// RPCs are not callable anonymously.
assert.match(sql,/revoke all on function public\.get_teacher_past_paper_assignment_management_v57b\(uuid\) from public,anon/i);
assert.match(sql,/revoke all on function public\.update_teacher_past_paper_assignment_v57b\(uuid,timestamptz,timestamptz,boolean\) from public,anon/i);
assert.match(sql,/revoke all on function public\.reassign_teacher_past_paper_assignment_v57b\(uuid,timestamptz,timestamptz\) from public,anon/i);
assert.match(sql,/grant execute on function public\.get_teacher_past_paper_assignment_management_v57b\(uuid\) to authenticated,service_role/i);

// V5.7B layers on top of the accepted cross-device V5.7A release.
const v57a2=config.indexOf("'./v57a2-stale-local-checkpoint-cleanup.js'");
const v57b=config.indexOf("'./v57b-teacher-assignment-management.js'");
assert.ok(v57a2>=0,'V5.7A stale-local cleanup must remain loaded');
assert.ok(v57b>v57a2,'V5.7B must load after V5.7A');

console.log('V5.7B Teacher Assignment Management regression passed.');
console.log('- teacher can edit dates and close/reopen without deleting results');
console.log('- reassign-as-new preserves original attempts and recipients');
console.log('- completion tracking includes not started, in progress, completed and overdue learners');
