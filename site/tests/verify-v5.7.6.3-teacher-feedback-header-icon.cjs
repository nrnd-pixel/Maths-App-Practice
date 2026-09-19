const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const site=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');

const config=read('config.js');
const feedbackSource=read('v576-classroom-feedback-support.js');
const teacherIconSource=read('v5763-teacher-feedback-header-icon.js');
const productionBundle=read('v576-feedback-presentation-bundle.js');
const phase7bManifest=JSON.parse(fs.readFileSync(path.resolve(site,'..','tooling','phase7b','loader-manifest.json'),'utf8'));

new vm.Script(teacherIconSource,{filename:'v5763-teacher-feedback-header-icon.js'});

// V5.7.6.3 remains a presentation-only layer after the accepted feedback workflow.
assert.match(config,/\.\/v576-classroom-feedback-support\.js',\s*'\.\/v576-feedback-presentation-bundle\.js',\s*'\.\/v58ab-first-use-workspace-bundle\.js'/);
assert.doesNotMatch(config,/\.\/v5761-feedback-trigger-position\.js'|\.\/v5763-teacher-feedback-header-icon\.js'/,
  'Canonical V5761/V5763 sources must be source-only after bundle promotion.');
const v576Inputs=[
  'site/v5761-feedback-trigger-position.js',
  'site/v5763-teacher-feedback-header-icon.js'
];
assert.deepEqual(
  phase7bManifest.sourceOnly.filter(entry=>v576Inputs.includes(entry.path)).map(entry=>entry.path),
  v576Inputs,
  'V576 canonical inputs must remain source-only in reviewed build order.'
);
const v576Bundle=phase7bManifest.generatedBundles.find(entry=>entry.path==='site/v576-feedback-presentation-bundle.js');
assert(v576Bundle,'V576 generated production bundle contract missing.');
assert.deepEqual(v576Bundle.inputs,v576Inputs,'V576 generated bundle input order changed.');
assert.match(productionBundle,/__v5761FeedbackTriggerPositionInstalled/);
assert.match(productionBundle,/__v5763TeacherFeedbackHeaderIconInstalled/);
assert.match(teacherIconSource,/__v5763TeacherFeedbackHeaderIconInstalled/);
assert.match(teacherIconSource,/const SOURCE_ID='v576-feedback-inbox'/);
assert.match(teacherIconSource,/const ICON_ID='v5763-teacher-feedback-icon'/);
assert.match(teacherIconSource,/const TOOLBAR_SELECTOR='#teacher > \.header > \.toolbar'/);
assert.match(teacherIconSource,/const PRIMARY_GROUP_ID='v5763-teacher-primary-actions'/);
assert.match(teacherIconSource,/const ACCOUNT_GROUP_ID='v5763-teacher-account-actions'/);

// Desktop: Feedback is a normal teacher utility action, with account controls intentionally grouped.
assert.match(teacherIconSource,/grid-template-columns:minmax\(230px,\.8fr\) minmax\(0,1\.4fr\)/);
assert.match(teacherIconSource,/v5763-teacher-toolbar/);
assert.match(teacherIconSource,/moveInto\(document\.getElementById\('teacher-mode'\),primary\)/);
assert.match(teacherIconSource,/moveInto\(document\.getElementById\('refresh-btn'\),primary\)/);
assert.match(teacherIconSource,/moveInto\(toolbar\.querySelector\('\.back-home'\),primary\)/);
assert.match(teacherIconSource,/moveInto\(document\.getElementById\('change-password-btn'\),account\)/);
assert.match(teacherIconSource,/moveInto\(document\.getElementById\('signout-btn'\),account\)/);
assert.match(teacherIconSource,/v5763-feedback-label">Feedback</);
assert.match(teacherIconSource,/home\.insertAdjacentElement\('beforebegin',icon\)/);

// Mobile: preserve an easy touch target while collapsing the text label to the chat symbol.
assert.match(teacherIconSource,/@media\(max-width:520px\)/);
assert.match(teacherIconSource,/width:42px;height:42px;min-width:42px;min-height:42px/);
assert.match(teacherIconSource,/\.v5763-feedback-label\{display:none\}/);
assert.match(teacherIconSource,/aria-label','Feedback Inbox'/);
assert.match(teacherIconSource,/title','Feedback Inbox'/);

// The toolbar action proxies the accepted V5.7.6 Inbox instead of duplicating its workflow.
assert.match(feedbackSource,/const TEACHER_TRIGGER_ID='v576-feedback-inbox'/);
assert.match(feedbackSource,/button\.textContent='💬 Feedback Inbox'/);
assert.match(teacherIconSource,/v5763-feedback-source\{display:none!important\}/);
assert.match(teacherIconSource,/currentSource\.click\(\)/);
assert.match(teacherIconSource,/openTeacherFeedback/);
assert.doesNotMatch(teacherIconSource,/appendChild\(source\)|insertAdjacentElement\([^\n]*source/,'V5.7.6.3 must not reparent the original Feedback Inbox trigger.');

// Toolbar polish must remain presentation-only.
assert.doesNotMatch(teacherIconSource,/cloud\.rpc\(|cloud\.from\(|supabase|fetch\(/i,'Teacher toolbar polish must not make network/data calls.');
assert.doesNotMatch(teacherIconSource,/grade_practice_response|request_practice_hint|finalize_exam_attempt|submit_practice_session|save_exam_attempt/,'Teacher toolbar polish must not touch learning or Exam authority.');
assert.doesNotMatch(productionBundle,/cloud\.rpc\(|cloud\.from\(|fetch\(|grade_practice_response|request_practice_hint|finalize_exam_attempt|submit_practice_session|save_exam_attempt|create_teacher_past_paper_assignments/i,
  'Generated V576 presentation successor must not introduce network, learning, Exam or assignment authority.');

console.log('V5.7.6.3 Teacher Feedback Toolbar checks passed.');
console.log('- desktop Feedback is grouped with Refresh and Home as a normal utility action');
console.log('- Change Password and Sign Out stay together as account actions');
console.log('- mobile Feedback collapses to an accessible 42px chat button');
console.log('- original V5.7.6 inbox remains the workflow owner with no new network/data calls');
console.log('- generated production bundle is the sole loader successor for the two canonical presentation sources');
