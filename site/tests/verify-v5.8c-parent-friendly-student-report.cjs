const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'v58c-parent-friendly-student-report.js'),'utf8');
const shortcut=fs.readFileSync(path.join(root,'v58c-parent-summary-workspace-shortcut.js'),'utf8');
const config=fs.readFileSync(path.join(root,'config.js'),'utf8');
const reportingOwner=fs.readFileSync(path.join(root,'teacher-reporting.js'),'utf8');
const workspace=fs.readFileSync(path.join(root,'v58b-teacher-workspace-consolidation.js'),'utf8');
const productionBundle=fs.readFileSync(path.join(root,'v58c-parent-summary-presentation-bundle.js'),'utf8');
const phase7bManifest=JSON.parse(fs.readFileSync(path.resolve(root,'..','tooling','phase7b','loader-manifest.json'),'utf8'));

function assert(condition,message){ if(!condition) throw new Error(message); }
new vm.Script(source,{filename:'v58c-parent-friendly-student-report.js'});
new vm.Script(shortcut,{filename:'v58c-parent-summary-workspace-shortcut.js'});
new vm.Script(reportingOwner,{filename:'teacher-reporting.js'});
new vm.Script(productionBundle,{filename:'v58c-parent-summary-presentation-bundle.js'});

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

const bundleLoader="'./v58c-parent-summary-presentation-bundle.js'";
assert(config.includes(bundleLoader),'config.js must load the generated V5.8C production bundle');
assert(!config.includes("'./v58c-parent-friendly-student-report.js'"),'canonical V5.8C report source must not load directly after bundle promotion');
assert(!config.includes("'./v58c-parent-summary-workspace-shortcut.js'"),'canonical V5.8C shortcut source must not load directly after bundle promotion');
assert(config.indexOf(bundleLoader)>config.indexOf("'./v58ab-first-use-workspace-bundle.js'"),'V5.8C bundle must load after accepted V5.8A/V5.8B production bundle');
assert(config.indexOf("'./v58d-content-workflow-consolidation.js'")>config.indexOf(bundleLoader),'V5.8D must load after the V5.8C production bundle');

const contract=phase7bManifest.generatedBundles.find(entry=>entry.path==='site/v58c-parent-summary-presentation-bundle.js');
assert(contract,'missing V5.8C generated bundle contract');
assert(JSON.stringify(contract.inputs)===JSON.stringify([
  'site/v58c-parent-friendly-student-report.js',
  'site/v58c-parent-summary-workspace-shortcut.js'
]),'V5.8C generated bundle input order changed');
for(const sourceOnly of contract.inputs){
  const entry=phase7bManifest.sourceOnly.find(item=>item.path===sourceOnly);
  assert(entry && entry.reason.includes('v58c-parent-summary-presentation-bundle.js'),'V5.8C canonical input must remain reviewed source-only');
}
for(const forbidden of [
  /cloud\.rpc\(/i,/cloud\.from\(/i,/fetch\(/i,/localStorage/i,/sessionStorage/i,
  /grade_practice_response/i,/request_practice_hint/i,/submit_practice_session/i,/finalize_exam_attempt/i,
  /create_teacher_past_paper_assignments/i
]){
  assert(!forbidden.test(productionBundle),`V5.8C production bundle introduced forbidden authority: ${forbidden}`);
}

console.log('V5.8C Parent-Friendly Student Report regression: PASS');