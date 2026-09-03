const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const site=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');

const config=read('config.js');
const feedbackSource=read('v576-classroom-feedback-support.js');
const teacherIconSource=read('v5763-teacher-feedback-header-icon.js');

new vm.Script(teacherIconSource,{filename:'v5763-teacher-feedback-header-icon.js'});

// V5.7.6.3 is a presentation-only layer after the accepted feedback workflow.
assert.match(config,/\.\/v576-classroom-feedback-support\.js'[\s\S]*\.\/v5761-feedback-trigger-position\.js'[\s\S]*\.\/v5763-teacher-feedback-header-icon\.js'/);
assert.match(teacherIconSource,/__v5763TeacherFeedbackHeaderIconInstalled/);
assert.match(teacherIconSource,/const SOURCE_ID='v576-feedback-inbox'/);
assert.match(teacherIconSource,/const ICON_ID='v5763-teacher-feedback-icon'/);
assert.match(teacherIconSource,/const TITLE_BLOCK_SELECTOR='#teacher > \.header > div:first-child'/);
assert.match(teacherIconSource,/Teacher Dashboard/i);

// Present a compact icon beside the Teacher Dashboard title and hide the old full-size source button.
assert.match(teacherIconSource,/grid-template-areas:'title feedback' 'subtitle subtitle'/);
assert.match(teacherIconSource,/v5763-feedback-source\{display:none!important\}/);
assert.match(teacherIconSource,/icon\.textContent='💬'/);
assert.match(teacherIconSource,/aria-label','Feedback Inbox'/);
assert.match(teacherIconSource,/title','Feedback Inbox'/);
assert.match(teacherIconSource,/border-radius:50%/);
assert.match(teacherIconSource,/titleBlock\.appendChild\(icon\)/);

// The icon proxies the accepted V5.7.6 Inbox instead of duplicating or moving its workflow.
assert.match(feedbackSource,/const TEACHER_TRIGGER_ID='v576-feedback-inbox'/);
assert.match(feedbackSource,/button\.textContent='💬 Feedback Inbox'/);
assert.match(teacherIconSource,/currentSource\.click\(\)/);
assert.match(teacherIconSource,/openTeacherFeedback/);
assert.doesNotMatch(teacherIconSource,/titleBlock\.appendChild\(source\)|insertAdjacentElement\([^\n]*source/,'V5.7.6.3 must not reparent the original Feedback Inbox trigger.');

// Header-position polish must remain presentation-only.
assert.doesNotMatch(teacherIconSource,/cloud\.rpc\(|cloud\.from\(|supabase|fetch\(/i,'Teacher header icon polish must not make network/data calls.');
assert.doesNotMatch(teacherIconSource,/grade_practice_response|request_practice_hint|finalize_exam_attempt|submit_practice_session|save_exam_attempt/,'Teacher header icon polish must not touch learning or Exam authority.');

console.log('V5.7.6.3 Teacher Feedback Header Icon checks passed.');
console.log('- teacher Feedback Inbox is represented by a compact icon beside Teacher Dashboard');
console.log('- original V5.7.6 inbox trigger is hidden but remains the workflow owner');
console.log('- no extra RPC, polling, database write, grading or Exam behavior is introduced');