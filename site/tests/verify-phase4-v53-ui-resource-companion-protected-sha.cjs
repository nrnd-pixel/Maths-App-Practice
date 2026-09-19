'use strict';

const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');

const ROOT=path.resolve(__dirname,'../..');

function gitObject(pathspec){
  return execFileSync('git',['rev-parse',`HEAD:${pathspec}`],{cwd:ROOT,encoding:'utf8'}).trim();
}

const protectedFiles=Object.freeze({
  // Checkpoint-owned active modules and exact loader result.
  'site/practice-eligibility-ui.js':'3d12cb7090289b50b0e809b9f86b4edd6156d849',
  'site/practice-ui-resource-clarity.js':'1e458670d8020f6cc5c627ffa6176137365b3533',
  'site/v40-release.js':'66ee5aebc4947ca23c3b1a976738761ad1a1d62a',

  // Newly consolidated Practice engine must remain byte-identical.
  'site/practice-selection-engine.js':'46db6d9b8ad4f011100ff36f81e13cf286b4c8a1',

  // Historical V53A/C/D6 sources remain exact dormant/reference copies.
  'site/v53a-practice-eligibility.js':'a7a940b9ee080b8fa6a5ed518b0b060f6ba504ca',
  'site/v53c-two-mode-student-ui.js':'05257bf18a97873f3b76e11f44da2127e3f02898',
  'site/v53d6-resource-bank-status-clarity.js':'98c5c1c24480856745dd85922ed674e16bf7bfc1',

  // V51 runtime freeze. Phase 4 V51 intentionally consolidated these active owners;
  // historical V51 source files remain separately SHA-protected by the V51 guard.
  'site/paper-import-management.js':'49afc983bdb5c08a2a6a45ad6281a236d793c3de',
  'site/question-bank-selection-qa.js':'65df39b8a93c1c95bc3c5cdd4049070e7e18c8bf',
  'site/question-bank-metadata-review.js':'5571f6ea2ee33479f5dd0ad75a418249c10ba664',
  // Phase 7C-D exact owner-native refreshLifecycle successor; prior approved blob: 6738e89a7a4a98693b7303a05714c7419d562407.
  'site/question-bank-audit-multipart.js':'c32a5a3435e9acef8f240fcba50fd8b60605d6dc',
  'site/v51-exam-publication-safety.js':'183f313e630d7dd989355107192a35d6af8814c9',
  'site/v51-exam-publication-ui-polish.js':'c55497e54679dd17a9f020ca7a7898cd4d30a510',
  'site/student-exam-ui.js':'b4c2e1f4c096790ce820205e34180040131985a4',

  // V52 runtime freeze, including the legacy topical rollback path C intercepts.
  'site/v52-teacher-topical-library.js':'25a2e7eb176eb100ab852fc664379e5716feb6de',
  'site/v52-topical-activation-guard.js':'7ece6302bc0faf9066db9e1b615810ad63c5f0fa',
  'site/v52-topical-exercise-foundation.js':'6283c212c788b8ceba417569b0522ee957fd6cbb',
  'site/v52b1-large-import-timeout-recovery.js':'b3c902b7c0d5fca9a1ad1063dbbbf2c981d468ab',
  'site/v52b1-question-bank-observer-gate.js':'82a87ffed9091b76c9008a3949c3bd432c2d06ce',
  'site/v52b1-question-bank-performance.js':'87124f4bc252289203409fc0abe614748ed1dd86',
  'site/v52c-student-topical-library.js':'9c926222506e78f885c456816d732abf55727aa1',
  'site/v52c-topical-hint-bridge.js':'df6301d32f82fa718cbd180ccded7c6ed796bca1',
  'site/v52c-topical-publication.js':'0657511377d2edbb70ae8ba33e71c0fe87ee8312',
  'site/v52c1-topical-library-mount-hotfix.js':'c25c75fc6b558260d01c5462bc430386e944e8d0',
  'site/v52c2-topical-result-ux.js':'38d7ccd573e47d9b098dff1ec3d36477efe07590',

  // V54 resource-bank consumers remain byte-identical.
  'site/v54a-resource-bank-visibility.js':'2c07b345b66ea436e03c90ecbc5650e410400b97',
  'site/v54b-practice-eligibility-controls.js':'85b11da1e7e99b6cf8ea04027f599fd5c35436e1',
  'site/v54c-compact-question-bank.js':'15579557518ddb4dce5b9adea69891a245b28ede',
  'site/v54d-topical-resource-simplification.js':'3d33b94187a5250c8fe399a88d7cb55aeb1f1bf3',
  'site/v54e-bulk-practice-eligibility.js':'4e536559364c086bfb298051efeac8f1b3c869ca',
  'site/v54f-bulk-selection-scope-safety.js':'d1c77a5dc3453d1121eaf7ea6a6bc78a3eb93938',

  // Consolidated Assignments runtime and supporting owners.
  'site/assignment-deadlines.js':'7d8a4b44f0eb0f8feb009e239de37fa342458d6c',
  'site/assignment-intervention-history.js':'e85d5a986637524ec91e4d2497be51f8b5f851a5',
  'site/assignment-intervention-queue-support.js':'532285487c1510623ba487e5d49647ffc7e96399',
  'site/assignment-interventions.js':'55ed7959677a348907b2857bb2f2ad4d1320273b',
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

  // Consolidated Gamification runtime.
  'site/gamification-core.js':'87d6175270284e4b40c3a1fbcd196622179d0402',
  'site/gamification-student.js':'d9c4dc0e25cbed50346937db887a703800be5a59',
  'site/gamification-teacher.js':'04b93c670575acbf53e023b4f53edde9171ed034',

  // Explicit V57C downstream consumer.
  'site/v57c-student-continue-learning-home.js':'196225cf94035363869b8051bc33cdd3c03993f9',

  // Explicit V53A SQL contract, additionally covered by the complete Supabase tree.
  'supabase/v53a_practice_eligibility_foundation.sql':'198297e85b98997fed66f749ed87a489f22c0a00'
});

const currentV51LoaderScope=new Set(['site/v40-release.js']);
const rows=[];
for(const [file,expected] of Object.entries(protectedFiles)){
  if(currentV51LoaderScope.has(file)) continue;
  if(!fs.existsSync(path.join(ROOT,file))) continue; // Phase 5A: dormant files deleted
  const actual=gitObject(file);
  rows.push({file,expected,actual,ok:actual===expected});
  assert.equal(actual,expected,`${file} must remain byte-identical to the approved checkpoint baseline`);
}
console.table(rows);

const expectedSupabaseTree='27b8fdc47b6e56b4e54f6ad749827e631ce84110';
const actualSupabaseTree=gitObject('supabase');
console.table([{tree:'supabase/',expected:expectedSupabaseTree,actual:actualSupabaseTree,ok:actualSupabaseTree===expectedSupabaseTree}]);
assert.equal(actualSupabaseTree,expectedSupabaseTree,'the complete Supabase Git tree must remain byte-identical to current main');

console.log(`Phase 4 V53 UI/resource protected SHA audit passed: ${rows.length} files + complete Supabase tree.`);
