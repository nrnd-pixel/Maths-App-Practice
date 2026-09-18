const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'v58a-student-first-use-experience.js'),'utf8');
const config=fs.readFileSync(path.join(root,'config.js'),'utf8');
const productionBundle=fs.readFileSync(path.join(root,'v58ab-first-use-workspace-bundle.js'),'utf8');
const phase7bManifest=JSON.parse(fs.readFileSync(path.resolve(root,'..','tooling','phase7b','loader-manifest.json'),'utf8'));
const achievementSql=fs.readFileSync(path.resolve(root,'..','supabase','v571b_student_streaks_achievements.sql'),'utf8');

function assert(condition,message){
  if(!condition) throw new Error(message);
}

new vm.Script(source,{filename:'v58a-student-first-use-experience.js'});
new vm.Script(productionBundle,{filename:'v58ab-first-use-workspace-bundle.js'});

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

const bundleLoader="'./v58ab-first-use-workspace-bundle.js'";
assert(config.includes(bundleLoader),'config.js must load the generated V5.8A/V5.8B production bundle');
assert(!config.includes("'./v58a-student-first-use-experience.js'"),'canonical V5.8A source must not load directly after bundle promotion');
assert(config.indexOf(bundleLoader)>config.indexOf("'./v576-feedback-presentation-bundle.js'"),'V5.8A/V5.8B bundle must load after the accepted V5.7.6 presentation bundle');
const contract=phase7bManifest.generatedBundles.find(entry=>entry.path==='site/v58ab-first-use-workspace-bundle.js');
assert(contract,'missing V5.8A/V5.8B generated bundle contract');
assert(JSON.stringify(contract.inputs)===JSON.stringify([
  'site/v58a-student-first-use-experience.js',
  'site/v58b-teacher-workspace-consolidation.js'
]),'V5.8A/V5.8B generated bundle input order changed');
const sourceOnly=phase7bManifest.sourceOnly.find(entry=>entry.path==='site/v58a-student-first-use-experience.js');
assert(sourceOnly && sourceOnly.reason.includes('v58ab-first-use-workspace-bundle.js'),'V5.8A canonical source must remain reviewed source-only');
for(const token of forbidden){
  assert(!productionBundle.includes(token),`V5.8A/V5.8B production bundle introduced forbidden authority: ${token}`);
}

assert(achievementSql.includes("select 'first_practice'::text as id"),'achievement SQL must retain First Practice badge');
assert(achievementSql.includes('(select min(completed_at) from completed_sessions) as first_practice_at'),'First Practice must remain tied to the first completed Practice session');
assert(achievementSql.includes("ps.practice_mode <> 'exam'"),'achievement evidence must retain the non-Exam boundary');
assert(achievementSql.includes('where not sr.ended_early'),'ended-early Practice must not earn First Practice');
assert(achievementSql.includes('and sr.total > 0'),'empty Practice sessions must not earn First Practice');

console.log('V5.8A Student First-Use Experience regression: PASS');
