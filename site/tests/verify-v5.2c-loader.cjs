const fs=require('fs');
const path=require('path');
const assert=require('assert');

const loader=fs.readFileSync(path.join(__dirname,'..','v40-release.js'),'utf8');

const existingKeys=[
  "loadScriptOnce('v51-exam-publication-ui-polish.js?v=51b3-ui-3', 'data-v51-exam-publication-ui-polish')",
  "loadScriptOnce('v52-teacher-topical-library.js?v=52b-1', 'data-v52b-teacher-topical-library')",
  "loadScriptOnce('v52b1-question-bank-performance.js?v=52b1-2', 'data-v52b1-question-bank-performance')"
];
for(const line of existingKeys) assert(loader.includes(line),`Existing stable loader entry changed: ${line}`);

const publication="loadScriptOnce('v52c-topical-publication.js?v=52c-1', 'data-v52c-topical-publication')";
const student="loadScriptOnce('v52c-student-topical-library.js?v=52c-1', 'data-v52c-student-topical-library')";
const hint="loadScriptOnce('v52c-topical-hint-bridge.js?v=52c-1', 'data-v52c-topical-hint-bridge')";
assert(loader.includes(publication),'V5.2C teacher publication loader missing');
assert(loader.includes(student),'V5.2C student topical library loader missing');
assert(loader.includes(hint),'V5.2C hint bridge loader missing');
assert(loader.indexOf(publication)<loader.indexOf(student),'Teacher publication should load before student topical mode');
assert(loader.indexOf(student)<loader.indexOf(hint),'Hint bridge must load after student topical engine');

console.log('V5.2C loader preservation checks passed.');
