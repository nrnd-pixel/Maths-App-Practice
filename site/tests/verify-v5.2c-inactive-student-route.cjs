const fs=require('fs');
const path=require('path');
const assert=require('assert');
const sql=fs.readFileSync(path.join(__dirname,'..','..','supabase','v52c_student_topical_practice_library.sql'),'utf8');
assert(sql.includes("q.source_type='topical_exercise'"),'Student topical retrieval must require topical source type');
assert(sql.includes('and q.active=false'),'Student topical retrieval must use inactive topical rows');
assert(sql.includes("'active',false"),'Student topical payload must not masquerade as an active ordinary Practice row');
console.log('V5.2C inactive student route checks passed.');
