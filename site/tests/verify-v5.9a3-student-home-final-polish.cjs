const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'v59a3-student-home-layout-correction.js'),'utf8');
const config=fs.readFileSync(path.join(root,'config.js'),'utf8');

function assert(condition,message){ if(!condition) throw new Error(message); }
new vm.Script(source,{filename:'v59a3-student-home-layout-correction.js'});

assert(source.includes('V5.9A.3 — Student Home final layout and control polish'),'missing V5.9A.3 identity');
assert(source.includes("const LEGACY_FEEDBACK_ID = 'v5761-feedback-icon'"),'must target accepted legacy feedback proxy');
assert(source.includes('#${LEGACY_FEEDBACK_ID}{display:none!important}'),'redesigned Home must hide duplicate floating feedback proxy');
assert(source.includes('width:40px!important;height:40px!important'),'header utilities must use compact 40px geometry');
assert(source.includes('transform:translate(-4px,4px)'),'mobile header utilities must sit safely inward/down from the edge');
assert(source.includes('#v574-class-challenge-card'),'must target visible V5.7.4 class challenge');
assert(source.includes('order:60!important'),'visible class challenge must follow personal motivation widgets');
assert(source.includes("const THEME_ACTION_ID = 'v59a3-more-theme'"),'mobile More theme proxy missing');
assert(source.includes("document.getElementById('theme-toggle')?.click()"),'theme action must proxy accepted theme owner');
assert(source.includes('.app-theme-bar{display:none!important}'),'mobile student Home should remove redundant top theme strip');
assert(source.includes('padding-top:0!important'),'mobile signed-in Home must reclaim legacy top padding');
assert(source.includes('.v39-home-hub{\n          margin-top:0!important'),'mobile Home hub must not retain legacy top margin');
assert(source.includes('.v40-learning-hub-hero.v59a-hero-refresh{\n          margin-top:0!important'),'profile hero must start without extra Home-shell margin');
assert(source.includes('width:66px!important;height:66px!important'),'latest achievement should receive modest visual emphasis');
assert(source.includes('white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important'),'mobile Class Challenge footer must remain compact');
assert(source.includes("primaryGrid.insertAdjacentElement('afterend', missions)"),'Weekly Missions must follow primary cards');
assert(source.includes("missions.insertAdjacentElement('afterend', achievement)"),'Latest Achievement must follow Weekly Missions');
assert(source.includes("achievement.insertAdjacentElement('afterend', visibleChallenge)"),'Class Challenge must follow motivation row');

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
  'update_teacher_past_paper_assignment'
]) assert(!source.includes(forbidden),`V5.9A.3 must remain presentation/navigation-only: ${forbidden}`);

const loader="'./v59a3-student-home-layout-correction.js'";
assert(config.includes(loader),'config must load V5.9A.3 final polish');
assert(config.indexOf(loader)>config.indexOf("'./v59a2-student-home-mobile-density.js'"),'V5.9A.3 must load after V5.9A.2');

console.log('V5.9A.3 Student Home final polish regression: PASS');
console.log('- one visible feedback control on redesigned Home');
console.log('- compact 40px Feedback + More utilities with safe mobile inset');
console.log('- reclaimed mobile top spacing before the student profile');
console.log('- Weekly Missions + Latest Achievement precede full-width V5.7.4 Class Challenge');
console.log('- latest achievement receives modest visual emphasis');
console.log('- Class Challenge footer stays compact on mobile');
console.log('- mobile theme switch preserved through More');
console.log('- no learning, grading, network or persistence authority added');