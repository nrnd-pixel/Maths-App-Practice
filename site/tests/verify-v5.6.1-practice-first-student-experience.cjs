const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');

const source = read('v561-practice-first-student-experience.js');
const config = read('config.js');
const release = read('v40-release.js');
const index = read('index.html');

new vm.Script(source,{filename:'v561-practice-first-student-experience.js'});
const api = require(path.join(site,'v561-practice-first-student-experience.js'));

assert.equal(api.PRACTICE_NOTE,'Practice Mode is active. Choose Mixed, Topic or Past Paper Practice below.');
assert.equal(typeof api.apply,'function');
assert.equal(typeof api.isPracticeFirst,'function');

// Student entry is intentionally Practice-first.
assert.match(source,/__v561PracticeFirstStudentExperienceInstalled/);
assert.match(source,/#start \.mode-switch\{display:none!important\}/);
assert.match(source,/#exam-mode-btn/);
assert.match(source,/#v51c1-exam-paper-library/);
assert.match(source,/#v51c2-exam-resume-status/);
assert.match(source,/setStartMode\('practice'\)/);
assert.match(source,/target\.closest\('#start-btn'\)/);
assert.match(source,/Start Practice/);
assert.match(source,/Practice-first rollout:/);
assert.match(source,/Existing Exam data and teacher publication controls are retained/);

// Both original mode controls still exist in the base UI; V5.6.1 hides rather than deletes Exam.
assert.match(index,/id="practice-mode-btn"/);
assert.match(index,/id="exam-mode-btn"/);

// Exam infrastructure remains loaded as a rollback boundary.
assert.match(release,/v51-exam-publication-safety\.js/);
assert.match(release,/v51-exam-publication-ui-polish\.js/);
assert.match(release,/student-exam-ui\.js/);
assert.match(release,/student-exam-ui\.js/);

// The stable V5.6 checkpoint stays intact and the reversible patch loads after it.
const stableIndex = config.indexOf("'./v56-stable-release-checkpoint.js'");
const patchIndex = config.indexOf("'./v561-practice-first-student-experience.js'");
assert.ok(stableIndex >= 0,'V5.6 stable checkpoint must remain loaded');
assert.ok(patchIndex > stableIndex,'V5.6.1 must load after the V5.6 stable checkpoint');

// V5.6.1 is presentation/navigation only.
assert.doesNotMatch(source,/cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(|fetch\(/);
assert.doesNotMatch(source,/localStorage|sessionStorage/);
assert.doesNotMatch(source,/MutationObserver/);
assert.doesNotMatch(source,/insert\(|update\(|delete\(|upsert\(/);
assert.doesNotMatch(source,/grade_practice_response|finalize_exam_attempt|save_exam_attempt|submit_practice_session/i);
assert.doesNotMatch(source,/document\.title\s*=|Version 5\.6\.1/,
  'Patch should retain the accepted V5.6 stable release identity rather than rewrite it.');

console.log('V5.6.1 Practice-first student experience regression passed.');
console.log('- student Exam entry hidden while Practice remains the enforced Start mode');
console.log('- Exam engine/publication/history code retained for later restoration');
console.log('- no database, grading, auth or Exam-data mutation added');
