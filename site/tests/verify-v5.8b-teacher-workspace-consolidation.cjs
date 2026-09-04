const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'v58b-teacher-workspace-consolidation.js'),'utf8');
const config=fs.readFileSync(path.join(root,'config.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const actionCenter=fs.readFileSync(path.join(root,'v42-teacher-action-center.js'),'utf8');
const launchReadiness=fs.readFileSync(path.join(root,'v50-student-launch-readiness.js'),'utf8');
const operations=fs.readFileSync(path.join(root,'v50-teacher-operations.js'),'utf8');
const classReport=fs.readFileSync(path.join(root,'v50-teacher-class-report.js'),'utf8');
const archive=fs.readFileSync(path.join(root,'v50-report-archive.js'),'utf8');
const pastPaper=fs.readFileSync(path.join(root,'v56d-teacher-past-paper-analytics.js'),'utf8');
const motivation=fs.readFileSync(path.join(root,'v573-class-challenges-teacher-gamification.js'),'utf8');
const feedback=fs.readFileSync(path.join(root,'v5763-teacher-feedback-header-icon.js'),'utf8');

function assert(condition,message){ if(!condition) throw new Error(message); }
new vm.Script(source,{filename:'v58b-teacher-workspace-consolidation.js'});

assert(source.includes('V5.8B — Teacher Workspace Consolidation'),'missing V5.8B identity');
assert(source.includes("const WORKSPACE_ID='v58b-teacher-workspace'"),'missing workspace id');
assert(source.includes('Teacher Workspace'),'missing workspace heading');
assert(source.includes('Quick access grouped by what you want to do.'),'missing task-based workspace explanation');
assert(source.includes('All teacher tools'),'missing preserved full-tool navigation label');
assert(source.includes('Exam Settings and other specialist tools remain available'),'must retain specialist-tab discoverability');

for(const group of ['Monitor','Teach','Students','Content','Reports & Support']){
  assert(source.includes(`title:'${group}'`),`missing workspace group: ${group}`);
}
for(const tool of [
  'Analytics','Action Center','Past Paper Analytics','Classes & Assignments','Review Queue','Class Motivation',
  'Student Access','Teacher Operations','Launch Readiness','Question Bank','Bulk Import','Class Report',
  'Student Reports','Report Archive','Feedback Inbox'
]){
  assert(source.includes(`label:'${tool}'`),`missing existing-tool shortcut: ${tool}`);
}

for(const panel of ['analytics-panel','classes-panel','review-panel','access-panel','questions-panel','import-panel']){
  assert(index.includes(`data-panel=\"${panel}\"`) || index.includes(`id=\"${panel}\"`),`core teacher panel missing from stable index: ${panel}`);
}
assert(actionCenter.includes('v42-action-center'),'Action Center target changed');
assert(pastPaper.includes("const TRIGGER_ID = 'v56d-open-past-paper-analytics'"),'Past Paper Analytics trigger changed');
assert(motivation.includes("const TEACHER_TRIGGER_ID = 'v573-open-class-motivation'"),'Class Motivation trigger changed');
assert(launchReadiness.includes("const PANEL_ID = 'launch-readiness-panel'"),'Launch Readiness panel changed');
assert(operations.includes("const PANEL_ID = 'teacher-operations-panel'"),'Teacher Operations panel changed');
assert(classReport.includes("const TRIGGER_ID = 'v50c1-open-class-report'"),'Class Report trigger changed');
assert(archive.includes("const PANEL_ID = 'report-archive-panel'"),'Report Archive panel changed');
assert(feedback.includes("const ICON_ID='v5763-teacher-feedback-icon'"),'teacher Feedback proxy changed');

assert(source.includes("tab.click()"),'workspace must delegate to existing teacher tabs');
assert(source.includes("trigger.click()"),'workspace must delegate to existing overlay/button owners');
assert(source.includes("scrollToTarget('#analytics-students-body')"),'Student Reports shortcut must guide to existing learner selection');
assert(!source.includes('.appendChild(tab)'),'workspace must not reparent existing teacher tabs');
assert(!source.includes('.appendChild(trigger)'),'workspace must not reparent existing workflow triggers');

const forbidden=[
  'cloud.rpc(',
  'cloud.from(',
  'supabase.',
  'fetch(',
  'localStorage.',
  'sessionStorage.',
  'grade_practice_response',
  'request_practice_hint',
  'submit_practice_session',
  'finalize_exam_attempt',
  'update_teacher_feedback_v576',
  'submit_student_feedback_v576'
];
for(const token of forbidden){
  assert(!source.includes(token),`V5.8B must remain presentation/navigation only: ${token}`);
}

const loader="'./v58b-teacher-workspace-consolidation.js'";
assert(config.includes(loader),'config.js must load V5.8B');
assert(config.indexOf(loader)>config.indexOf("'./v58a-student-first-use-experience.js'"),'V5.8B must load after accepted V5.8A');
assert(config.indexOf(loader)>config.indexOf("'./v5763-teacher-feedback-header-icon.js'"),'V5.8B must load after accepted teacher header polish');

console.log('V5.8B Teacher Workspace Consolidation regression: PASS');