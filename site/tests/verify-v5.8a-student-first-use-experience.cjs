const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'v58a-student-first-use-experience.js'),'utf8');
const config=fs.readFileSync(path.join(root,'config.js'),'utf8');
const achievementSql=fs.readFileSync(path.resolve(root,'..','supabase','v571b_student_streaks_achievements.sql'),'utf8');

function assert(condition,message){
  if(!condition) throw new Error(message);
}

new vm.Script(source,{filename:'v58a-student-first-use-experience.js'});

assert(source.includes('V5.8A — Student First-Use Experience'),'missing V5.8A identity');
assert(source.includes('v58a-first-use-card'),'missing first-use card');
assert(source.includes('Start My First 5 Questions'),'missing first-use CTA');
assert(source.includes("data-badge-id=\"first_practice\""),'first-use completion must reuse First Practice achievement');
assert(source.includes("classList.contains('earned')"),'earned First Practice badge must dismiss onboarding');
assert(source.includes("new Set(['assignment','checkpoint'])"),'assignments and saved Past Paper checkpoints must outrank onboarding');

assert(source.includes("setSelectValue('strand-filter','all')"),'first-use CTA must select Mixed Practice');
assert(source.includes("setSelectValue('topic-filter','all')"),'first-use CTA must keep all topics');
assert(source.includes("setSelectValue('difficulty-filter','all')"),'first-use CTA must keep all difficulties');
assert(source.includes("setSelectValue('question-count','5')"),'first-use CTA must configure five questions');
assert(source.includes('V561PracticeFirstStudentExperience?.ensurePracticeSelection?.()'),'must reuse Practice-first selection owner');
assert(source.includes("document.getElementById('start-btn')"),'must reuse existing Start Practice control');
assert(source.includes('start.click()'),'must forward to existing Practice start flow');
assert(source.includes("window.addEventListener('v57c:home-updated'"),'must follow existing Continue Learning Home updates');
assert(source.includes("window.addEventListener('v571b:achievements-updated'"),'must react when saved achievements refresh');
assert(source.includes("classList.contains('active')"),'launch recovery must detect when Home remains active');

const forbidden=[
  'cloud.rpc(',
  'cloud.from(',
  'supabase.',
  'localStorage.',
  'sessionStorage.',
  'fetch(',
  'grade_practice_response',
  'request_practice_hint',
  'submit_practice_session',
  'finalize_exam_attempt',
  'set_student_pin'
];
for(const token of forbidden){
  assert(!source.includes(token),`V5.8A must not introduce direct data/network/learning authority: ${token}`);
}

const loaderToken="'./v58a-student-first-use-experience.js'";
assert(config.includes(loaderToken),'config.js must load V5.8A');
assert(config.indexOf(loaderToken)>config.indexOf("'./v5763-teacher-feedback-header-icon.js'"),'V5.8A must load after the accepted V5.7.6.3 layer');

assert(achievementSql.includes("select 'first_practice'::text as id"),'achievement SQL must retain First Practice badge');
assert(achievementSql.includes('(select min(completed_at) from completed_sessions) as first_practice_at'),'First Practice must remain tied to the first completed Practice session');
assert(achievementSql.includes("ps.practice_mode <> 'exam'"),'achievement evidence must retain the non-Exam boundary');
assert(achievementSql.includes('where not sr.ended_early'),'ended-early Practice must not earn First Practice');
assert(achievementSql.includes('and sr.total > 0'),'empty Practice sessions must not earn First Practice');

console.log('V5.8A Student First-Use Experience regression: PASS');