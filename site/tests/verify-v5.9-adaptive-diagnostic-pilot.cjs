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

expect(pilot.flagEnabled('?adaptivePilot=2')===true,'adaptivePilot=2 should enable the interactive pilot');
expect(pilot.flagEnabled('?adaptivePilot=1')===false,'V5.9B must not run on the earlier manual-preview flag');
expect(pilot.flagEnabled('?adaptivePilot=0')===false,'adaptivePilot=0 must remain dormant');
expect(pilot.flagEnabled('')===false,'pilot must be dormant by default');
expect(Object.keys(pilot.pilotTargets()).length===3,'only the three approved pilot targets should be exposed');

const projected=pilot.projectPlan({
  status:'READY',
  pilot_version:'v5.9b-test',
  target:{
    question_id:'target',exam_year:2025,paper:'Paper 2',question_number:'4',question_text:'Target question',
    response_type:'fraction',response_config:{simplest_form:true,correct:'sensitive'},answer:'sensitive'
  },
  steps:[{
    step_order:1,step_label:'Check a prerequisite',skill_id:'Y5-FRA-M07',
    question:{
      question_id:'diag',exam_year:2018,paper:'Paper 2',question_number:'4',question_text:'Diagnostic question',
      response_type:'multiple_choice',response_config:{options:[{value:'A',label:'Choice A'}],correct:'sensitive'},
      answer:'sensitive',accepted_answers:['sensitive']
    }
  }],
  remediation:{student_feedback:'Use a model.',hint_1:'Hint',scaffold_name:'Bar model',answer:'sensitive'}
});

const projectedText=JSON.stringify(projected);
expect(projected.status==='READY','READY plan should survive projection');
expect(!projectedText.includes('sensitive'),'plan projection must discard answer-bearing and unapproved payload fields');
expect(projected.target.question_text==='Target question','safe target question text should remain');
expect(projected.steps[0].question.question_text==='Diagnostic question','safe diagnostic question text should remain');
expect(projected.steps[0].question.response_config.options.length===1,'safe choice options should remain available');

const grade=pilot.projectGrade({status:'READY',correct:false,stage:'diagnostic',feedback:'Review place value.',hint_1:'Use columns.',correct_answer:'sensitive'});
expect(grade.status==='READY'&&grade.correct===false,'grade result should preserve safe status and correctness');
expect(!JSON.stringify(grade).includes('sensitive'),'grade projection must discard any answer-bearing server fields');

expect(source.includes("student_adaptive_trigger_check_v1"),'pilot must verify two-try failure through the protected trigger RPC');
expect(source.includes("student_adaptive_diagnostic_plan_v1"),'pilot must load the protected diagnostic plan');
expect(source.includes("student_adaptive_diagnostic_grade_v1"),'pilot must grade diagnostics server-side');
expect(source.includes("validateStudentAccess('practice')"),'pilot must reuse the existing signed-in Practice access path');
expect(source.includes("#check-btn"),'interactive offer must be driven by the existing Check Answer action');
expect(source.includes('baseRenderQuestion'),'pilot may only wrap rendering for cleanup and must leave Practice selection intact');
expect(source.includes('UNSCORED DIAGNOSTIC'),'diagnostic UI must state that it is unscored');
expect(source.includes('UNSCORED TARGET RETRY'),'target retry must remain separate from the recorded Practice score');
expect(!source.includes("grade_practice_response"),'adaptive grading must not call or mutate the normal Practice grading path');
expect(!source.includes("cloud.from('questions')"),'pilot must not create a direct question-bank read path');
expect(!source.includes('correct_answer_snapshot'),'pilot source must not expose stored correct-response snapshots');
expect(!source.includes('accepted_answers'),'pilot source must not request accepted-answer arrays');
expect(!source.includes('startPractice ='),'pilot must not replace Practice start behavior');
expect(!source.includes('getQuestions ='),'pilot must not replace Practice question selection');
expect(config.includes("'./v59-adaptive-diagnostic-pilot.js'"),'config.js must load the adaptive pilot module');

console.log('V5.9B interactive adaptive diagnostic pilot regression passed.');
