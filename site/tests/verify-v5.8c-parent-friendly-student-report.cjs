const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'v58c-parent-friendly-student-report.js'),'utf8');
const shortcut=fs.readFileSync(path.join(root,'v58c-parent-summary-workspace-shortcut.js'),'utf8');
const config=fs.readFileSync(path.join(root,'config.js'),'utf8');
const reportingOwner=fs.readFileSync(path.join(root,'teacher-reporting.js'),'utf8');
const workspace=fs.readFileSync(path.join(root,'v58b-teacher-workspace-consolidation.js'),'utf8');

function assert(condition,message){ if(!condition) throw new Error(message); }
new vm.Script(source,{filename:'v58c-parent-friendly-student-report.js'});
new vm.Script(shortcut,{filename:'v58c-parent-summary-workspace-shortcut.js'});
new vm.Script(reportingOwner,{filename:'teacher-reporting.js'});

assert(source.includes('V5.8C — Parent-Friendly Student Report'),'missing V5.8C identity');
assert(source.includes("const TRIGGER_ID='v58c-open-parent-summary'"),'missing parent summary trigger');
assert(source.includes("const OVERLAY_ID='v58c-parent-summary-overlay'"),'missing parent summary overlay');
assert(source.includes('Parent / Family Summary'),'missing family-facing report identity');
assert(source.includes('Print / Save PDF'),'missing parent report print flow');
assert(source.includes('@page{size:A4 portrait'),'parent summary must retain A4 portrait print layout');
assert(source.includes('Practice progress summary'),'missing Practice-only summary clarification');
assert(source.includes('It is not an official grade.'),'parent summary must avoid grade ambiguity');
assert(source.includes('Current strengths'),'missing strengths section');
assert(source.includes('Areas to focus on'),'missing focus section');
assert(source.includes('Suggested next step'),'missing deterministic next-step section');
assert(source.includes('Recent Practice'),'missing recent Practice section');
assert(source.includes("String(row?.activity_mode||'').toLowerCase()==='practice'"),'recent family activity must remain Practice-only');
assert(source.includes("statusText(row).includes('secure')"),'strengths must reuse established secure band text');
assert(source.includes("status.includes('needs attention')"),'focus must reuse established needs-attention band text');
assert(source.includes("status.includes('developing')"),'focus must reuse established developing band text');

assert(source.includes('ROOT.V50ReportingExport'),'V5.8C must use the existing reporting API');
assert(source.includes('buildStudentSnapshot'),'V5.8C must reuse the existing student snapshot');
assert(reportingOwner.includes('buildStudentSnapshot'),'existing reporting snapshot API missing');
assert(reportingOwner.includes("Object.defineProperty(window,'V50ReportingExport'"),'existing reporting API exposure changed');
assert(reportingOwner.includes("const TRIGGER_ID = 'v50c2-open-student-report'"),'detailed Student Performance Report trigger changed');
assert(reportingOwner.includes('Print / Save PDF'),'detailed Student Performance Report print flow changed');

for(const forbidden of [
  'analyticsContext',
  'analyticsVisibleRows',
  'selectedAnalyticsStudentKey',
  'aggregateLearning',
  'learningBand(',
  'analyticsAnswerScore',
  'cloud.rpc(',
  'cloud.from(',
  'supabase.',
  'fetch(',
  'localStorage.',
  'sessionStorage.',
  'grade_practice_response',
  'request_practice_hint',
  'submit_practice_session',
  'finalize_exam_attempt'
]){
  assert(!source.includes(forbidden),`V5.8C must not duplicate data or learning authority: ${forbidden}`);
}

assert(shortcut.includes("const SHORTCUT_ID='v58c-workspace-parent-summary'"),'missing V5.8C workspace shortcut');
assert(shortcut.includes('Parent Summary'),'workspace shortcut label missing');
assert(shortcut.includes('#v58b-teacher-workspace'),'shortcut must extend the accepted V5.8B workspace');
assert(shortcut.includes('data-v58b-group="reports-support"'),'shortcut must live in Reports & Support');
assert(shortcut.includes('data-panel="analytics-panel"'),'workspace shortcut must delegate to existing Analytics');
assert(shortcut.includes('analytics-students-body'),'workspace shortcut must guide to learner selection');
assert(!shortcut.includes('cloud.rpc(') && !shortcut.includes('cloud.from(') && !shortcut.includes('fetch('),'workspace shortcut must remain navigation-only');
assert(workspace.includes("title:'Reports & Support'"),'accepted V5.8B Reports & Support group missing');

const mainLoader="'./v58c-parent-friendly-student-report.js'";
const shortcutLoader="'./v58c-parent-summary-workspace-shortcut.js'";
assert(config.includes(mainLoader),'config.js must load V5.8C parent report');
assert(config.includes(shortcutLoader),'config.js must load V5.8C workspace shortcut');
assert(config.indexOf(mainLoader)>config.indexOf("'./v58b-teacher-workspace-consolidation.js'"),'V5.8C must load after accepted V5.8B');
assert(config.indexOf(shortcutLoader)>config.indexOf(mainLoader),'workspace shortcut must load after V5.8C report owner');

console.log('V5.8C Parent-Friendly Student Report regression: PASS');