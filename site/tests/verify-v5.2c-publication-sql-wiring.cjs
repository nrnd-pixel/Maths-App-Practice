const fs=require('fs');
const path=require('path');
const assert=require('assert');

const record=fs.readFileSync(path.join(__dirname,'..','DATABASE-MIGRATIONS-V5.2.txt'),'utf8');
assert(record.includes('20260830094514 v52c_student_topical_practice_library'),'V5.2C foundation migration must be recorded');
assert(record.includes('20260830111213 v52c_topical_hint_guard'),'V5.2C hint guard migration must be recorded');
assert(record.includes('0 topical rows active'),'Migration record must preserve the inactive topical safety state');
assert(record.includes('0 student-visible sets'),'Migration record must preserve zero-exposure initial state');
assert(record.includes('request_practice_hint_v3, grade_practice_response_v3 and submit_practice_session_v3 unchanged'),'Migration record must state ordinary Practice RPCs remain unchanged');
console.log('V5.2C migration record checks passed.');
