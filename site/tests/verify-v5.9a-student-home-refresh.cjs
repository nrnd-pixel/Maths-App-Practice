const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'v59a-student-home-refresh.js'),'utf8');
const config=fs.readFileSync(path.join(root,'config.js'),'utf8');
const continueHome=fs.readFileSync(path.join(root,'v57c-student-continue-learning-home.js'),'utf8');
const xp=fs.readFileSync(path.join(root,'v571a-gamification-foundation.js'),'utf8');
const badges=fs.readFileSync(path.join(root,'v571b-streaks-achievements.js'),'utf8');
const missions=fs.readFileSync(path.join(root,'v572-weekly-missions.js'),'utf8');
const challenge=fs.readFileSync(path.join(root,'v573-class-challenges-teacher-gamification.js'),'utf8');
const pastPaper=fs.readFileSync(path.join(root,'v55a-past-paper-practice.js'),'utf8');
const firstUse=fs.readFileSync(path.join(root,'v58a-student-first-use-experience.js'),'utf8');
const feedback=fs.readFileSync(path.join(root,'v576-classroom-feedback-support.js'),'utf8');

function assert(condition,message){ if(!condition) throw new Error(message); }
new vm.Script(source,{filename:'v59a-student-home-refresh.js'});

assert(source.includes('V5.9A — Student Home Refresh'),'missing V5.9A identity');
assert(source.includes('__v59aStudentHomeRefreshInstalled'),'missing V5.9A install guard');
for(const marker of [
  "const SHORTCUTS_ID = 'v59a-practice-shortcuts'",
  "const PROFILE_ID = 'v59a-student-profile'",
  "const MOBILE_NAV_ID = 'v59a-mobile-nav'",
  "const MORE_SHEET_ID = 'v59a-more-sheet'",
  "const MISSION_TOGGLE_ID = 'v59a-mission-toggle'"
]) assert(source.includes(marker),`missing V5.9A UI marker: ${marker}`);

for(const [type,label] of [['mixed','Start Mixed Practice'],['topic','Topic Practice'],['past_paper','Past Papers']]){
  assert(source.includes(`data-type="${type}"`),`missing quick Practice type: ${type}`);
  assert(source.includes(`<strong>${label}</strong>`),`missing quick Practice label: ${label}`);
}

for(const conceptMarker of [
  'Small Steps,','Same learning.<br>A brighter you.','avatarSvg()','mountainSvg()','continueSvg()',
  'Stronger together!','🏆','grid-template-columns:repeat(3,minmax(0,1fr))',
  'grid-template-columns:repeat(2,minmax(0,1fr))','body.v59a-student-active .v40-student-nav'
]) assert(source.includes(conceptMarker),`missing concept-parity marker: ${conceptMarker}`);

for(const [key,label] of [['home','Home'],['practice','Practice'],['progress','Progress'],['badges','Badges'],['more','More']]){
  assert(source.includes(`data-v59a-nav="${key}"`),`missing mobile nav destination: ${key}`);
  assert(source.includes(`<span>${label}</span>`),`missing mobile nav label: ${label}`);
}

for(const marker of [
  'data-v59a-more="assignments"','data-v59a-more="reviewed"','data-v59a-more="feedback"',
  "getElementById('my-assignments-btn')","getElementById('my-progress-btn')",
  "getElementById('check-reviewed-btn')","getElementById('v576-send-feedback')"
]) assert(source.includes(marker),`missing delegated student destination: ${marker}`);
assert(feedback.includes("const STUDENT_TRIGGER_ID='v576-send-feedback'"),'accepted Feedback trigger changed');

assert(source.includes('ROOT.V55APastPaperPractice'),'Practice shortcuts must delegate to accepted Practice-type owner');
assert(source.includes('api.setPracticeType(type)'),'Practice shortcuts must use accepted Practice-type API');
assert(source.includes('ROOT.V561PracticeFirstStudentExperience?.ensurePracticeSelection?.()'),'shortcuts must preserve Practice-first mode');
assert(source.includes('[data-v40-nav="learn"]'),'shortcuts must delegate through existing Learn navigation');
assert(source.includes('v40c-change-settings'),'Topic Practice must reuse existing Practice settings');
assert(source.includes('v55a-paper-year'),'Past Papers must reuse existing Past Paper selectors');
assert(source.includes("activeQuiz() && key!=='practice'"),'mobile nav must preserve active-Practice protection');

for(const marker of [
  '__v57cStudentContinueLearningHomeInstalled','__v571aGamificationFoundationInstalled',
  '__v571bStreaksAchievementsInstalled','__v572WeeklyMissionsInstalled',
  '__v573ClassChallengesTeacherGamificationInstalled','__v55aPastPaperPracticeInstalled',
  '__v58aStudentFirstUseExperienceInstalled'
]){
  assert(
    continueHome.includes(marker) || xp.includes(marker) || badges.includes(marker) || missions.includes(marker) || challenge.includes(marker) || pastPaper.includes(marker) || firstUse.includes(marker),
    `accepted student owner missing: ${marker}`
  );
}

for(const marker of ['#v571a-gamification-card','#v572-weekly-missions-card','#v573-class-challenge-card','#v571b-latest-achievement','.v57c-home-grid','#v58a-first-use-card','gamificationSnapshot()']){
  assert(source.includes(marker),`accepted student presentation source missing: ${marker}`);
}

for(const marker of ['@media(max-width:760px)','@media(max-width:520px)','@media(max-width:390px)','@media(max-width:340px)','@media(prefers-reduced-motion:reduce)','position:fixed;left:0;right:0;bottom:0']){
  assert(source.includes(marker),`missing responsive/mobile marker: ${marker}`);
}

for(const eventName of ['v57c:home-updated','v571a:gamification-updated','v571b:achievements-updated','v572:missions-updated','v573:class-challenge-updated']){
  assert(source.includes(eventName),`V5.9A must refresh after existing owner event: ${eventName}`);
}

for(const forbidden of [
  'cloud.rpc(','cloud.from(','supabase.','fetch(','localStorage','sessionStorage','startPractice(',
  "getElementById('start-btn')",'grade_practice_response','request_practice_hint','submit_practice_session',
  'finalize_exam_attempt','create_teacher_past_paper_assignments','update_teacher_past_paper_assignment',
  'save_question_practice_eligibility','MutationObserver'
]) assert(!source.includes(forbidden),`V5.9A must remain presentation/navigation only: ${forbidden}`);

const loader="'./v59a-student-home-refresh.js'";
assert(config.includes(loader),'config.js must load V5.9A');
assert(config.indexOf(loader)>config.indexOf("'./v58-stable-release-checkpoint.js'"),'V5.9A must layer after accepted V5.8 stable checkpoint');
assert(config.includes('V5.9A refreshes the signed-in student Home presentation for Year 6'),'config release narrative must describe V5.9A boundary');

console.log('V5.9A Student Home Refresh regression: PASS');
console.log('- concept-style profile/avatar, illustrated Continue Learning hero and three-tile Practice row are present');
console.log('- mobile Home / Practice / Progress / Badges / More navigation delegates to accepted destinations');
console.log('- Assignments, Reviewed Work and Feedback remain available through More');
console.log('- existing XP, streak, mission, achievement, assignment and progress ownership is preserved');
console.log('- V5.9A adds no network, persistence, grading or learning-rule authority');