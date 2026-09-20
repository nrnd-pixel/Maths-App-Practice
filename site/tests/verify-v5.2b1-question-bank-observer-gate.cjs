const fs = require('fs');
const path = require('path');
const assert = require('assert');

const gatePath = path.join(__dirname,'..','v52b1-question-bank-observer-gate.js');
const loaderPath = path.join(__dirname,'..','v40-release.js');
const source = fs.readFileSync(gatePath,'utf8');
const loader = fs.readFileSync(loaderPath,'utf8');

assert(source.includes("id === 'questions-cards'"),'Historical Question Bank card classification must remain available for diagnostics');
assert(source.includes("id === 'questions-panel'"),'Historical Question Bank panel classification must remain available for diagnostics');
assert(source.includes("target === document.body"),'Historical correction-history body classification must remain available for diagnostics');
assert(source.includes("source.includes('renderSelectionState')"),'Historical B2D diagnostic classification must stay narrow');
assert(source.includes('__v52b1QuestionBankObserverGateRetired = true'),'Retirement marker must be explicit');
assert(source.includes('retired:true'),'Public API must expose retirement state');
assert(source.includes('suppressionActive:false'),'Public API must state that suppression is inactive');

assert(!source.includes('WrappedMutationObserver'),'Retired gate must not define a MutationObserver wrapper');
assert(!source.includes('ROOT.MutationObserver ='),'Retired gate must not replace the global MutationObserver constructor');
assert(!source.includes('nativeObserve'),'Retired gate must not intercept observer.observe()');
assert(!source.includes('data-v52b1-observer-gated'),'Retired gate must not mark DOM targets as suppressed');

const gateIndex = loader.indexOf("v52b1-question-bank-observer-gate.js?v=52b1-2");
const qaIndex = loader.indexOf("question-bank-selection-qa.js");
const performanceIndex = loader.indexOf("v52b1-question-bank-performance.js?v=52b1-3");
assert(gateIndex >= 0,'Compatibility shim must remain loaded');
assert(gateIndex < qaIndex,'Compatibility shim must keep its established loader position');
assert(performanceIndex > qaIndex,'Performance coordinator must still load after established Question Bank wrappers');
assert(loader.includes("'data-question-bank-audit-multipart'"),'Existing V5.1 multipart loader key must remain unchanged');

assert(!source.includes("cloud.from('questions')"),'Compatibility shim must not write question data');
assert(!source.includes('localStorage.setItem'),'Compatibility shim must not write local storage');
assert(!source.includes('get_student_questions'),'Compatibility shim must not alter student retrieval');
assert(!source.includes('grade_practice_response'),'Compatibility shim must not alter grading');
assert(!source.includes('exam_paper_settings'),'Compatibility shim must not alter Exam publication');
assert(!source.includes('storage.from'),'Compatibility shim must not alter Storage');

console.log('V5.2B.1 Question Bank observer-gate retirement shim checks passed.');
