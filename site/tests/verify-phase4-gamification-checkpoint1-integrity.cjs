const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');

const config = read('config.js');
const coreSource = read('gamification-core.js');
const studentSource = read('gamification-student.js');
const teacherSource = read('gamification-teacher.js');
const v58aSource = read('v58a-student-first-use-experience.js');

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
assert.ok(position('gamification-student.js') < position('gamification-teacher.js'),'Consolidated student gamification must load before the teacher module.');
assert.ok(position('gamification-teacher.js') < position('v575-gamification-stable-checkpoint.js'),'Consolidated teacher gamification must load before the untouched V5.7.5 checkpoint.');

// The Checkpoint 1 XP -> achievements -> missions listener chain remains direct.
assert.match(studentSource,/const xpOk=await loadXp\(force\)/);
assert.match(studentSource,/const achievementsOk=await loadAchievements\(force\)/);
assert.match(studentSource,/const missionsOk=await loadMissions\(force\)/);
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

// The consolidated student module must preserve the public APIs/flags introduced in Checkpoint 1.
for (const token of [
  '__v571aGamificationFoundationInstalled',
  '__v571bStreaksAchievementsInstalled',
  '__v572WeeklyMissionsInstalled',
  'V571AGamificationFoundation',
  'V571BStreaksAchievements',
  'V572WeeklyMissions'
]) assert.match(studentSource,new RegExp(token));

// Exactly one shared style injector still covers the V571A/B/V572 namespaces.
assert.equal((coreSource.match(/document\.createElement\(['"]style['"]\)/g)||[]).length,1,'gamification-core.js must install exactly one shared style block.');
assert.doesNotMatch(studentSource,/document\.createElement\(['"]style['"]\)/,'gamification-student.js must not inject a second style block.');
assert.doesNotMatch(teacherSource,/document\.createElement\(['"]style['"]\)/,'gamification-teacher.js must use the shared core style block.');
for (const namespace of ['v571a-level-badge','v571b-streak-chip','v571b-badge-grid','v572-mission-list']) {
  assert.match(coreSource,new RegExp(namespace),`Shared style block must retain ${namespace} presentation rules.`);
}

// V5.8A directly depends on this exact historical selector; preserve it as an explicit compatibility contract.
const firstPracticeSelector='#v571b-latest-achievement .v571b-badge[data-badge-id="first_practice"]';
assert.ok(studentSource.includes(firstPracticeSelector),'Consolidated student runtime must explicitly preserve the exact V5.8A first-Practice selector.');
assert.ok(v58aSource.includes(firstPracticeSelector),'V5.8A must still use the exact preserved first-Practice selector.');
assert.match(coreSource,/achievementCard:'v571b-latest-achievement'/,'Shared DOM constants must retain the historical achievement card id.');
assert.match(studentSource,/class="v571b-badge \$\{earned\?'earned':'locked'\}"/,'Achievement rendering must retain the historical v571b-badge earned/locked class output.');
assert.match(studentSource,/data-badge-id="\$\{html\(badge\.id\)\}"/,'Achievement rendering must retain the historical data-badge-id output path used by V5.8A.');

console.log('Phase 4 Checkpoint 1 gamification integrity checks passed after Checkpoint 2.');
console.log('- V571A/V571B/V572 remain consolidated in gamification-core.js + gamification-student.js');
console.log('- direct XP/achievement/mission orchestration and compatibility events remain intact');
console.log('- one shared style block remains authoritative');
console.log('- exact V5.8A first-Practice achievement selector contract is preserved');
