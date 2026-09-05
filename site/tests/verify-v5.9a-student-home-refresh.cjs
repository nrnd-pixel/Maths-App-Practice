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

function assert(condition,message){ if(!condition) throw new Error(message); }
new vm.Script(source,{filename:'v59a-student-home-refresh.js'});

assert(source.includes('V5.9A — Student Home Refresh'),'missing V5.9A identity');
assert(source.includes('__v59aStudentHomeRefreshInstalled'),'missing V5.9A install guard');
assert(source.includes("const SHORTCUTS_ID = 'v59a-practice-shortcuts'"),'missing Practice shortcuts id');
assert(source.includes("const HERO_KICKER_ID = 'v59a-home-kicker'"),'missing refreshed Home kicker');
assert(source.includes("const HERO_MOMENTUM_ID = 'v59a-home-momentum'"),'missing Home momentum strip');

for(const [type,label] of [
  ['mixed','Mixed Practice'],
  ['topic','Topic Practice'],
  ['past_paper','Past Papers']
]){
  assert(source.includes(`data-type=\"${type}\"`),`missing quick Practice type: ${type}`);
  assert(source.includes(`<strong>${label}</strong>`),`missing quick Practice label: ${label}`);
}

assert(source.includes('Continue Learning'),'V5.9A must preserve Continue Learning hierarchy');
assert(source.includes("ROOT.V55APastPaperPractice"),'Practice shortcuts must delegate to the accepted Practice-type owner');
assert(source.includes('api.setPracticeType(type)'),'Practice shortcuts must use the accepted Practice-type API');
assert(source.includes('ROOT.V561PracticeFirstStudentExperience?.ensurePracticeSelection?.()'),'shortcuts must preserve Practice-first mode');
assert(source.includes('[data-v40-nav=\\"learn\\"]') || source.includes('[data-v40-nav="learn"]'),'shortcuts must delegate through existing Learn navigation');
assert(source.includes('v40c-change-settings'),'Topic Practice must reuse existing Practice settings');
assert(source.includes('v55a-paper-year'),'Past Papers must reuse existing Past Paper selectors');

for(const marker of [
  '__v57cStudentContinueLearningHomeInstalled',
  '__v571aGamificationFoundationInstalled',
  '__v571bStreaksAchievementsInstalled',
  '__v572WeeklyMissionsInstalled',
  '__v573ClassChallengesTeacherGamificationInstalled',
  '__v55aPastPaperPracticeInstalled',
  '__v58aStudentFirstUseExperienceInstalled'
]){
  assert(
    continueHome.includes(marker) || xp.includes(marker) || badges.includes(marker) || missions.includes(marker) || challenge.includes(marker) || pastPaper.includes(marker) || firstUse.includes(marker),
    `accepted student owner missing: ${marker}`
  );
}

assert(source.includes('#v571a-gamification-card'),'V5.9A must visually reuse XP/Level card');
assert(source.includes('#v572-weekly-missions-card'),'V5.9A must visually reuse weekly missions');
assert(source.includes('#v573-class-challenge-card'),'V5.9A must visually reuse class challenge');
assert(source.includes('#v571b-latest-achievement'),'V5.9A must visually reuse achievements');
assert(source.includes('.v57c-home-grid'),'V5.9A must visually reuse assignment/recommendation/recent Practice cards');
assert(source.includes('#v58a-first-use-card'),'V5.9A must preserve and style the accepted first-use card');

assert(source.includes('@media(max-width:760px)'),'V5.9A must include tablet/mobile layout');
assert(source.includes('@media(max-width:520px)'),'V5.9A must include small-phone layout');
assert(source.includes('@media(prefers-reduced-motion:reduce)'),'V5.9A must respect reduced-motion preference');

for(const eventName of [
  'v57c:home-updated','v571a:gamification-updated','v571b:achievements-updated',
  'v572:missions-updated','v573:class-challenge-updated'
]){
  assert(source.includes(eventName),`V5.9A must refresh after existing owner event: ${eventName}`);
}

for(const forbidden of [
  'cloud.rpc(',
  'cloud.from(',
  'supabase.',
  'fetch(',
  'localStorage',
  'sessionStorage',
  'startPractice(',
  "getElementById('start-btn')",
  'grade_practice_response',
  'request_practice_hint',
  'submit_practice_session',
  'finalize_exam_attempt',
  'create_teacher_past_paper_assignments',
  'update_teacher_past_paper_assignment',
  'save_question_practice_eligibility',
  'MutationObserver'
]){
  assert(!source.includes(forbidden),`V5.9A must remain presentation/navigation only: ${forbidden}`);
}

const loader="'./v59a-student-home-refresh.js'";
assert(config.includes(loader),'config.js must load V5.9A');
assert(config.indexOf(loader)>config.indexOf("'./v58-stable-release-checkpoint.js'"),'V5.9A must layer after the accepted V5.8 stable checkpoint');
assert(config.includes('V5.9A refreshes the signed-in student Home presentation for Year 6'),'config release narrative must describe V5.9A boundary');

console.log('V5.9A Student Home Refresh regression: PASS');
console.log('- Continue Learning remains the primary student action');
console.log('- Mixed, Topic and Past Paper shortcuts delegate to accepted Practice controls');
console.log('- existing XP, streak, mission, achievement, assignment and progress ownership is preserved');
console.log('- V5.9A adds no network, persistence, grading or learning-rule authority');