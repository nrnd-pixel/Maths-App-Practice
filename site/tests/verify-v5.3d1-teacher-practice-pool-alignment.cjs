const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const ui=read('v53d1-teacher-practice-pool-alignment.js');
const sql=fs.readFileSync(path.resolve(root,'../supabase/v53d1_practice_assignment_resource_alignment.sql'),'utf8');
const release=read('v40-release.js');
const api=require('../v53d1-teacher-practice-pool-alignment.js');

function expect(condition,message){if(!condition)throw new Error(message);}

expect(api.routeRpc('get_student_practice_assignments',{}).name==='get_student_practice_assignments_v53d1','assignment listing must route to V5.3D1');
expect(api.routeRpc('start_student_practice_assignment',{}).name==='start_student_practice_assignment_v53d1','assignment start must route to V5.3D1');
expect(api.routeRpc('complete_student_practice_assignment',{}).name==='complete_student_practice_assignment_v53d1','assignment completion must route to V5.3D1');
expect(api.routeRpc('get_student_questions',{}).name==='get_student_questions','free Practice/Exam retrieval must not be rerouted by V5.3D1');

const examKey=api.logicalQuestionKey({id:'1',parent_question_number:'5',exam_year:2025,paper:'Paper 1',source_type:'past_paper',source:'2025 P1'});
const topicalKey=api.logicalQuestionKey({id:'2',parent_question_number:'5',exam_year:null,paper:'',source_type:'topical_exercise',source:'Set A'});
expect(examKey.startsWith('group|exam|'),'exam multipart identity must remain exam-scoped');
expect(topicalKey.startsWith('group|resource|topical_exercise|set a|'),'non-exam multipart identity must use resource provenance');
expect(examKey!==topicalKey,'exam and resource multipart groups must not collide');
expect(api.isPracticeEligible({practice_eligible:true,active:false})===true,'inactive topical resource rows must be eligible when staged');
expect(api.isPracticeEligible({practice_eligible:false,active:true})===false,'explicitly ineligible rows must not appear in assignment availability');

expect(ui.includes('Practice-resource logical question'),'teacher builder must label unified Practice-resource availability');
expect(ui.includes("cloud.from('practice_assignments')"),'existing assignment cards must be aligned from teacher-visible assignment metadata');
expect(!ui.includes("cloud.from('questions').update"),'V5.3D1 must not mutate question activation or eligibility');
expect(!ui.includes('exam_attempt'),'V5.3D1 must not change Exam Mode');

expect(sql.includes('get_student_practice_assignments_v53d1'),'versioned assignment listing RPC must be recorded');
expect(sql.includes('start_student_practice_assignment_v53d1'),'versioned assignment start RPC must be recorded');
expect(sql.includes('complete_student_practice_assignment_v53d1'),'versioned assignment completion RPC must be recorded');
expect((sql.match(/q\.practice_eligible=true/g)||[]).length>=2,'assignment listing/start availability must use practice_eligible');
expect(sql.includes('practice_logical_item_key_v53d1'),'server assignment counts must share a source-aware logical-item helper');
expect(sql.includes("'group|resource|'"),'server multipart identity must include resource provenance');
expect(sql.includes('question_target'),'assignment target snapshot must remain server-authoritative');
expect(sql.includes('practice_assignment_recipients'),'recipient enforcement must remain intact');
expect(sql.includes('revoke execute on function public.practice_logical_item_key_v53d1')&&sql.includes('from anon,authenticated,service_role'),'internal helper client EXECUTE must be revoked');
expect(!/update\s+public\.questions[\s\S]{0,120}active/i.test(sql),'V5.3D1 must not activate/deactivate questions');

expect(release.includes("loadScriptOnce('v53b-unified-practice-retrieval.js?v=53b-1'"),'V5.3B unified Practice bridge must remain loaded');
expect(release.includes("loadScriptOnce('v53c-two-mode-student-ui.js?v=53c-1'"),'V5.3C two-mode student UI must remain loaded');
expect(release.includes("loadScriptOnce('v53d1-teacher-practice-pool-alignment.js?v=53d1-1'"),'V5.3D1 alignment bridge must be loaded');

console.log('V5.3D1 teacher Practice-pool alignment regression passed.');
