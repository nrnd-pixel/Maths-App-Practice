const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const source=read('v59-adaptive-diagnostic-pilot.js');
const config=read('config.js');
const pilot=require(path.join(root,'v59-adaptive-diagnostic-pilot.js'));

function expect(condition,message){
  if(!condition) throw new Error(message);
}

expect(pilot.flagEnabled('?adaptivePilot=1')===true,'explicit adaptivePilot=1 flag should enable the browser preview');
expect(pilot.flagEnabled('?adaptivePilot=0')===false,'adaptivePilot=0 must remain dormant');
expect(pilot.flagEnabled('')===false,'pilot must be dormant by default');
expect(Object.keys(pilot.pilotTargets()).length===3,'only the three approved pilot targets should be exposed');

const projected=pilot.projectRoute({
  status:'READY',
  version:'test',
  pilot:true,
  recommended_route_type:'MISCONCEPTION_DIAGNOSTIC',
  question:{
    question_id:'q1',exam_year:2025,paper:'Paper 1',question_number:'9(b)',question_text:'Compare decimals',
    answer:'sensitive',accepted_answers:['sensitive']
  },
  target_skill:{skill_id:'Y4-DEC-M02',year_level:4,domain_code:'DEC',mastery_name:'Compare and order decimals'},
  misconceptions:[{misconception_id:'m1',student_feedback:'Compare place values.',answer:'sensitive'}],
  direct_prerequisites:[{
    skill_id:'Y4-DEC-M01',year_level:4,domain_code:'DEC',mastery_name:'Decimal place value',relationship_type:'PREREQUISITE',
    mapped_questions:[{question_id:'q2',exam_year:2025,paper:'Paper 1',question_number:'12',question_text:'Write a decimal',correct_answer:'sensitive'}]
  }]
});

const projectedText=JSON.stringify(projected);
expect(projected.status==='READY','READY route should survive projection');
expect(!projectedText.includes('sensitive'),'route projection must discard unapproved payload fields');
expect(projected.question.question_text==='Compare decimals','question text should remain available for the preview');
expect(projected.direct_prerequisites[0].mapped_questions[0].question_text==='Write a decimal','diagnostic question text should remain available');

expect(source.includes("new URLSearchParams"),'pilot must be gated by an explicit URL flag');
expect(source.includes("cloud.rpc('student_adaptive_route_preview_v1'"),'pilot must use the protected student route RPC');
expect(source.includes("validateStudentAccess('practice')"),'pilot must reuse the existing signed-in Practice access path');
expect(source.includes('baseRenderQuestion'),'pilot should wrap the existing renderer rather than replace normal Practice logic');
expect(source.includes('no automatic trigger after a wrong response'),'first pilot must stay manual and must not auto-trigger from marking');
expect(!source.includes("cloud.from('questions')"),'pilot must not create a separate direct question-bank read path');
expect(!source.includes('correct_answer_snapshot'),'pilot source must not expose stored correct-response snapshots');
expect(config.includes("'./v59-adaptive-diagnostic-pilot.js'"),'config.js must load the V5.9A pilot module');

console.log('V5.9A adaptive diagnostic pilot regression passed.');
