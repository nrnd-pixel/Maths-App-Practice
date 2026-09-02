const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname,'..');
const modulePath = path.join(root,'v57c-student-continue-learning-home.js');
const configPath = path.join(root,'config.js');
const source = fs.readFileSync(modulePath,'utf8');
const config = fs.readFileSync(configPath,'utf8');
const api = require(modulePath);

const checkpoint = {
  examYear:2025,paper:'Paper 1',questionIds:['q1','q2','q3','q4','q5'],nextIndex:2,
  savedAt:'2026-09-03T00:00:00Z'
};
const assignment = {
  assignment_id:'a1',assignment_type:'past_paper',exam_year:2025,paper:'Paper 1',
  status:'in_progress',timing_status:'active',closes_at:'2026-09-05T00:00:00Z'
};
const recommendation = {
  practice_scope:'topic',focus_topic:'Fractions',recommended_count:5,reason:'needs_attention',performance_percent:48
};

assert.equal(api.selectCheckpoint([checkpoint]),checkpoint,'latest valid cross-device checkpoint should be selected');
assert.equal(api.chooseContinuePriority({checkpoints:[checkpoint],assignments:[assignment],recommendation},Date.parse('2026-09-03T00:00:00Z')).kind,'checkpoint','saved work should outrank other Home actions');

const assignmentRows = [
  {assignment_id:'upcoming',status:'not_started',timing_status:'upcoming',opens_at:'2026-09-10T00:00:00Z'},
  {assignment_id:'later',status:'not_started',timing_status:'active',closes_at:'2026-09-09T00:00:00Z'},
  {assignment_id:'progress',status:'in_progress',timing_status:'active',closes_at:'2026-09-08T00:00:00Z'}
];
assert.equal(api.selectAssignment(assignmentRows,Date.parse('2026-09-03T00:00:00Z')).assignment_id,'progress','in-progress teacher work should outrank new/upcoming work');
assert.equal(api.chooseContinuePriority({assignments:[assignment],recommendation},Date.parse('2026-09-03T00:00:00Z')).kind,'assignment','teacher work should outrank optional recommendation');
assert.equal(api.chooseContinuePriority({assignments:[],recommendation},Date.parse('2026-09-03T00:00:00Z')).kind,'recommendation','recommendation should be used when no saved/assigned work exists');
assert.equal(api.recommendationTitle(recommendation),'Fractions');

const recent = api.recentPractice({recent:[
  {mode:'exam',title:'2025 · Paper 1',completed_at:'2026-09-03T02:00:00Z'},
  {mode:'practice',title:'Fractions',completed_at:'2026-09-03T01:00:00Z',result_code:'ABC'}
]});
assert.equal(recent.title,'Fractions','Home recent result must stay Practice-first and ignore Exam results');

const summary = api.assignmentSummary([
  {status:'not_started',timing_status:'active'},
  {status:'in_progress',timing_status:'due_passed'},
  {status:'not_started',timing_status:'upcoming'},
  {status:'completed',timing_status:'active'}
],Date.parse('2026-09-03T00:00:00Z'));
assert.deepEqual({incomplete:summary.incomplete,overdue:summary.overdue,active:summary.active,upcoming:summary.upcoming,completed:summary.completed},
  {incomplete:3,overdue:1,active:1,upcoming:1,completed:1});

assert.match(source,/Continue Learning/);
assert.match(source,/get_student_practice_assignments_v56b/);
assert.match(source,/get_student_past_paper_checkpoints_v57a/);
assert.match(source,/get_student_learning_dashboard/);
assert.match(source,/get_student_practice_recommendation/);
assert.match(source,/V57ACrossDevicePastPaperResume/);
assert.doesNotMatch(source,/validateStudentAccess\(['"]exam['"]\)/,'V5.7C Home must not require Exam access');
assert.doesNotMatch(source,/correct_answer|correctAnswer|service_role/i,'Home module must not expose answer keys or privileged credentials');
assert.doesNotMatch(source,/update_teacher_past_paper_assignment|reassign_teacher_past_paper_assignment|save_student_past_paper_checkpoint/i,'Home module should remain read-only except explicit existing user actions');

const v57a = config.indexOf("'./v57a-cross-device-past-paper-resume.js'");
const v57b = config.indexOf("'./v57b-teacher-assignment-management.js'");
const v57c = config.indexOf("'./v57c-student-continue-learning-home.js'");
assert.ok(v57a>=0 && v57b>v57a && v57c>v57b,'V5.7C must load after accepted V5.7A/B modules');
assert.match(config,/background checkpoint refreshes passive/i,'V5.7A manual-test hardening assertion must remain documented');
assert.match(config,/without\s+requiring Exam access/i,'V5.7C Practice-first Home intent should remain documented');

console.log('V5.7C Student Continue Learning Home regression passed.');
console.log('- cross-device resume outranks assignments and optional Practice');
console.log('- teacher assignments outrank recommendations and upcoming work');
console.log('- recent activity is Practice-only and Home does not require Exam access');
