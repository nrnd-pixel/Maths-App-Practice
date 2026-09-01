const fs = require('fs');
const path = require('path');
const assert = require('assert');

const modulePath = path.join(__dirname,'..','v54a1-compact-question-bank.js');
const performancePath = path.join(__dirname,'..','v52b1-question-bank-performance.js');
const source = fs.readFileSync(modulePath,'utf8');
const performance = require(performancePath);
const api = require(modulePath);

assert.strictEqual(api.normalizeView('compact'),'compact');
assert.strictEqual(api.normalizeView('detailed'),'detailed');
assert.strictEqual(api.normalizeView('anything'),'compact','Unknown view values must fail back to compact');

assert.strictEqual(performance.PAGE_SIZE,50,'V5.4A1 must preserve the accepted V5.2B.1 50-card rendering boundary');
assert(source.includes("setView('compact')"),'Compact Question Bank view must be the default');
assert(source.includes('data-v54a1-view="compact"'),'Compact view control must be present');
assert(source.includes('data-v54a1-view="detailed"'),'Detailed view control must be present');
assert(source.includes('.qcard-detail'),'Compact styling must target secondary question metadata');
assert(source.includes('display:none !important'),'Compact view must hide secondary metadata');
assert(source.includes('-webkit-line-clamp:2'),'Compact question text must be bounded to two lines');
assert(source.includes('question text, status and actions visible'),'Teacher-facing wording must explain what compact mode preserves');
assert(source.includes("html[data-theme=\"dark\"]"),'Question Bank view control must support dark mode');
assert(source.includes("document.getElementById('v52b1-question-pagination')"),'View controls must compose with the accepted Question Bank pager');

assert(!source.includes('new MutationObserver'),'V5.4A1 must not add a permanent Question Bank observer');
assert(!source.includes('renderQuestions=function'),'V5.4A1 must not replace the accepted V5.2B.1 renderer');
assert(!source.includes("cloud.from('questions')"),'V5.4A1 must not write or refetch question data');
assert(!source.includes('localStorage.setItem'),'V5.4A1 must not persist teacher state');
assert(!source.includes('get_student_'),'V5.4A1 must not alter student retrieval');
assert(!source.includes('grade_practice_response'),'V5.4A1 must not alter grading');
assert(!source.includes('exam_paper_settings'),'V5.4A1 must not alter Exam publication');
assert(!source.includes('practice_eligible ='),'V5.4A1 must not alter Practice eligibility');

console.log('V5.4A1 compact Question Bank checks passed.');
