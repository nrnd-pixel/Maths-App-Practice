const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const source = fs.readFileSync(path.join(site,'v56c-student-past-paper-progress.js'),'utf8');
const config = fs.readFileSync(path.join(site,'config.js'),'utf8');
const sql = fs.readFileSync(path.join(site,'..','supabase','v56c_student_past_paper_progress.sql'),'utf8');

new vm.Script(source,{filename:'v56c-student-past-paper-progress.js'});
const api = require(path.join(site,'v56c-student-past-paper-progress.js'));

assert.equal(api.RPC_NAME,'get_student_past_paper_progress_v56c');
assert.equal(api.paperKey(2025,' Paper 1 '),'2025|paper 1');
assert.equal(api.progressPercent(0,39),0);
assert.equal(api.progressPercent(18,39),46);
assert.equal(api.progressPercent(100,39),100);
assert.equal(api.progressPercent(4,0),0);

assert.equal(api.serverStatus({progress_status:'completed'}),'completed');
assert.equal(api.serverStatus({progress_status:'in_progress'}),'in_progress');
assert.equal(api.serverStatus({progress_status:'unexpected'}),'not_started');
assert.equal(api.statusLabel('completed'),'Completed');
assert.equal(api.statusLabel('in_progress'),'In progress');
assert.equal(api.statusLabel('not_started'),'Not started');

assert.equal(api.assignmentLabel(null),'');
assert.equal(api.assignmentLabel({status:'not_started'}),'Teacher assigned');
assert.equal(api.assignmentLabel({status:'in_progress'}),'Teacher assigned · in progress');
assert.equal(api.assignmentLabel({status:'completed'}),'Teacher assigned · completed');

const mockStorage = {store:{
  a:{version:1,studentId:'ST-1',studentName:'Student One',yearLevel:6,examYear:2024,paper:'Paper 1',savedAt:'2026-09-02T06:00:00Z',questionIds:['a','b'],nextIndex:1},
  b:{version:1,studentId:'ST-2',studentName:'Student Two',yearLevel:6,examYear:2024,paper:'Paper 1',savedAt:'2026-09-02T07:00:00Z',questionIds:['a'],nextIndex:1}
}};
const originalApi = globalThis.V55CResumePastPaperPractice;
globalThis.V55CResumePastPaperPractice = {
  readStore: storage => storage.store,
  pruneStore: store => store
};
const resume = api.resumeForPaper(
  {exam_year:2024,paper:'Paper 1'},
  {student_id:'ST-1',student_name:'Student One'},
  mockStorage
);
assert.equal(resume.studentId,'ST-1');
assert.equal(api.clientStatus({progress_status:'completed'},resume),'in_progress');
assert.equal(api.paperAction({progress_status:'completed'},resume),'continue');
assert.equal(api.paperAction({progress_status:'not_started',teacher_assignment:{status:'not_started'}},null),'assignment');
assert.equal(api.paperAction({progress_status:'not_started'},null),'start');
assert.equal(api.paperAction({progress_status:'completed'},null),'practice_again');
if (originalApi === undefined) delete globalThis.V55CResumePastPaperPractice;
else globalThis.V55CResumePastPaperPractice = originalApi;

assert.match(source,/Past Paper Progress/);
assert.match(source,/validateStudentAccess\('practice'\)/);
assert.match(source,/cloud\.rpc\(RPC_NAME/);
assert.match(source,/V55CResumePastPaperPractice/);
assert.match(source,/V55APastPaperPractice/);
assert.match(source,/data-v56c-result/);
assert.match(source,/my-assignments-btn/);
assert.doesNotMatch(source,/correct_answer/i);
assert.doesNotMatch(source,/service_role/i);

assert.match(sql,/create or replace function public\.get_student_past_paper_progress_v56c/);
assert.match(sql,/security definer/);
assert.match(sql,/t\.purpose='practice'/);
assert.match(sql,/q\.practice_eligible=true/);
assert.match(sql,/ps\.practice_mode='past_paper'/);
assert.match(sql,/practice_logical_item_key_v53d1/);
assert.match(sql,/practice_assignment_recipients/);
assert.match(sql,/roster_student_id=v_ticket\.roster_student_id/);
assert.match(sql,/revoke all on function public\.get_student_past_paper_progress_v56c\(text\) from public/);
assert.match(sql,/grant execute on function public\.get_student_past_paper_progress_v56c\(text\) to anon,authenticated,service_role/);

const v56bIndex = config.indexOf("'./v56b-teacher-assigned-past-paper-practice.js'");
const v56cIndex = config.indexOf("'./v56c-student-past-paper-progress.js'");
assert.ok(v56bIndex >= 0,'V5.6B must remain loaded');
assert.ok(v56cIndex > v56bIndex,'V5.6C must load after V5.6B');

console.log('V5.6C student Past Paper progress regression passed.');
