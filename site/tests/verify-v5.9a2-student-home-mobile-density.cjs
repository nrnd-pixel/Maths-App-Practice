const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'v59a2-student-home-mobile-density.js'),'utf8');
const config=fs.readFileSync(path.join(root,'config.js'),'utf8');
const base=fs.readFileSync(path.join(root,'v59a-student-home-refresh.js'),'utf8');
const design=fs.readFileSync(path.join(root,'v59a1-student-home-design-system.js'),'utf8');

function assert(condition,message){ if(!condition) throw new Error(message); }
new vm.Script(source,{filename:'v59a2-student-home-mobile-density.js'});

assert(source.includes('V5.9A.2 — Student Home mobile-density and hierarchy pass'),'missing V5.9A.2 identity');
assert(source.includes('__v59a2StudentHomeMobileDensityInstalled'),'missing install guard');
assert(source.includes("const BODY_CLASS = 'v59a2-mobile-density'"),'missing mobile-density body class');
assert(source.includes('.v59a1-recent-card{display:none!important}'),'Recent Practice must leave the Home dashboard');
assert(source.includes('#v573-class-challenge-card{grid-column:1/-1!important;order:60!important'),'Class Challenge must be full width after motivation widgets');
assert(source.includes('#v572-weekly-missions-card{grid-column:1!important;order:50!important'),'Weekly Missions must occupy first motivation column');
assert(source.includes('#v571b-latest-achievement{grid-column:2!important;order:50!important'),'Latest Badge must occupy second motivation column');
assert(source.includes('#start .v39-teacher-zone') && source.includes('#start > .info{display:none!important}'),'student mobile Home must hide teacher/release infrastructure');
assert(source.includes('.v572-mission:not(:first-child){display:none!important}'),'Weekly Missions must compact to one primary mission on Home');
assert(source.includes('.v571b-achievement-meta{display:none!important}'),'Latest Badge must remove metadata chip overload on mobile');
assert(source.includes('#v59a-mobile-nav{height:76px!important'),'bottom navigation density rule missing');
assert(source.includes('html[data-theme="dark"] body.${BODY_CLASS}'),'cohesive dark variant missing');
assert(source.includes('@media(max-width:760px)'),'mobile density breakpoint missing');
assert(source.includes('@media(max-width:390px)'),'small-phone breakpoint missing');
assert(source.includes('@media(max-width:330px)'),'very-small-phone fallback missing');

assert(base.includes("const MOBILE_NAV_ID = 'v59a-mobile-nav'"),'accepted V5.9A mobile nav owner missing');
assert(design.includes("const POLISH_CLASS = 'v59a1-design-system'"),'accepted V5.9A.1 design-system owner missing');

for(const forbidden of [
  'cloud.rpc(',
  'cloud.from(',
  'supabase.',
  'fetch(',
  'localStorage',
  'sessionStorage',
  'grade_practice_response',
  'request_practice_hint',
  'submit_practice_session',
  'finalize_exam_attempt',
  'startPractice(',
  'create_teacher_past_paper_assignments',
  'update_teacher_past_paper_assignment',
  'save_question_practice_eligibility',
  'MutationObserver'
]){
  assert(!source.includes(forbidden),`mobile-density layer must remain presentation-only: ${forbidden}`);
}

const baseLoader="'./v59a-student-home-refresh.js'";
const designLoader="'./v59a1-student-home-design-system.js'";
const densityLoader="'./v59a2-student-home-mobile-density.js'";
assert(config.includes(densityLoader),'config must load V5.9A.2');
assert(config.indexOf(densityLoader)>config.indexOf(designLoader),'V5.9A.2 must load after V5.9A.1');
assert(config.indexOf(designLoader)>config.indexOf(baseLoader),'V5.9A.1 must remain after base V5.9A');
assert(config.includes('V5.9A.2 tightens the real-device mobile hierarchy'),'release narrative must document real-device refinement');

console.log('V5.9A.2 Student Home mobile-density regression: PASS');
console.log('- real-phone profile, hero and quick-action density tightened');
console.log('- Assignments/Recommendation and Missions/Badge keep two-column hierarchy');
console.log('- Class Challenge is forced full-width after motivation widgets');
console.log('- Recent Practice, teacher access and release note leave the normal mobile Home');
console.log('- coherent dark variant and compact bottom navigation included');
console.log('- no network, persistence, grading or learning-rule authority added');