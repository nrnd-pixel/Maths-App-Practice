const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname,'..','..');
const sql = fs.readFileSync(path.join(root,'supabase','v53d5_1_cleanup_abandoned_selection_profile.sql'),'utf8');
const d5 = fs.readFileSync(path.join(root,'site','v53d5-practice-selection-intelligence.js'),'utf8');

assert(
  /drop\s+function\s+if\s+exists\s+public\.get_student_practice_selection_profile_v53d5\s*\(text\)\s*;/i.test(sql),
  'Cleanup migration must drop the abandoned V5.3D5 profile RPC by exact signature'
);
assert(
  !d5.includes('get_student_practice_selection_profile_v53d5'),
  'Accepted V5.3D5 browser code must not depend on the abandoned profile RPC'
);
assert(
  d5.includes("previousRpc('get_student_practice_recommendation'"),
  'Accepted V5.3D5 must continue to reuse the V5.3D4 recommendation contract'
);

console.log('V5.3D5.1 abandoned selection-profile RPC cleanup regression: PASS');
