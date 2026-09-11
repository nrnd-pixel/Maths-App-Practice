'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const SITE=path.join(ROOT,'site');
const read=name=>fs.readFileSync(path.join(SITE,name),'utf8');

const release=read('v40-release.js');
const reporting=read('teacher-reporting.js');
const operations=read('teacher-launch-operations.js');
const audit=read('release-audit-ui.js');

// Phase 5A: source-body concat checks against the deleted V50 files removed.
// The consolidated owners still carry all required content, verified below.

new vm.Script(reporting,{filename:'teacher-reporting.js'});
new vm.Script(operations,{filename:'teacher-launch-operations.js'});
new vm.Script(audit,{filename:'release-audit-ui.js'});

const ordered=[
  "loadScriptOnce('v50-student-progress-overview.js?v=50b3-1', 'data-v50-student-progress-overview')",
  "loadScriptOnce('v50-accessibility-polish.js?v=50b4a-1', 'data-v50-accessibility-polish')",
  "loadScriptOnce('teacher-reporting.js', 'data-teacher-reporting')",
  "loadScriptOnce('teacher-launch-operations.js', 'data-teacher-launch-operations')",
  "loadScriptOnce('v52-topical-exercise-foundation.js?v=52a-1', 'data-v52a-topical-exercise-foundation')",
  "loadScriptOnce('v52b1-question-bank-observer-gate.js?v=52b1-2', 'data-v52b1-question-bank-observer-gate')",
  "loadScriptOnce('v50-security-hardening.js?v=50rc2-1', 'data-v50-security-hardening')",
  "loadScriptOnce('release-audit-ui.js', 'data-release-audit-ui')"
];
let last=-1;
for(const token of ordered){
  const index=release.indexOf(token);
  assert.ok(index>last,`${token} must remain loaded once in the approved phase order`);
  assert.equal(release.indexOf(token,index+1),-1,`${token} must not be duplicated`);
  last=index;
}

const retired=['v50-teacher-class-report.js','v50-teacher-student-report.js','v50-reporting-export.js',
  'v50-report-archive.js','v50-student-launch-readiness.js','v50-teacher-operations.js','v50-roster-edit.js',
  'v50-production-polish.js','v50-release-audit.js','v50-rc2-empty-result-code-polish.js','v50-release-audit-rc3.js'];
for(const r of retired){
  assert.ok(!release.includes(`loadScriptOnce('${r}`),`${r} must remain dormant/reference only`);
}

assert.match(reporting,/Object\.defineProperty\(window,'V50ReportingExport'/);
for(const api of ['buildClassSnapshot','buildStudentSnapshot','downloadSnapshot','makeCsv']) assert.match(reporting,new RegExp(`\\b${api}\\b`));
for(const id of ['v50c1-open-class-report','v50c2-open-student-report','v50c2-student-report-overlay','v50c3a-export-class-csv','v50c3a-export-student-csv','report-archive-panel']) assert.ok(reporting.includes(id),`${id} must remain a reporting DOM/API contract`);
for(const id of ['teacher-operations-panel','launch-readiness-panel']) assert.ok(operations.includes(id),`${id} must remain an operations DOM contract`);
assert.ok(operations.includes("const CONFIRM_PHRASE = 'RESET STUDENT ACTIVITY'"),'D1 exact reset confirmation phrase must remain unchanged');
assert.match(operations,/transfer_roster_student_v50d2[^]*p_confirm:false/);
assert.match(operations,/transfer_roster_student_v50d2[^]*p_confirm:true/);
assert.match(operations,/manage_teacher_assignment_v50d2[^]*p_action:'delete',p_confirm:false/);
assert.match(operations,/manage_teacher_assignment_v50d2[^]*p_action:'delete',p_confirm:true/);
assert.ok(operations.indexOf('V50ReportingExport')<operations.indexOf('/* V5.0D2 — Teacher Operational Tools.'),'D1 -> C3A dependency must remain before D2 section');
assert.ok(operations.indexOf('/* V5.0 launch roster maintenance')>operations.indexOf('/* V5.0D2 — Teacher Operational Tools.'),'Roster Edit must remain after D2');
assert.match(audit,/Object\.defineProperty\(window,'V50ProductionPolish'/);
assert.ok(audit.includes('v50rc3-production-polish-updated'),'production-polish update event must remain exact');
assert.ok(audit.indexOf('V50ProductionPolish')<audit.lastIndexOf('V50ProductionPolish'),'RC3 must continue consuming Production Polish after its owner installs');

const security=read('v50-security-hardening.js');
assert.match(security,/window\.refreshStudentAssignmentAccess = secureExamAccessNote/);
assert.doesNotMatch(reporting,/refreshStudentAssignmentAccess\s*=/);
assert.doesNotMatch(operations,/refreshStudentAssignmentAccess\s*=/);
assert.doesNotMatch(audit,/refreshStudentAssignmentAccess\s*=/);

console.log('Phase 4 V50 operations/reporting integrity passed: loader topology, APIs, DOM contracts and ownership boundaries preserved.');
