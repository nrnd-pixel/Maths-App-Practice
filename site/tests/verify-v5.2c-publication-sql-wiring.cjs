const fs=require('fs');
const path=require('path');
const assert=require('assert');

const record=fs.readFileSync(path.join(__dirname,'..','..','CHANGELOG.md'),'utf8');
assert(record.includes('20260830094514 v52c_student_topical_practice_library'),'V5.2C foundation migration must be recorded');
assert(record.includes('20260830111213 v52c_topical_hint_guard'),'V5.2C hint guard migration must be recorded');
assert(record.includes('0 active topical rows'),'Migration record must preserve the inactive topical safety state');
assert(record.includes('student-visible set count 0'),'Migration record must preserve zero-exposure initial state');
assert(record.includes('Ordinary Practice RPCs remained unchanged.'),'Migration record must state ordinary Practice RPCs remain unchanged');
console.log('V5.2C migration record checks passed from CHANGELOG.md.');
