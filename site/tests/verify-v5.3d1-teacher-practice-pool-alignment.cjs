const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const ui=read('v53d1-teacher-practice-pool-alignment.js');
const studentSql=fs.readFileSync(path.resolve(root,'../supabase/v53d1_practice_assignment_resource_alignment.sql'),'utf8');
const teacherSql=fs.readFileSync(path.resolve(root,'../supabase/v53d1_teacher_assignment_creation_alignment.sql'),'utf8');
const release=read('v40-release.js');
const api=require('../v53d1-teacher-practice-pool-alignment.js');

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

expect(ui.includes('Practice-resource logical question'),'teacher builder must label unified Practice-resource availability');
expect(ui.includes("create_teacher_practice_assignments_v43b:'create_teacher_practice_assignments_v53d1'"),'teacher assignment creation must use the versioned unified-pool RPC');
expect(ui.includes('topicObserver.observe(topicSelect,{childList:true})'),'topic picker must self-repair when the legacy active-only renderer overwrites its options');
expect(ui.includes("if (event.target?.matches?.('#v43b-topic')) capturedTopicSelection=trim(event.target.value)"),'topic choice must be captured before the legacy target handler can erase it');
expect(ui.includes('},true);'),'topic selection capture must use capture phase');
expect(ui.includes('const desired=captured !== null ? captured : previous'),'builder must prefer the captured user topic during repair');
expect(ui.includes("if (desired === '' || topics.includes(desired)) topicSelect.value=desired"),'builder must restore a valid captured topic after rebuilding options');
expect(ui.includes("refreshUi(false,80);refreshUi(false,220)"),'strand/topic changes must receive post-legacy alignment passes');
expect(ui.includes("cloud.from('practice_assignments')"),'existing assignment cards must be aligned from teacher-visible assignment metadata');
expect(!ui.includes("cloud.from('questions').update"),'V5.3D1 must not mutate question activation or eligibility');
expect(!ui.includes('exam_attempt'),'V5.3D1 must not change Exam Mode');

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

expect(release.includes("loadScriptOnce('v53b-unified-practice-retrieval.js?v=53b-1'"),'V5.3B unified Practice bridge must remain loaded');
expect(release.includes("loadScriptOnce('v53c-two-mode-student-ui.js?v=53c-1'"),'V5.3C two-mode student UI must remain loaded');
expect(release.includes("loadScriptOnce('v53d1-teacher-practice-pool-alignment.js?v=53d1-3'"),'V5.3D1 alignment bridge must be cache-busted and loaded');

console.log('V5.3D1 teacher Practice-pool alignment regression passed.');
