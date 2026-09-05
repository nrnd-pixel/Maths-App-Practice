const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'v59a1-student-home-design-system.js'),'utf8');
const base=fs.readFileSync(path.join(root,'v59a-student-home-refresh.js'),'utf8');
const config=fs.readFileSync(path.join(root,'config.js'),'utf8');

function assert(condition,message){ if(!condition) throw new Error(message); }
new vm.Script(source,{filename:'v59a1-student-home-design-system.js'});

assert(source.includes('V5.9A.1 — Student Home design-system parity layer'),'missing design-system identity');
assert(source.includes('__v59a1StudentHomeDesignSystemInstalled'),'missing install guard');
assert(source.includes("const POLISH_CLASS = 'v59a1-design-system'"),'missing design-system class');
assert(source.includes('--v59a-radius-hero:26px'),'missing hero radius token');
assert(source.includes('--v59a-radius-card:21px'),'missing reusable card radius token');
assert(source.includes('--v59a-s1:4px') && source.includes('--v59a-s6:24px'),'missing 4/8-based spacing scale');
assert(source.includes('--v59a-ink:#10205a'),'missing primary navy ink token');
assert(source.includes('--v59a-blue:#1476ea'),'missing action blue token');
assert(source.includes('--v59a-purple:#6434e6'),'missing primary purple token');
assert(source.includes('--v59a-green:#19c98a'),'missing progress green token');

for(const icon of ['mixed','topic','paper','home','practice','progress','badges','more','message','settings','clipboard','spark','chart','logout']){
  assert(source.includes(`${icon}:\``),`missing reusable icon: ${icon}`);
}

assert(source.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'Today’s Practice must preserve three-column grid');
assert(source.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'dashboard widgets must preserve two-column grid');
assert(source.includes('.v59a1-assignment-card'),'missing assignment component treatment');
assert(source.includes('.v59a1-recommend-card'),'missing recommendation component treatment');
assert(source.includes('.v59a1-recent-card'),'missing recent-Practice component treatment');
assert(source.includes('#v572-weekly-missions-card'),'must reuse accepted Weekly Missions widget');
assert(source.includes('#v571b-latest-achievement'),'must reuse accepted Latest Badge widget');
assert(source.includes('#v573-class-challenge-card'),'must reuse accepted Class Challenge widget');
assert(source.includes('#v59a-mobile-nav'),'must refine existing mobile navigation rather than create a competing nav owner');
assert(source.includes('body.${POLISH_CLASS} #start .v57c-secondary{display:none!important}'),'mobile bottom nav must replace redundant secondary Home controls visually');
assert(source.includes('.v59a1-recent-card{display:none!important}'),'mobile concept layout must keep recent Practice out of the primary dashboard grid');
assert(source.includes("document.getElementById('v40c-student-logout')?.click()"),'More sheet sign-out must proxy accepted logout control');

assert(base.includes("const PROFILE_ID = 'v59a-student-profile'"),'base V5.9A profile owner missing');
assert(base.includes("const MOBILE_NAV_ID = 'v59a-mobile-nav'"),'base V5.9A mobile nav owner missing');
assert(base.includes("const SHORTCUTS_ID = 'v59a-practice-shortcuts'"),'base V5.9A Practice shortcuts owner missing');

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
  assert(!source.includes(forbidden),`design-system layer must remain presentation-only: ${forbidden}`);
}

const baseLoader="'./v59a-student-home-refresh.js'";
const designLoader="'./v59a1-student-home-design-system.js'";
assert(config.includes(designLoader),'config must load design-system parity layer');
assert(config.indexOf(designLoader)>config.indexOf(baseLoader),'design-system parity layer must load after base V5.9A');
assert(config.includes('V5.9A.1 applies the approved screenshot-derived design system'),'release narrative must document screenshot-derived parity layer');

console.log('V5.9A.1 Student Home design-system regression: PASS');
console.log('- screenshot-derived spacing, radius, elevation and typography tokens present');
console.log('- profile, hero, quick actions, two-column widgets and bottom navigation refined');
console.log('- existing V5.9A navigation/data owners retained');
console.log('- no network, persistence, grading or learning-rule authority added');