const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

// Keep the new consolidation guards on the maintained CI path.
require('./verify-phase4-teacher-assignments-checkpoint1-integrity.cjs');
require('./verify-phase4-teacher-assignments-dormant-reference-integrity.cjs');

const coreSource=read('assignments-core.js');
const teacherSource=read('assignments-teacher.js');
const studentSource=read('assignments-student.js');
const studentSql=fs.readFileSync(path.resolve(root,'../supabase/v53d1_practice_assignment_resource_alignment.sql'),'utf8');
const teacherSql=fs.readFileSync(path.resolve(root,'../supabase/v53d1_teacher_assignment_creation_alignment.sql'),'utf8');
const release=read('v40-release.js');
const api=require('../assignments-core.js');

function expect(condition,message){if(!condition)throw new Error(message);}

expect(api.routeRpc('get_student_practice_assignments',{}).name==='get_student_practice_assignments_v53d1','assignment listing must route to V5.3D1');
expect(api.routeRpc('start_student_practice_assignment',{}).name==='start_student_practice_assignment_v53d1','assignment start must route to V5.3D1');
expect(api.routeRpc('complete_student_practice_assignment',{}).name==='complete_student_practice_assignment_v53d1','assignment completion must route to V5.3D1');
expect(api.routeRpc('create_teacher_practice_assignment_v43',{}).name==='create_teacher_practice_assignment_v53d1','single-recipient teacher assignment creation must route to V5.3D1');
expect(api.routeRpc('create_teacher_practice_assignments_v43b',{}).name==='create_teacher_practice_assignments_v53d1','multi-recipient teacher assignment creation must route to V5.3D1');
expect(api.routeRpc('get_student_questions',{}).name==='get_student_questions','free Practice/Exam retrieval must not be rerouted by V5.3D1');

const examKey=api.logicalQuestionKey({id:'1',parent_question_number:'5',exam_year:2025,paper:'Paper 1',source_type:'past_paper',source:'2025 P1'});
const topicalKey=api.logicalQuestionKey({id:'2',parent_question_number:'5',exam_year:null,paper:'',source_type:'topical_exercise',source:'Set A'});
expect(examKey.startsWith('group|exam|'),'exam multipart identity must remain exam-scoped');
expect(topicalKey.startsWith('group|resource|topical_exercise|set a|'),'non-exam multipart identity must use resource provenance');
expect(examKey!==topicalKey,'exam and resource multipart groups must not collide');
expect(api.isPracticeEligible({practice_eligible:true,active:false})===true,'inactive topical resource rows must be eligible when staged');
expect(api.isPracticeEligible({practice_eligible:false,active:true})===false,'explicitly ineligible rows must not appear in assignment availability');

expect(coreSource.includes("create_teacher_practice_assignments_v43b:'create_teacher_practice_assignments_v53d1'"),'teacher assignment creation must keep the versioned unified-pool RPC mapping');
expect(coreSource.includes('__v53d1PracticeAssignmentRpcBridge'),'legacy assignment RPC names must remain bridged');
expect(coreSource.includes("Object.defineProperty(window,'V53D1TeacherPracticePoolAlignment'"),'V53D1 compatibility API must remain exposed');
expect(teacherSource.includes('Practice-resource logical question'),'teacher builder must label unified Practice-resource availability directly');
expect(teacherSource.includes('core.topicOptions(cls,strand)'),'teacher topic options must use the aligned shared core directly');
expect(teacherSource.includes("core.availableItems(cls,strand,topicSelect.value)"),'teacher availability must use the aligned shared core directly');
expect(!coreSource.includes('topicObserver.observe'),'shared core must not patch the V43B DOM after render');
expect(!teacherSource.includes('capturedTopicSelection'),'consolidated teacher UI must not need the old V53D1 topic self-repair loop');
expect(studentSource.includes("cloud.rpc('get_student_practice_assignments'"),'student assignment path must retain the legacy RPC call surface for the bridge');
expect(!coreSource.includes("cloud.from('questions').update")&&!teacherSource.includes("cloud.from('questions').update"),'assignment alignment must not mutate question activation or eligibility');
expect(!coreSource.includes('exam_attempt')&&!teacherSource.includes('exam_attempt')&&!studentSource.includes('exam_attempt'),'assignment consolidation must not change Exam Mode');

expect(studentSql.includes('get_student_practice_assignments_v53d1'),'versioned assignment listing RPC must be recorded');
expect(studentSql.includes('start_student_practice_assignment_v53d1'),'versioned assignment start RPC must be recorded');
expect(studentSql.includes('complete_student_practice_assignment_v53d1'),'versioned assignment completion RPC must be recorded');
expect((studentSql.match(/q\.practice_eligible=true/g)||[]).length>=2,'assignment listing/start availability must use practice_eligible');
expect(studentSql.includes('practice_logical_item_key_v53d1'),'server assignment counts must share a source-aware logical-item helper');
expect(studentSql.includes("'group|resource|'"),'server multipart identity must include resource provenance');
expect(studentSql.includes('question_target'),'assignment target snapshot must remain server-authoritative');
expect(studentSql.includes('practice_assignment_recipients'),'recipient enforcement must remain intact');
expect(studentSql.includes('revoke execute on function public.practice_logical_item_key_v53d1')&&studentSql.includes('from anon,authenticated,service_role'),'internal helper client EXECUTE must be revoked');
expect(!/update\s+public\.questions[\s\S]{0,120}active/i.test(studentSql),'V5.3D1 must not activate/deactivate questions');

expect(teacherSql.includes('create_teacher_practice_assignment_v53d1'),'single-recipient teacher creation RPC must be recorded');
expect(teacherSql.includes('create_teacher_practice_assignments_v53d1'),'multi-recipient teacher creation RPC must be recorded');
expect((teacherSql.match(/q\.practice_eligible=true/g)||[]).length===2,'teacher assignment availability must use practice_eligible in both creation RPCs');
expect(teacherSql.includes('q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source'),'teacher creation RPCs must call the logical-item helper with the verified argument order');
expect(!teacherSql.includes('q.active=true')&&!teacherSql.includes('q.active = true'),'teacher creation RPCs must not depend on legacy active status');
expect(teacherSql.includes('to authenticated,service_role'),'teacher creation RPCs must remain signed-in teacher routes');
expect(!/grant execute[^;]+to anon/i.test(teacherSql),'teacher creation RPCs must not be executable by anon');

expect(release.includes("loadScriptOnce('practice-selection-engine.js'"),'consolidated V53 Practice engine must remain loaded');
expect(!release.includes("loadScriptOnce('v53b-unified-practice-retrieval.js"),'historical V53B source must remain dormant');
expect(release.includes("loadScriptOnce('v53c-two-mode-student-ui.js?v=53c-1'"),'V5.3C two-mode student UI must remain loaded');
expect(release.includes("loadScriptOnce('assignments-core.js', 'data-assignments-core')"),'consolidated assignment core must be loaded');
expect(release.includes("loadScriptOnce('assignments-student.js', 'data-assignments-student')"),'consolidated assignment student runtime must be loaded');
expect(release.includes("loadScriptOnce('assignments-teacher.js', 'data-assignments-teacher')"),'consolidated assignment teacher runtime must be loaded');

console.log('V5.3D1 teacher Practice-pool alignment regression passed.');