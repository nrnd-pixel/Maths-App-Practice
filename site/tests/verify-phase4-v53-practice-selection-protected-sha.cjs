'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname,'../..');

function gitObject(pathspec){
  return execFileSync('git',['rev-parse',`HEAD:${pathspec}`],{cwd:ROOT,encoding:'utf8'}).trim();
}

const protectedFiles = Object.freeze({
  // V53 files intentionally left separate or retained as dormant/reference.
  'site/v53a-practice-eligibility.js':'a7a940b9ee080b8fa6a5ed518b0b060f6ba504ca',
  'site/v53b-unified-practice-retrieval.js':'b427513531fce17b8de348ef3251c9d1614d9ca2',
  'site/v53c-two-mode-student-ui.js':'05257bf18a97873f3b76e11f44da2127e3f02898',
  'site/v53d3-practice-selection-quality.js':'5a59a347dd966c3cbc2317aa14c08021647f20e5',
  'site/v53d4-student-recommendation-alignment.js':'6c6d21102f0ddae7b28d4624a56e419371a7cc22',
  'site/v53d5-practice-selection-intelligence.js':'595735f995318c97e783680dda58ea5c22609c27',
  'site/v53d6-resource-bank-status-clarity.js':'98c5c1c24480856745dd85922ed674e16bf7bfc1',

  // Consolidated Assignments runtime.
  'site/assignments-core.js':'39e47ff10dd1efdc704a572aea4376e313a9b727',
  'site/assignments-student.js':'1004dba36c2d0bfe737b1e4c590360142001d419',
  'site/assignments-teacher.js':'872b3d4f149a96b896bbdf586cabc46ee2765afe',

  // Consolidated Past Paper runtime.
  'site/past-paper-core.js':'8b007f6cae55dbcb32267c97bfbc4b25e4654fe0',
  'site/past-paper-resume.js':'844cf3f514c75736079278ead84d402f39be09d1',
  'site/past-paper-results.js':'ab2a4edc98d042bd6344cbd7ab81fc2175292b81',
  'site/past-paper-assignments.js':'bd05a8b516987bcaa5b16ad9e8be991b947b2894',
  'site/past-paper-progress.js':'46080d3b78e39fc205d2ef3f7a9fd602e363f8f8',
  'site/past-paper-analytics.js':'db017e8a8fcf45afa3f1530e6f548a29153f509e',
  'site/past-paper-cross-device.js':'cc975d4188f465be9464dd6de7b1d8b8a08ff868',
  'site/past-paper-analytics-actions.js':'7d1a39376a48fa8c42dc0ce26b3dfd33163e274e',

  // Consolidated gamification runtime.
  'site/gamification-core.js':'87d6175270284e4b40c3a1fbcd196622179d0402',
  'site/gamification-student.js':'d9c4dc0e25cbed50346937db887a703800be5a59',
  'site/gamification-teacher.js':'04b93c670575acbf53e023b4f53edde9171ed034',

  // Explicit downstream V57C consumer.
  'site/v57c-student-continue-learning-home.js':'196225cf94035363869b8051bc33cdd3c03993f9',

  // V54 resource-bank chain.
  'site/v54a-resource-bank-visibility.js':'2c07b345b66ea436e03c90ecbc5650e410400b97',
  'site/v54b-practice-eligibility-controls.js':'85b11da1e7e99b6cf8ea04027f599fd5c35436e1',
  'site/v54c-compact-question-bank.js':'15579557518ddb4dce5b9adea69891a245b28ede',
  'site/v54d-topical-resource-simplification.js':'3d33b94187a5250c8fe399a88d7cb55aeb1f1bf3',
  'site/v54e-bulk-practice-eligibility.js':'4e536559364c086bfb298051efeac8f1b3c869ca',
  'site/v54f-bulk-selection-scope-safety.js':'d1c77a5dc3453d1121eaf7ea6a6bc78a3eb93938'
});

const rows=[];
for (const [file,expected] of Object.entries(protectedFiles)){
  if(!fs.existsSync(path.join(require("path").resolve(__dirname,".."),file))) continue; // Phase 5A
  const actual=gitObject(file);
  rows.push({file,expected,actual,ok:actual===expected});
  assert.equal(actual,expected,`${file} must remain byte-identical to the approved main baseline`);
}
console.table(rows);

const expectedSupabaseTree='5149044074be96dddfde57478ea887d01b5ed1d2';
const actualSupabaseTree=gitObject('supabase');
console.table([{tree:'supabase/',expected:expectedSupabaseTree,actual:actualSupabaseTree,ok:actualSupabaseTree===expectedSupabaseTree}]);
assert.equal(actualSupabaseTree,expectedSupabaseTree,'the complete Supabase Git tree must remain byte-identical to the approved main baseline');

console.log(`Phase 4 V53 protected SHA audit passed: ${rows.length} runtime files + complete Supabase tree.`);
