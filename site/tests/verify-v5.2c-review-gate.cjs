const fs=require('fs');
const path=require('path');
const assert=require('assert');
const sql=fs.readFileSync(path.join(__dirname,'..','..','supabase','v52c_student_topical_practice_library.sql'),'utf8');
assert(sql.includes("coalesce(review_status,'none') <> 'reviewed'"),'Readiness must count all non-reviewed rows as blockers');
assert(sql.includes("v_review_blockers = 0"),'Set cannot become ready while any review blockers remain');
assert(sql.includes("and coalesce(q.review_status,'none')='reviewed'"),'Student retrieval must return only reviewed rows');
console.log('V5.2C review gate checks passed.');
