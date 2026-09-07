const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');

const config = read('config.js');
const coreSource = read('gamification-core.js');
const studentSource = read('gamification-student.js');
const v573Source = read('v573-class-challenges-teacher-gamification.js');
const v574Source = read('v574-gamification-polish-teacher-controls.js');
const v58aSource = read('v58a-student-first-use-experience.js');

new vm.Script(coreSource,{filename:'gamification-core.js'});
new vm.Script(studentSource,{filename:'gamification-student.js'});

function parseStagedScripts(source){
  const block=source.match(/const\s+MATH_APP_STAGED_SCRIPTS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(block,'config.js must expose MATH_APP_STAGED_SCRIPTS.');
  return [...block[1].matchAll(/['"](\.\/[^'"]+\.js(?:\?[^'"]*)?)['"]/g)]
    .map(match=>match[1].replace(/^\.\//,'').split(/[?#]/,1)[0]);
}

const scripts=parseStagedScripts(config);
const position=name=>scripts.indexOf(name);

for (const oldName of [
  'v571a-gamification-foundation.js',
  'v571b-streaks-achievements.js',
  'v572-weekly-missions.js'
]) {
  assert.equal(position(oldName),-1,`${oldName} must no longer be in the active staged runtime list.`);
}

for (const newName of ['gamification-core.js','gamification-student.js']) {
  assert.ok(position(newName)>=0,`${newName} must be present in the active staged runtime list.`);
}

assert.ok(position('v57-stable-release-checkpoint.js') < position('gamification-core.js'),'Gamification core must load after the V5.7 stable foundation.');
assert.ok(position('gamification-core.js') < position('gamification-student.js'),'Gamification core must load before the consolidated student module.');
assert.ok(position('gamification-student.js') < position('v573-class-challenges-teacher-gamification.js'),'Consolidated student gamification must load before V5.7.3.');
assert.ok(position('v573-class-challenges-teacher-gamification.js') < position('v574-gamification-polish-teacher-controls.js'),'V5.7.3 must remain before V5.7.4.');
assert.ok(position('v574-gamification-polish-teacher-controls.js') < position('v575-gamification-stable-checkpoint.js'),'V5.7.4 must remain before the untouched V5.7.5 checkpoint.');

// The former internal browser event chain is now direct orchestration.
assert.match(studentSource,/const xpOk=await loadXp\(force\)/);
assert.match(studentSource,/const achievementsOk=await loadAchievements\(force\)/);
assert.match(studentSource,/return loadMissions\(force\)/);
assert.doesNotMatch(studentSource,/addEventListener\(['"]v571a:gamification-updated/);
assert.doesNotMatch(studentSource,/addEventListener\(['"]v571b:achievements-updated/);

// All accepted legacy events remain emitted by active runtime scripts for downstream compatibility.
const activeRuntime = scripts.map(name => ({name,source:read(name)}));
for (const eventName of [
  'v571a:gamification-updated',
  'v571b:achievements-updated',
  'v572:missions-updated',
  'v573:class-challenge-updated'
]) {
  const emitters=activeRuntime.filter(({source}) =>
    source.includes(`new CustomEvent('${eventName}'`) || source.includes(`new CustomEvent("${eventName}"`)
  );
  assert.ok(emitters.length>=1,`${eventName} must still be emitted somewhere in the active browser runtime.`);
}

// V5.7.3 is intentionally untouched in Checkpoint 1, so retain its accepted access and DOM anchor contracts.
assert.match(v573Source,/V572WeeklyMissions\?\.passivePracticeAccess/);
assert.match(v573Source,/V571BStreaksAchievements\?\.passivePracticeAccess/);
assert.match(v573Source,/getElementById\(['"]v572-weekly-missions-card['"]\)/);
assert.match(v573Source,/getElementById\(['"]v571b-latest-achievement['"]\)/);
assert.match(v573Source,/addEventListener\(['"]v572:missions-updated/);
assert.match(v574Source,/V573ClassChallengesTeacherGamification/);

// The consolidated module must preserve the legacy public facades and checkpoint flags consumed downstream.
for (const token of [
  '__v571aGamificationFoundationInstalled',
  '__v571bStreaksAchievementsInstalled',
  '__v572WeeklyMissionsInstalled',
  'V571AGamificationFoundation',
  'V571BStreaksAchievements',
  'V572WeeklyMissions'
]) assert.match(studentSource,new RegExp(token));

// Exactly one consolidated style injector covers the V571A/B/V572 namespaces.
assert.equal((coreSource.match(/document\.createElement\(['"]style['"]\)/g)||[]).length,1,'gamification-core.js must install exactly one shared style block.');
assert.doesNotMatch(studentSource,/document\.createElement\(['"]style['"]\)/,'gamification-student.js must not inject a second style block.');
for (const namespace of ['v571a-level-badge','v571b-streak-chip','v571b-badge-grid','v572-mission-list']) {
  assert.match(coreSource,new RegExp(namespace),`Shared style block must retain ${namespace} presentation rules.`);
}

// V5.8A directly depends on this exact historical selector; preserve it as an explicit compatibility contract.
const firstPracticeSelector='#v571b-latest-achievement .v571b-badge[data-badge-id="first_practice"]';
assert.ok(studentSource.includes(firstPracticeSelector),'Consolidated student runtime must explicitly preserve the exact V5.8A first-Practice selector.');
assert.ok(v58aSource.includes(firstPracticeSelector),'V5.8A must still use the exact preserved first-Practice selector in this checkpoint.');
assert.match(coreSource,/achievementCard:'v571b-latest-achievement'/,'Shared DOM constants must retain the historical achievement card id.');
assert.match(studentSource,/class=\\"v571b-badge \$\{earned\?'earned':'locked'\}\\" data-badge-id=\\"\$\{html\(badge\.id\)\}\\"/,'Achievement rendering must retain the historical badge class and data-badge-id output path.');

console.log('Phase 4 Checkpoint 1 gamification integrity checks passed.');
console.log('- V571A/V571B/V572 active loaders replaced by gamification-core.js + gamification-student.js');
console.log('- direct student orchestration replaces the internal three-stage event listener chain');
console.log('- four legacy gamification events remain emitted for downstream compatibility');
console.log('- V5.7.3/V5.7.4 access and anchor assumptions remain intact');
console.log('- one shared style block covers XP/levels, streaks/achievements and weekly missions');
console.log('- exact V5.8A first-Practice achievement selector contract is preserved');
