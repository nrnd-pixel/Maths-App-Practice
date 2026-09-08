const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const site=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const release=read('v40-release.js');
const config=read('config.js');
const core=read('assignments-core.js');
const student=read('assignments-student.js');
const teacher=read('assignments-teacher.js');
const v56b=read('past-paper-assignments.js');

const loaders=[...release.matchAll(/loadScriptOnce\('([^'?]+\.js)(?:\?[^']*)?'/g)].map(match=>match[1]);
const pos=name=>loaders.indexOf(name);

for(const retired of [
  'v42-practice-assignments.js','v43-individual-practice-assignments.js',
  'v43-multi-recipient-practice-assignments.js','v53d1-teacher-practice-pool-alignment.js'
]) assert.equal(pos(retired),-1,`${retired} must be dormant, not loaded`);
for(const active of ['assignments-core.js','assignments-student.js','assignments-teacher.js']) assert.ok(pos(active)>=0,`${active} must be loaded`);
assert.ok(pos('v42-teacher-action-center.js') < pos('assignments-core.js'));
assert.ok(pos('assignments-core.js') < pos('assignments-student.js'));
assert.ok(pos('assignments-student.js') < pos('assignments-teacher.js'));
assert.ok(pos('assignments-teacher.js') < pos('v42-roster-cleanup.js'));
assert.ok(pos('assignments-teacher.js') < pos('assignment-interventions.js'));
assert.match(config,/\.\/past-paper-assignments\.js/,
  'Consolidated Past Paper assignment extension must remain staged after the V4/V5.3 foundation.');

const rpcPairs={
  get_student_practice_assignments:'get_student_practice_assignments_v53d1',
  start_student_practice_assignment:'start_student_practice_assignment_v53d1',
  complete_student_practice_assignment:'complete_student_practice_assignment_v53d1',
  create_teacher_practice_assignment_v43:'create_teacher_practice_assignment_v53d1',
  create_teacher_practice_assignments_v43b:'create_teacher_practice_assignments_v53d1'
};
for(const [legacy,current] of Object.entries(rpcPairs)) assert.ok(core.includes(`${legacy}:'${current}'`),`RPC bridge must preserve ${legacy} -> ${current}`);
assert.match(core,/function routeRpc\(name,args=\{\}\)/);
assert.match(core,/const previousRpc = cloud\.rpc\.bind\(cloud\)|const previousRpc=cloud\.rpc\.bind\(cloud\)/);
assert.match(core,/cloud\.rpc = function\(name,args,options\)|cloud\.rpc=function\(name,args,options\)/);
assert.match(core,/__v53d1PracticeAssignmentRpcBridge/);
assert.match(core,/Object\.defineProperty\(window,'V53D1TeacherPracticePoolAlignment'/);
assert.match(core,/ROOT\.__v53d1TeacherPracticePoolAlignmentInstalled=true/);

for(const [legacy,current] of Object.entries({
  get_student_practice_assignments:'get_student_practice_assignments_v53d1',
  start_student_practice_assignment:'start_student_practice_assignment_v53d1',
  complete_student_practice_assignment:'complete_student_practice_assignment_v53d1'
})){
  assert.ok(v56b.includes(`${legacy}:'`) && v56b.includes(`${current}:'`),`Past Paper assignment bridge must recognize both ${legacy} and ${current}`);
}
assert.match(v56b,/get_student_practice_assignments_v53d1:'get_student_practice_assignments_v56b'/);
assert.match(v56b,/start_student_practice_assignment_v53d1:'start_student_practice_assignment_v56b'/);
assert.match(v56b,/complete_student_practice_assignment_v53d1:'complete_student_practice_assignment_v56b'/);

assert.match(core,/function isPracticeEligible\(question\)/);
assert.match(core,/question\?\.practice_eligible === true/);
assert.match(core,/function logicalQuestionKey\(question\)/);
assert.match(core,/group\|resource\|/);
assert.match(teacher,/core\.topicOptions\(cls,strand\)/);
assert.match(teacher,/core\.availableItems\(cls,strand,topicSelect\.value\)/);
assert.match(teacher,/core\.availableItems\(cls,assignment\.strand,assignment\.topic \|\| ''\)/);
assert.doesNotMatch(core,/topicObserver|capturedTopicSelection|refreshCards|#v43b-topic|\.v43b-card/);
assert.doesNotMatch(teacher,/topicObserver|capturedTopicSelection|refreshUi\(false,80\)|refreshCards/);

const v43bIds=['v43b-practice-assignment-admin','v43b-audience','v43b-student-target-wrap','v43b-students-all','v43b-students-clear','v43b-student-options','v43b-class-target-wrap','v43b-class-year','v43b-classes-all','v43b-classes-clear','v43b-class-options','v43b-strand','v43b-topic','v43b-count','v43b-opens','v43b-closes','v43b-availability','v43b-save','v43b-feedback','v43b-list'];
const v43bClasses=['v43b-grid','v43b-wide','v43b-target-wrap','v43b-picker','v43b-picker-head','v43b-picker-actions','v43b-options','v43b-option','v43b-list','v43b-card','v43b-card-head','v43b-stats','v43b-audience','v43b-student-list','v43b-toggle'];
for(const token of [...v43bIds,...v43bClasses]) assert.ok(teacher.includes(token),`Active teacher runtime must preserve V43B DOM token: ${token}`);
assert.match(teacher,/class="outline v43b-toggle" data-id="\$\{html\(assignment\.id\)\}" data-active="\$\{assignment\.active\?'true':'false'\}"/);

const v42StudentTokens=['v42b-student-practice-assignments','v42b-section-head','v42b-assignment-grid','v42b-student-card','v42b-student-card-head','v42b-student-actions','v42b-assignment-result-note','v42b-start-practice-assignment','v42b-view-practice-result'];
for(const token of v42StudentTokens) assert.ok(student.includes(token),`Active student runtime must preserve V42 student DOM token: ${token}`);
assert.match(student,/class="primary v42b-start-practice-assignment" data-id="\$\{html\(assignment\.assignment_id\)\}"/);
assert.match(student,/window\.startPracticeAssignmentV42B=startPracticeAssignment/);
assert.match(student,/cloud\.rpc\('get_student_practice_assignments'/);
assert.match(student,/cloud\.rpc\('start_student_practice_assignment'/);
assert.match(student,/cloud\.rpc\('complete_student_practice_assignment'/);
assert.match(teacher,/cloud\.rpc\('create_teacher_practice_assignments_v43b'/);

const activeAssignmentSource=[core,student,teacher].join('\n');
assert.equal((activeAssignmentSource.match(/renderClassAdmin\s*=\s*wrapped/g)||[]).length,1);
assert.match(teacher,/__assignmentsTeacherWrapped/);
assert.doesNotMatch(activeAssignmentSource,/__v43aWrapped|__v43bWrapped/);
assert.doesNotMatch(core,/renderClassAdmin/);
assert.doesNotMatch(student,/renderClassAdmin/);
for(const [name,source] of [['core',core],['student',student],['teacher',teacher]]){
  for(const mutation of ['finishPractice','startPractice','nextQuestion','getQuestions','shuffle','resultRecord']) assert.doesNotMatch(source,new RegExp(`${mutation}\\s*=`),`${name} must not wrap ${mutation}`);
  assert.doesNotMatch(source,/grade_practice_response|submit_practice_session|request_practice_hint|finalize_exam_attempt/);
}
assert.match(student,/typeof startRecommendedPracticeV35 !== 'function'/);
assert.match(student,/await startRecommendedPracticeV35\(\)/);
assert.match(student,/observer\.observe\(result,\{attributes:true,attributeFilter:\['class'\]\}\)/);

console.log('Phase 4 teacher assignments Checkpoint 1 integrity checks passed.');
console.log('- legacy V42/V43A/V43B/V53D1 loaders remain retired; core/student/teacher ownership retained');
console.log('- V53D1 assignment bridge still composes with the active consolidated Past Paper assignment extension');
console.log('- exact V43B/V42 compatibility DOM contracts and single renderClassAdmin hook retained');
