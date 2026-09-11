const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const site=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');

const config=read('config.js');
const coreSource=read('gamification-core.js');
const studentSource=read('gamification-student.js');
const teacherSource=read('gamification-teacher.js');
// Phase 5A: v573-class-challenges-teacher-gamification.js deleted.
// Phase 5A: v574-gamification-polish-teacher-controls.js deleted.
const v575Source=read('v575-gamification-stable-checkpoint.js');
const v58aSource=read('v58a-student-first-use-experience.js');

new vm.Script(coreSource,{filename:'gamification-core.js'});
new vm.Script(studentSource,{filename:'gamification-student.js'});
new vm.Script(teacherSource,{filename:'gamification-teacher.js'});

function parseStagedScripts(source){
  const block=source.match(/const\s+MATH_APP_STAGED_SCRIPTS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(block,'config.js must expose MATH_APP_STAGED_SCRIPTS.');
  return [...block[1].matchAll(/['"](\.\/[^'"]+\.js(?:\?[^'"]*)?)['"]/g)]
    .map(match=>match[1].replace(/^\.\//,'').split(/[?#]/,1)[0]);
}

const scripts=parseStagedScripts(config);
const position=name=>scripts.indexOf(name);

for(const retired of [
  'v571a-gamification-foundation.js',
  'v571b-streaks-achievements.js',
  'v572-weekly-missions.js',
  'v573-class-challenges-teacher-gamification.js',
  'v574-gamification-polish-teacher-controls.js'
]) assert.equal(position(retired),-1,`${retired} must be dormant/unloaded after Checkpoint 2.`);

for(const active of ['gamification-core.js','gamification-student.js','gamification-teacher.js','v575-gamification-stable-checkpoint.js']){
  assert.ok(position(active)>=0,`${active} must be in the staged runtime list.`);
}
assert.ok(position('v57-stable-release-checkpoint.js')<position('gamification-core.js'));
assert.ok(position('gamification-core.js')<position('gamification-student.js'));
assert.ok(position('gamification-student.js')<position('gamification-teacher.js'));
assert.ok(position('gamification-teacher.js')<position('v575-gamification-stable-checkpoint.js'));

// The student class challenge is the fourth direct call, not another event-driven layer.
assert.match(studentSource,/const xpOk=await loadXp\(force\)/);
assert.match(studentSource,/const achievementsOk=await loadAchievements\(force\)/);
assert.match(studentSource,/const missionsOk=await loadMissions\(force\)/);
assert.match(studentSource,/return loadClassChallenge\(force\)/);
assert.match(studentSource,/rpc\(RPC\.classChallengeV574,access\.access_token\)/);
assert.doesNotMatch(studentSource,/addEventListener\(['"]v571a:gamification-updated/);
assert.doesNotMatch(studentSource,/addEventListener\(['"]v571b:achievements-updated/);
assert.doesNotMatch(studentSource,/addEventListener\(['"]v572:missions-updated/);
assert.doesNotMatch(studentSource,/addEventListener\(['"]v573:class-challenge-updated/);

// V573 remains a compatibility output from the consolidated student module.
assert.match(studentSource,/new CustomEvent\(['"]v573:class-challenge-updated['"]/);
assert.match(studentSource,/detail:\{complete:c\.complete,progress:c\.progress_percent,questions:c\.questions_completed,target:c\.target_questions\}/);

// V575 checks these exact historical installation flags; the new teacher module owns them.
for(const flag of [
  '__v573ClassChallengesTeacherGamificationInstalled',
  '__v574GamificationPolishTeacherControlsInstalled'
]){
  assert.ok(v575Source.includes(flag),`Untouched V575 must still check ${flag}.`);
  assert.ok(teacherSource.includes(`ROOT.${flag} = true`),`gamification-teacher.js must preserve ${flag}.`);
}
for(const globalName of ['V573ClassChallengesTeacherGamification','V574GamificationPolishTeacherControls']){
  assert.match(teacherSource,new RegExp(`Object\\.defineProperty\\(window,'${globalName}'`),`${globalName} compatibility facade must remain available.`);
}

// The V574 teacher RPC already wraps V573 server-side, so the consolidated teacher
// view now has one RPC/render path instead of V573 render + delayed V574 DOM patch.
assert.match(teacherSource,/teacherRpc\(classId,RPC\.teacherV574\)/);
assert.doesNotMatch(
  teacherSource,
  /querySelector(?:\?\.)?\(\s*['"]\.v573-class-challenge['"]\s*\)/,
  'Consolidated teacher code must not find another module\'s challenge card for patching.'
);
assert.doesNotMatch(teacherSource,/scheduleTeacherPatch|patchTimer|patchTeacherFromCurrentClass/,
  'The old delayed teacher DOM-patch scheduler must be gone.');
assert.match(teacherSource,/function patchTeacherChallenge\(payload\)[\s\S]*return renderTeacher\(payload\)/,
  'Historical patchTeacherChallenge API may remain only as a whole-view compatibility delegate.');

// Exact equivalence guard for the trickiest part: V574 used to replace the innerHTML
// of V573's .v573-class-challenge. The consolidated module must directly produce the
// same final card for both enabled and paused states.
const teacher=require(path.join(site,'gamification-teacher.js'));
const squash=value=>String(value).replace(/\s+/g,' ').trim();

const enabledPayload={
  class:{class_id:'c1',class_name:'6A',year_level:6,active_students:3},
  week:{start_date:'2026-08-31',end_date:'2026-09-06'},
  challenge:{enabled:true,questions_completed:25,target_questions:30,contributors:2,progress_percent:83,complete:false},
  settings:{challenge_enabled:true,questions_per_active_student:10,allowed_questions_per_active_student:[5,10,15,20]},
  summary:{active_students:3,active_this_week:2,all_missions_complete:1,active_streaks:2,average_xp:310},
  students:[
    {student_id:'S3',student_name:'Zara',xp_total:120,level_number:2,level_title:'Number Explorer',current_streak:0,weekly_questions:0,weekly_practice_days:0,weekly_challenges:0,missions_completed:0},
    {student_id:'S1',student_name:'Aisyah',xp_total:520,level_number:4,level_title:'Maths Challenger',current_streak:4,weekly_questions:15,weekly_practice_days:2,weekly_challenges:1,missions_completed:3,all_missions_complete:true},
    {student_id:'S2',student_name:'Hadi',xp_total:290,level_number:3,level_title:'Problem Solver',current_streak:2,weekly_questions:10,weekly_practice_days:1,weekly_challenges:0,missions_completed:1}
  ]
};
const expectedEnabled=`
  <div class="v573-class-challenge">
    <div class="v573-class-challenge-head"><div><div class="v573-kicker">Cooperative Class Challenge</div><h3>🤝 6A · Class Question Quest</h3></div><strong>25 / 30 questions · 83%</strong></div>
    <div class="v573-bar" role="progressbar" aria-label="Class challenge progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="83"><span style="width:83%"></span></div>
    <p>2 of 3 students have contributed questions this week. Target = 10 questions × each active student.</p>
    <div class="v574-managed-note">Teacher-controlled challenge · Final push. Use <strong>⚙ Class Challenge</strong> to adjust or pause it.</div>
  </div>`;
assert.equal(squash(teacher.teacherChallengeMarkup(enabledPayload)),squash(expectedEnabled),
  'Enabled teacher challenge card must render exactly like the accepted V574 patch result.');

const pausedPayload={
  ...enabledPayload,
  challenge:{...enabledPayload.challenge,enabled:false,complete:false},
  settings:{...enabledPayload.settings,challenge_enabled:false}
};
const expectedPaused=`
  <div class="v573-class-challenge">
    <div class="v573-class-challenge-head"><div><div class="v573-kicker">Cooperative Class Challenge</div><h3>⏸ 6A · Class Question Quest paused</h3></div><strong>Paused</strong></div>
    <p>Students do not currently see the class challenge. XP, streaks, badges and weekly missions continue normally.</p>
    <div class="v574-managed-note">Use <strong>⚙ Class Challenge</strong> to re-enable it or change the weekly target.</div>
  </div>`;
assert.equal(squash(teacher.teacherChallengeMarkup(pausedPayload)),squash(expectedPaused),
  'Paused teacher challenge card must render exactly like the accepted V574 patch result.');

// Exercise the actual renderTeacher path with a minimal DOM sink. The final managed
// challenge must be embedded directly beside the unchanged V573 summary/filter/table
// output rather than patched after the first render.
const content={innerHTML:''};
const priorDocument=global.document;
global.document={getElementById:id=>id==='v573-teacher-content'?content:null};
try{
  assert.equal(teacher.renderTeacher(enabledPayload),true);
}finally{
  if(priorDocument===undefined) delete global.document; else global.document=priorDocument;
}
assert.ok(squash(content.innerHTML).includes(squash(expectedEnabled)),'renderTeacher must include the exact final managed challenge card.');
for(const retained of [
  'Students active this week',
  'Completed all 3 weekly missions',
  'Students with an active streak',
  'Average class XP',
  'Class challenge contributors',
  'All students',
  'Needs a nudge',
  'Active this week',
  'All missions complete',
  '<th>Student</th><th>XP</th><th>Level</th><th>Streak</th><th>Questions this week</th><th>Practice days</th><th>Weekly missions</th>',
  'Aisyah',
  'Hadi',
  'Zara',
  'Motivation data is read-only and based on saved Practice evidence.'
]) assert.ok(content.innerHTML.includes(retained),`Teacher view lost accepted V573 output: ${retained}`);
assert.ok(content.innerHTML.indexOf('Aisyah')<content.innerHTML.indexOf('Hadi'));
assert.ok(content.innerHTML.indexOf('Hadi')<content.innerHTML.indexOf('Zara'));

// Dormant originals stay available as rollback/reference files, but their cross-file
// patch mechanism is not active anymore.
// Phase 5A: dormant573 check removed.
// Phase 5A: dormant574 check removed.
// Phase 5A: v573 existsSync removed.
// Phase 5A: v574 existsSync removed.

// One shared style element now covers the full student/teacher gamification feature.
assert.equal((coreSource.match(/document\.createElement\(['"]style['"]\)/g)||[]).length,1);
assert.doesNotMatch(studentSource,/document\.createElement\(['"]style['"]\)/);
assert.doesNotMatch(teacherSource,/document\.createElement\(['"]style['"]\)/);
for(const token of ['v574-challenge-head','v573-class-motivation-overlay','v574-settings-card','v574-managed-note']){
  assert.match(coreSource,new RegExp(token),`Shared gamification style block must include ${token}.`);
}

// Checkpoint boundaries: V575 and V58A remain source-level dependencies only, not edited
// or duplicated by the new modules. V58A's exact First Practice selector is still intact.
const firstPracticeSelector='#v571b-latest-achievement .v571b-badge[data-badge-id="first_practice"]';
assert.ok(v58aSource.includes(firstPracticeSelector));
assert.ok(studentSource.includes(firstPracticeSelector));

console.log('Phase 4 Checkpoint 2 gamification integrity checks passed.');
console.log('- V573/V574 active loaders replaced by gamification-teacher.js');
console.log('- class challenge is the fourth direct student load with V573 compatibility event retained');
console.log('- exact V575 V573/V574 flags and public compatibility globals are preserved');
console.log('- V574 teacher challenge patching is now one direct render path with equivalent enabled/paused markup');
console.log('- full teacher summary/filter/table output remains intact and alphabetical');
console.log('- one shared style block covers the consolidated student + teacher gamification feature');
