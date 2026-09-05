const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'v59a4-student-home-concept-enrichment.js'),'utf8');
const config=fs.readFileSync(path.join(root,'config.js'),'utf8');

function assert(condition,message){ if(!condition) throw new Error(message); }
new vm.Script(source,{filename:'v59a4-student-home-concept-enrichment.js'});

assert(source.includes('V5.9A.4 — Student Home concept enrichment'),'missing V5.9A.4 identity');
assert(source.includes('v59a4-concept-richness'),'concept-richness body class missing');
assert(source.includes('premiumIcon(type)'),'premium Practice icon renderer missing');
assert(source.includes('v59a4-assignment-summary'),'rich assignment summary missing');
assert(source.includes('v59a4-status-pill'),'assignment status pill missing');
assert(source.includes('v59a4-rec-emblem'),'recommendation emblem missing');
assert(source.includes("paragraph.textContent = `${match[1]} questions ready`"),'recommendation student-facing count missing');
assert(source.includes('v59a4-earned-note'),'achievement earned message missing');
assert(source.includes('v59a4-trophy-art'),'class challenge trophy artwork missing');
assert(source.includes('Stronger together'),'cooperative class-challenge message missing');
assert(source.includes("icon.dataset.v59a4Premium === 'true'"),'Practice-icon mutation guard missing');

for(const forbidden of [
  'cloud.rpc(',
  'cloud.from(',
  'supabase.',
  'fetch(',
  'localStorage.',
  'sessionStorage.',
  'grade_practice_response',
  'request_practice_hint',
  'submit_practice_session',
  'finalize_exam_attempt',
  'create_teacher_past_paper_assignments',
  'update_teacher_past_paper_assignment',
  'studentPracticeRecommendationV35='
]) assert(!source.includes(forbidden),`V5.9A.4 must remain presentation-only: ${forbidden}`);

const loader="'./v59a4-student-home-concept-enrichment.js'";
assert(config.includes(loader),'config must load V5.9A.4');
assert(config.indexOf(loader)>config.indexOf("'./v59a3-student-home-layout-correction.js'"),'V5.9A.4 must load after V5.9A.3');

console.log('V5.9A.4 Student Home concept enrichment regression: PASS');
console.log('- richer Practice icons and dashboard visuals');
console.log('- assignment/recommendation presentation reuses rendered evidence');
console.log('- achievement and class challenge receive concept-style visual emphasis');
console.log('- no learning, grading, network or persistence authority added');