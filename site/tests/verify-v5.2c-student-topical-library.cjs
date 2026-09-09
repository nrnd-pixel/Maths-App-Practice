const assert=require('assert');
const {section,loadApi}=require('./v52c-consolidated-test-helper.cjs');

const source=section('student');
const api=loadApi(source);

assert.strictEqual(api.MODE_BUTTON_ID,'v52c-topical-mode-btn');
assert.strictEqual(api.LIBRARY_ID,'v52c-student-topical-library');
assert.strictEqual(api.setKey(6,' Topical Exercise  2 '),'6|topical exercise 2');
const sets=api.normalizeSetRows([{source:' Set A ',logical_questions:'12',physical_rows:'14',total_marks:'16',image_rows:'3',manual_rows:'2'},{source:'',logical_questions:5}]);
assert.deepStrictEqual(sets,[{source:'Set A',logical_questions:12,physical_rows:14,total_marks:16,image_rows:3,manual_rows:2}]);

assert(source.includes('🎯 Topical Practice'),'Student start screen must expose a distinct Topical Practice mode');
assert(source.includes("cloud.rpc('get_available_topical_exercise_sets_v52c'"),'Student library must list only server-published topical sets');
assert(source.includes("validateStudentAccess('practice')"),'Topical Practice must reuse the established student Practice access verification');
assert(source.includes("cloud.rpc('bind_student_topical_access_v52c'"),'Practice ticket must be bound to the selected topical set');
assert(source.includes("cloud.rpc('get_student_topical_questions_v52c'"),'Topical questions must use the dedicated retrieval RPC');
assert(source.includes("cloud.rpc('grade_topical_response_v52c'"),'Topical responses must use the dedicated inactive-question grader');
assert(source.includes("cloud.rpc('submit_topical_practice_session_v52c'"),'Topical completion must use the dedicated submission RPC');
assert(source.includes('buildPracticeItems(rows)'),'Existing multipart Practice engine must be reused');
assert(source.includes('state.topicalSource'),'Topical state must be explicit so normal Practice remains unchanged');
assert(source.includes("if (!state?.topicalSource) return baseGrade(q,response)"),'Normal Practice grading must fall through unchanged');
assert(source.includes("if (!state?.topicalSource) return baseFinish(early)"),'Normal Practice submission must fall through unchanged');
assert(source.includes("document.getElementById('question-count')"),'Existing Practice question-count selector must be retained');
assert(source.includes('Topical • ${source}'),'Student quiz path must identify the topical set');

assert(!source.includes("cloud.rpc('get_student_questions'"),'Topical student mode must never call ordinary Practice retrieval');
assert(!source.includes("cloud.rpc('grade_practice_response_v3'"),'Topical student mode must never directly call the ordinary active-question grader');
assert(!source.includes("cloud.rpc('submit_practice_session_v3'"),'Topical student mode must never directly call ordinary Practice submission');
assert(!source.includes("cloud.from('questions')"),'Student topical library must not read/write the question table directly');
assert(!source.includes("cloud.from('topical_exercise_settings')"),'Student topical library must not access publication rows directly');
assert(!source.includes('exam_paper_settings'),'Topical Practice must remain separate from Exam publication');
assert(!source.includes('update({active'),'Student topical mode must never activate topical questions');

console.log('V5.2C student topical library checks passed.');
require('./verify-phase3-doc-reference-integrity.cjs');
require('./verify-v5.2c-topical-sql.cjs');