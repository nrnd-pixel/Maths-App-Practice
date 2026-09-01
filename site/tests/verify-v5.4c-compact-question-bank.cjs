const fs = require('fs');
const path = require('path');
const assert = require('assert');

const modulePath = path.join(__dirname,'..','v54c-compact-question-bank.js');
const performancePath = path.join(__dirname,'..','v52b1-question-bank-performance.js');
const visibilityPath = path.join(__dirname,'..','v54a-resource-bank-visibility.js');
const controlsPath = path.join(__dirname,'..','v54b-practice-eligibility-controls.js');
const releasePath = path.join(__dirname,'..','v40-release.js');

const source = fs.readFileSync(modulePath,'utf8');
const visibility = fs.readFileSync(visibilityPath,'utf8');
const controls = fs.readFileSync(controlsPath,'utf8');
const release = fs.readFileSync(releasePath,'utf8');
const performance = require(performancePath);
const api = require(modulePath);

assert.strictEqual(api.normalizeView('compact'),'compact');
assert.strictEqual(api.normalizeView('detailed'),'detailed');
assert.strictEqual(api.normalizeView('anything'),'compact','Unknown view values must fail back to compact');
assert.strictEqual(performance.PAGE_SIZE,50,'V5.4C must preserve the accepted V5.2B.1 50-card rendering boundary');

assert(source.includes("let selectedView = 'compact'"),'Compact Question Bank view must be the default');
assert(source.includes('data-v54c-view="compact"'),'Compact view control must be present');
assert(source.includes('data-v54c-view="detailed"'),'Detailed view control must be present');
assert(source.includes('.qcard-detail'),'Compact styling must target secondary question metadata');
assert(source.includes('display:none !important'),'Compact view must hide secondary metadata');
assert(source.includes('-webkit-line-clamp:2'),'Compact question text must be bounded to two lines');
assert(source.includes('Practice status and actions visible'),'Teacher-facing wording must explain what compact mode preserves');
assert(source.includes('v54b-eligibility-feedback'),'V5.4C controls must compose after the V5.4B teacher feedback surface when available');
assert(source.includes('v54a-resource-bank-summary'),'V5.4C controls must compose with the V5.4A resource-bank summary');
assert(source.includes('html[data-theme="dark"]'),'Question Bank view control must support dark mode');

assert(!/\.qcard-actions[^}]*display\s*:\s*none/i.test(source),'V5.4C must keep all card actions visible');
assert(!/\.qcard-meta[^}]*display\s*:\s*none/i.test(source),'V5.4C must keep Practice/resource status badges visible');
assert(!source.includes('new MutationObserver'),'V5.4C must not add a permanent Question Bank observer');
assert(!source.includes('renderQuestions=function'),'V5.4C must not replace the accepted renderer chain');
assert(!source.includes("cloud.from('questions')"),'V5.4C must not write or refetch question data');
assert(!source.includes('cloud.rpc('),'V5.4C must not call database RPCs');
assert(!source.includes('localStorage.setItem'),'V5.4C must not persist teacher state');
assert(!source.includes('get_student_'),'V5.4C must not alter student retrieval');
assert(!source.includes('grade_practice_response'),'V5.4C must not alter grading');
assert(!source.includes('exam_paper_settings'),'V5.4C must not alter Exam publication');
assert(!source.includes('practice_eligible ='),'V5.4C must not alter Practice eligibility');

assert(visibility.includes('.qcard-meta'),'V5.4A Practice resource status must remain in card metadata');
assert(visibility.includes('v54a-resource-badge'),'V5.4A Practice resource badge must remain available');
assert(controls.includes('.qcard-actions'),'V5.4B Practice eligibility controls must remain in card actions');
assert(controls.includes('v54b-practice-toggle'),'V5.4B Add/Remove Practice buttons must remain available');

const a = release.indexOf("v54a-resource-bank-visibility.js?v=54a3-2");
const b = release.indexOf("v54b-practice-eligibility-controls.js?v=54b-1");
const c = release.indexOf("v54c-compact-question-bank.js?v=54c-1");
assert(a >= 0 && b > a && c > b,'Release loader must preserve V5.4A → V5.4B → V5.4C composition order');

console.log('V5.4C compact Question Bank checks passed.');
