const fs = require('fs');
const path = require('path');
const assert = require('assert');

const gatePath = path.join(__dirname,'..','v52b1-question-bank-observer-gate.js');
const loaderPath = path.join(__dirname,'..','v40-release.js');
const source = fs.readFileSync(gatePath,'utf8');
const loader = fs.readFileSync(loaderPath,'utf8');

assert(source.includes("id === 'questions-cards'"),'Question-card mutation observers must be gated');
assert(source.includes("id === 'questions-panel'"),'Broad Question Bank panel observer must be gated');
assert(source.includes("target === document.body"),'The correction-history body observer must be recognized');
assert(source.includes("source.includes('renderSelectionState')"),'Only the known correction-history body observer may be suppressed');
assert(source.includes('return nativeObserve(target,options)'),'Unrelated MutationObservers must remain native');
assert(source.includes("data-v52b1-observer-gated"),'Gated targets must expose a diagnostic marker');

const gateIndex = loader.indexOf("v52b1-question-bank-observer-gate.js?v=52b1-2");
const qaIndex = loader.indexOf("question-bank-selection-qa.js");
const performanceIndex = loader.indexOf("v52b1-question-bank-performance.js?v=52b1-3");
assert(gateIndex >= 0,'Observer gate must be loaded');
assert(gateIndex < qaIndex,'Observer gate must load before Question Bank modules register observers');
assert(performanceIndex > qaIndex,'Performance coordinator must still load after established Question Bank wrappers');
assert(loader.includes("'data-question-bank-audit-multipart'"),'Existing V5.1 multipart loader key must remain unchanged');

assert(!source.includes("cloud.from('questions')"),'Observer gate must not write question data');
assert(!source.includes('localStorage.setItem'),'Observer gate must not write local storage');
assert(!source.includes('get_student_questions'),'Observer gate must not alter student retrieval');
assert(!source.includes('grade_practice_response'),'Observer gate must not alter grading');
assert(!source.includes('exam_paper_settings'),'Observer gate must not alter Exam publication');
assert(!source.includes('storage.from'),'Observer gate must not alter Storage');

console.log('V5.2B.1 Question Bank observer-gate checks passed.');
