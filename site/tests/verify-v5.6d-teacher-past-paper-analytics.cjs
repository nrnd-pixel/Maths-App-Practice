const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const source = fs.readFileSync(path.join(site,'v56d-teacher-past-paper-analytics.js'),'utf8');
const config = fs.readFileSync(path.join(site,'config.js'),'utf8');
const sql = fs.readFileSync(path.join(site,'..','supabase','v56d_teacher_past_paper_analytics.sql'),'utf8');

new vm.Script(source,{filename:'v56d-teacher-past-paper-analytics.js'});
const api = require(path.join(site,'v56d-teacher-past-paper-analytics.js'));

assert.equal(api.RPC_NAME,'get_teacher_past_paper_analytics_v56d');
assert.equal(api.paperKey(2025,' Paper 1 '),'2025|paper 1');
assert.equal(api.statusLabel('completed'),'Completed');
assert.equal(api.statusLabel('in_progress'),'In progress');
assert.equal(api.statusLabel('not_started'),'Not started');
assert.equal(api.sourceLabel('teacher_assigned'),'Teacher assigned');
assert.equal(api.sourceLabel('self_selected'),'Self-selected');
assert.match(api.sourceLabel('teacher_assigned_plus_self'),/extra practice/);

const students = [
  {student_name:'Completed Low',progress_status:'completed',latest_session:{first_try_percent:40}},
  {student_name:'Not Started',progress_status:'not_started',latest_session:null},
  {student_name:'In Progress',progress_status:'in_progress',latest_session:{first_try_percent:80}},
  {student_name:'Completed High',progress_status:'completed',latest_session:{first_try_percent:90}}
].sort(api.studentSort);
assert.deepEqual(students.map(row=>row.student_name),['In Progress','Not Started','Completed Low','Completed High']);

const questions = api.weakQuestions([
  {question_number:'1',attempts:3,first_try_percent:80,mastery_percent:90},
  {question_number:'2',attempts:2,first_try_percent:35,mastery_percent:70},
  {question_number:'3',attempts:0,first_try_percent:null,mastery_percent:null},
  {question_number:'4',attempts:4,first_try_percent:55,mastery_percent:60}
],2);
assert.deepEqual(questions.map(row=>row.question_number),['2','4']);

const topics = api.weakTopics([
  {topic:'Fractions',attempts:5,first_try_percent:42,mastery_percent:68},
  {topic:'Whole Numbers',attempts:8,first_try_percent:75,mastery_percent:90},
  {topic:'Geometry',attempts:0,first_try_percent:null,mastery_percent:null}
],1);
assert.equal(topics[0].topic,'Fractions');

assert.match(source,/Past Paper Analytics/);
assert.match(source,/export-analytics/);
assert.match(source,/cloud\.rpc\(RPC_NAME/);
assert.match(source,/Weakest questions/);
assert.match(source,/Topic & skill focus/);
assert.match(source,/Self-selected/);
assert.doesNotMatch(source,/correct_answer/i);
assert.doesNotMatch(source,/service_role/i);

assert.match(sql,/create or replace function public\.get_teacher_past_paper_analytics_v56d/);
assert.match(sql,/security definer/);
assert.match(sql,/tp\.user_id = auth\.uid\(\)/);
assert.match(sql,/q\.practice_eligible=true/);
assert.match(sql,/ps\.practice_mode='past_paper'/);
assert.match(sql,/practice_logical_item_key_v53d1/);
assert.match(sql,/practice_assignment_recipients/);
assert.match(sql,/session_answers/);
assert.match(sql,/revoke all on function public\.get_teacher_past_paper_analytics_v56d\(uuid,smallint,text\) from public/);
assert.match(sql,/grant execute on function public\.get_teacher_past_paper_analytics_v56d\(uuid,smallint,text\) to authenticated,service_role/);
assert.doesNotMatch(sql,/correct_answer_snapshot/);
assert.doesNotMatch(sql,/questions\.answer/);

const v56cIndex = config.indexOf("'./v56c-student-past-paper-progress.js'");
const v56dIndex = config.indexOf("'./v56d-teacher-past-paper-analytics.js'");
assert.ok(v56cIndex >= 0,'V5.6C must remain loaded');
assert.ok(v56dIndex > v56cIndex,'V5.6D must load after V5.6C');

console.log('V5.6D teacher Past Paper analytics regression passed.');

// V5.6E stable consolidation is exercised through the existing V5.6D PR workflow.
require('./verify-v5.6-stable-release-checkpoint.cjs');
