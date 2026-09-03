const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname,'..');
const modulePath = path.join(root,'v57d-past-paper-analytics-actions.js');
const configPath = path.join(root,'config.js');
const source = fs.readFileSync(modulePath,'utf8');
const config = fs.readFileSync(configPath,'utf8');
const api = require(modulePath);

const students = [
  {roster_student_id:'s1',student_name:'Student One',student_id:'S1',progress_status:'not_started',session_count:0,teacher_assignment:null,questions_practised:0,available_questions:39},
  {roster_student_id:'s2',student_name:'Student Two',student_id:'S2',progress_status:'in_progress',session_count:1,teacher_assignment:null,latest_session:{first_try_percent:45,mastery_percent:65},questions_practised:5,available_questions:39},
  {roster_student_id:'s3',student_name:'Student Three',student_id:'S3',progress_status:'in_progress',session_count:1,teacher_assignment:{status:'in_progress'},latest_session:{first_try_percent:40,mastery_percent:60}},
  {roster_student_id:'s4',student_name:'Student Four',student_id:'S4',progress_status:'completed',session_count:2,teacher_assignment:{status:'completed'},latest_session:{first_try_percent:55,mastery_percent:68}},
  {roster_student_id:'s5',student_name:'Student Five',student_id:'S5',progress_status:'completed',session_count:2,teacher_assignment:null,latest_session:{first_try_percent:85,mastery_percent:95}}
];

assert.equal(api.paperKey(2025,' Paper 1 '),'2025|paper 1');
assert.equal(api.unassignedCandidate(students[0]),true,'not-started learner without assignment should be targetable');
assert.equal(api.unassignedCandidate(students[4]),false,'fully covered learner should not be in unassigned-incomplete cohort');
assert.equal(api.supportCandidate(students[1]),true,'low recent metrics without unfinished assignment should be support candidate');
assert.equal(api.supportCandidate(students[2]),false,'unfinished teacher assignment must exclude duplicate support assignment preparation');
assert.equal(api.supportCandidate(students[3]),true,'completed assignment may be prepared for deliberate re-practice');
assert.equal(api.supportCandidate(students[4]),false,'secure recent performance should not be support candidate');

const cohorts = api.cohortsFromData({students});
assert.deepEqual(cohorts.unassigned.map(row=>row.roster_student_id),['s1','s2']);
assert.deepEqual(cohorts.support.map(row=>row.roster_student_id),['s2','s4']);
assert.deepEqual(cohorts.assigned.map(row=>row.roster_student_id),['s3','s4']);

const plan = api.focusPlanText({
  class:{class_name:'6A'},selected:{exam_year:2025,paper:'Paper 1'},
  summary:{completed_students:2,total_students:5,completion_percent:40,average_first_try_percent:58,average_mastery_percent:72},
  students,
  questions:[
    {question_number:'12',topic:'Fractions',skill:'Compare fractions',attempts:6,first_try_percent:30,mastery_percent:65},
    {question_number:'8',topic:'Number',skill:'Place value',attempts:6,first_try_percent:70,mastery_percent:90}
  ],
  topics:[{topic:'Fractions',skill:'Compare fractions',attempts:6,first_try_percent:35,mastery_percent:68}]
});
assert.match(plan,/Past Paper Action Plan — 6A — 2025 Paper 1/);
assert.match(plan,/Student Two/);
assert.match(plan,/Q12/);
assert.match(plan,/Fractions/);

assert.match(source,/Preparation only:/,'teacher must be told that analytics actions do not auto-create assignments');
assert.match(source,/data-v57d-prepare="unassigned"/);
assert.match(source,/data-v57d-prepare="support"/);
assert.match(source,/V57BTeacherAssignmentManagement/);
assert.match(source,/v56b-past-paper-assignment-admin/);
assert.match(source,/v56b-audience/);
assert.match(source,/v56b-student-options/);
assert.match(source,/v56b-paper/);
assert.match(source,/get_teacher_past_paper_analytics_v56d/);
assert.doesNotMatch(source,/create_teacher_past_paper_assignments_v56b/,'V5.7D must never directly create assignments');
assert.doesNotMatch(source,/update_teacher_past_paper_assignment_v57b|reassign_teacher_past_paper_assignment_v57b/,'V5.7D must leave assignment writes to existing explicit management controls');
assert.doesNotMatch(source,/cloud\.from\(/,'V5.7D should not write tables directly');
assert.doesNotMatch(source,/v56b-save[^\n]{0,100}\.click\(/,'V5.7D must not click the final Assign button automatically');
assert.doesNotMatch(source,/correct_answer|correctAnswer|service_role/i,'analytics actions must not expose answer keys or privileged credentials');
assert.doesNotMatch(source,/localStorage|sessionStorage/,'V5.7D does not need browser persistence');

const v56d = config.indexOf("'./v56d-teacher-past-paper-analytics.js'");
const v57b = config.indexOf("'./v57b-teacher-assignment-management.js'");
const v57c = config.indexOf("'./v57c-student-continue-learning-home.js'");
const v57d = config.indexOf("'./v57d-past-paper-analytics-actions.js'");
assert.ok(v56d>=0 && v57b>v56d && v57c>v57b && v57d>v57c,'V5.7D must load after analytics, assignment management and Continue Learning Home');
assert.match(config,/performs no automatic assignment\s+writes/i);

console.log('V5.7D Past Paper Analytics Actions regression passed.');
console.log('- unassigned and support cohorts use safe non-duplicate rules');
console.log('- actions prepare the existing assignment form instead of writing automatically');
console.log('- assignment manager and copyable teaching focus plan are available');
