const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const source = fs.readFileSync(path.join(site,'past-paper-assignments.js'),'utf8');
const config = fs.readFileSync(path.join(site,'config.js'),'utf8');
const sql = fs.readFileSync(path.join(site,'..','supabase','v56b_teacher_assigned_past_paper_practice.sql'),'utf8');

new vm.Script(source,{filename:'past-paper-assignments.js'});
const api = require(path.join(site,'past-paper-assignments.js'));

assert.equal(api.routeStudentRpc('get_student_practice_assignments'),'get_student_practice_assignments_v56b');
assert.equal(api.routeStudentRpc('get_student_practice_assignments_v53d1'),'get_student_practice_assignments_v56b');
assert.equal(api.routeStudentRpc('start_student_practice_assignment'),'start_student_practice_assignment_v56b');
assert.equal(api.routeStudentRpc('complete_student_practice_assignment_v53d1'),'complete_student_practice_assignment_v56b');
assert.equal(api.routeStudentRpc('unrelated_rpc'),'unrelated_rpc');

assert.equal(api.isPastPaperAssignment({assignment_type:'past_paper'}),true);
assert.equal(api.isPastPaperAssignment({assignment_type:'targeted'}),false);
assert.equal(api.scopeLabel('all_available'),'All Available Questions');
assert.equal(api.scopeLabel('quick'),'Quick Session');
assert.equal(api.assignmentLabel({assignment_type:'past_paper',exam_year:2025,paper:'Paper 1'}),'2025 · Paper 1');

const library = api.derivePaperLibrary([
  {id:'a',year_level:6,practice_eligible:true,source_type:'past_paper',exam_year:2025,paper:'Paper 1',parent_question_number:'5'},
  {id:'b',year_level:6,practice_eligible:true,source_type:'past_paper',exam_year:2025,paper:'Paper 1',parent_question_number:'5'},
  {id:'c',year_level:6,practice_eligible:true,source_type:'past_paper',exam_year:2025,paper:'Paper 1'},
  {id:'d',year_level:6,practice_eligible:false,source_type:'past_paper',exam_year:2025,paper:'Paper 1'},
  {id:'e',year_level:6,practice_eligible:true,source_type:'topical_exercise',exam_year:2025,paper:'Paper 1'},
  {id:'f',year_level:5,practice_eligible:true,source_type:'past_paper',exam_year:2024,paper:'Paper 1'}
],6);
assert.equal(library.length,1);
assert.equal(library[0].exam_year,2025);
assert.equal(library[0].paper,'Paper 1');
assert.equal(library[0].logical_questions,2,'multipart rows should count as one logical question');
assert.equal(library[0].physical_rows,3);

const now = Date.now();
assert.equal(api.validContext({version:1,assignmentId:'a',attemptId:'b',savedAt:new Date(now-1000).toISOString()},now),true);
assert.equal(api.validContext({version:1,assignmentId:'a',attemptId:'b',savedAt:new Date(now-8*24*60*60*1000).toISOString()},now),false);
assert.equal(api.validContext({version:2,assignmentId:'a',attemptId:'b',savedAt:new Date(now).toISOString()},now),false);

for (const phrase of [
  'Assign Past Paper Practice','Whole selected class','Selected students','Multiple classes','Quick Session',
  'All Available Questions','Teacher Past Paper Assignment','create_teacher_past_paper_assignments_v56b',
  'complete_student_practice_assignment_v56b','mathPastPaperAssignmentV56B'
]) assert(source.includes(phrase),`V5.6B source is missing: ${phrase}`);

assert.match(source,/V55APastPaperPractice/,'Assigned paper launch must reuse V5.5A Past Paper Practice.');
assert.match(source,/V55BFullPaperPractice/,'Assigned paper scope must reuse V5.5B Quick\/All Available behaviour.');
assert.match(source,/V55CResumePastPaperPractice/,'Assigned paper resume must reuse V5.5C checkpointing.');
assert.doesNotMatch(source,/exam_attempts|exam_paper_settings|startExam|finishExam/,'V5.6B must not modify Exam Mode.');

for (const phrase of [
  "assignment_type text not null default 'targeted'","assignment_type in ('targeted','past_paper')",
  "selection_mode in ('quick','all_available')","strand in ('number','measurement','geometry','statistics','thinking','past_paper')",
  'practice_assignment_attempts_question_target_check','question_target >= 1 and question_target <= 500',
  'create_teacher_past_paper_assignments_v56b','get_student_practice_assignments_v56b','start_student_practice_assignment_v56b',
  'complete_student_practice_assignment_v56b',"q.practice_eligible=true","lower(trim(coalesce(q.source_type,'')))='past_paper'",
  "Selected classes must be in the same year level","Every selected student must be active in the selected class",
  "This Practice result is not from the assigned past paper","Finish the full assigned Practice set before completing this assignment"
]) assert(sql.includes(phrase),`V5.6B SQL is missing safety boundary: ${phrase}`);

assert.match(sql,/revoke all on function public\.create_teacher_past_paper_assignments_v56b[\s\S]*from public,anon/i,'Teacher assignment creation must not be executable by anon.');
assert.match(sql,/grant execute on function public\.get_student_practice_assignments_v56b\(text\) to anon,authenticated,service_role/i,'Student assignment listing must remain available through the token-gated student RPC.');
assert.match(sql,/ps\.practice_mode<>'exam'/,'Assignment completion must reject Exam sessions.');
assert.match(sql,/ps\.roster_student_id=v_ticket\.roster_student_id[\s\S]*ps\.class_id=v_ticket\.class_id/,'Assignment completion must bind the result to the verified student and class.');

assert.match(config,/\.\/v56a1-bulk-practice-confirmation-bridge\.js'[\s\S]*\.\/past-paper-assignments\.js'/,'Past Paper assignments must load after the accepted V5.6A stack.');

console.log('V5.6B Teacher-assigned Past Paper Practice checks passed.');
console.log('- teacher class/student/multi-class assignment surfaces present');
console.log('- Past Paper Quick/All Available and resume integration retained');
console.log('- server assignment, recipient, result and Exam-mode boundaries verified');
