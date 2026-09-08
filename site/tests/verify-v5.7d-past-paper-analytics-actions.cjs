const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname,'..');
const modulePath = path.join(root,'past-paper-analytics-actions.js');
const configPath = path.join(root,'config.js');
const combined = fs.readFileSync(modulePath,'utf8');
const d1Marker='/* V5.7D.1 — Focus Plan Copy Fallback.';
const d1Start=combined.indexOf(d1Marker);
assert.ok(d1Start>0,'Consolidated analytics-actions owner must contain V57D followed by V57D1');
const source=combined.slice(0,d1Start);
const config = fs.readFileSync(configPath,'utf8');
const sandbox={module:{exports:{}},exports:{},console};
vm.createContext(sandbox);
new vm.Script(source,{filename:'past-paper-analytics-actions.v57d.js'}).runInContext(sandbox);
const api=sandbox.module.exports;

const students = [
  {roster_student_id:'s1',student_name:'Student One',student_id:'S1',progress_status:'not_started',session_count:0,teacher_assignment:null,questions_practised:0,available_questions:39},
  {roster_student_id:'s2',student_name:'Student Two',student_id:'S2',progress_status:'in_progress',session_count:1,teacher_assignment:null,latest_session:{first_try_percent:45,mastery_percent:65},questions_practised:5,available_questions:39},
  {roster_student_id:'s3',student_name:'Student Three',student_id:'S3',progress_status:'in_progress',session_count:1,teacher_assignment:{status:'in_progress'},latest_session:{first_try_percent:40,mastery_percent:60}},
  {roster_student_id:'s4',student_name:'Student Four',student_id:'S4',progress_status:'completed',session_count:2,teacher_assignment:{status:'completed'},latest_session:{first_try_percent:55,mastery_percent:68}},
  {roster_student_id:'s5',student_name:'Student Five',student_id:'S5',progress_status:'completed',session_count:2,teacher_assignment:null,latest_session:{first_try_percent:85,mastery_percent:95}}
];

assert.equal(api.paperKey(2025,' Paper 1 '),'2025|paper 1');
assert.equal(api.unassignedCandidate(students[0]),true);
assert.equal(api.unassignedCandidate(students[4]),false);
assert.equal(api.supportCandidate(students[1]),true);
assert.equal(api.supportCandidate(students[2]),false);
assert.equal(api.supportCandidate(students[3]),true);
assert.equal(api.supportCandidate(students[4]),false);
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

assert.match(source,/Preparation only:/);
assert.match(source,/data-v57d-prepare="unassigned"/);
assert.match(source,/data-v57d-prepare="support"/);
assert.match(source,/V57BTeacherAssignmentManagement/);
assert.match(source,/api\.openOverlay\(\)/,'V57D must delegate management to untouched V57B.');
assert.match(source,/v56b-past-paper-assignment-admin/);
assert.match(source,/v56b-audience/);
assert.match(source,/v56b-student-options/);
assert.match(source,/v56b-paper/);
assert.match(source,/get_teacher_past_paper_analytics_v56d/);
assert.doesNotMatch(combined,/create_teacher_past_paper_assignments_v56b/,'Analytics actions must never directly create assignments');
assert.doesNotMatch(combined,/update_teacher_past_paper_assignment_v57b|reassign_teacher_past_paper_assignment_v57b/,'Analytics actions must leave assignment writes to explicit management controls');
assert.doesNotMatch(combined,/cloud\.from\(/);
assert.doesNotMatch(source,/v56b-save[^\n]{0,100}\.click\(/,'V57D must not click the final Assign button automatically');
assert.doesNotMatch(combined,/correct_answer|correctAnswer|service_role/i);
assert.doesNotMatch(combined,/localStorage|sessionStorage/);

const analyticsIndex = config.indexOf("'./past-paper-analytics.js'");
const v57b = config.indexOf("'./v57b-teacher-assignment-management.js'");
const v57c = config.indexOf("'./v57c-student-continue-learning-home.js'");
const actionsIndex = config.indexOf("'./past-paper-analytics-actions.js'");
assert.ok(analyticsIndex>=0 && v57b>analyticsIndex && v57c>v57b && actionsIndex>v57c,
  'Consolidated analytics actions must load at the former V57D phase after analytics, V57B and V57C');
assert.match(config,/performs no automatic assignment\s+writes/i);

console.log('V5.7D Past Paper Analytics Actions regression passed.');
console.log('- unassigned and support cohorts use safe non-duplicate rules');
console.log('- actions prepare the existing assignment form instead of writing automatically');
console.log('- untouched V57B assignment manager remains the delegated management owner');
