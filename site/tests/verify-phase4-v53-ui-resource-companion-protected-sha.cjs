'use strict';

const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'../..');

function gitObject(pathspec){
  return execFileSync('git',['rev-parse',`HEAD:${pathspec}`],{cwd:ROOT,encoding:'utf8'}).trim();
}

const protectedFiles=Object.freeze({
  // Checkpoint-owned active modules and exact loader result.
  'site/practice-eligibility-ui.js':'3d12cb7090289b50b0e809b9f86b4edd6156d849',
  'site/practice-ui-resource-clarity.js':'1e458670d8020f6cc5c627ffa6176137365b3533',
  'site/v40-release.js':'2d2c5f75f3c7b655c735d8bb66f8baae1cf1c02f',

  // Newly consolidated Practice engine must remain byte-identical.
  'site/practice-selection-engine.js':'46db6d9b8ad4f011100ff36f81e13cf286b4c8a1',

  // Historical V53A/C/D6 sources remain exact dormant/reference copies.
  'site/v53a-practice-eligibility.js':'a7a940b9ee080b8fa6a5ed518b0b060f6ba504ca',
  'site/v53c-two-mode-student-ui.js':'05257bf18a97873f3b76e11f44da2127e3f02898',
  'site/v53d6-resource-bank-status-clarity.js':'98c5c1c24480856745dd85922ed674e16bf7bfc1',

  // V51 runtime freeze.
  'site/v51-bulk-question-image-cleanup.js':'dddbc15919479df2a3016e0088b8372ab6fd14ae',
  'site/v51-bulk-question-image-safety.js':'7a066b493eae01289ef2aa340e7e019bb17ab688',
  'site/v51-bulk-question-image-upload.js':'7c4b6a3d27ba59d1b2cebb4799617ee268187efb',
  'site/v51-exam-publication-safety.js':'183f313e630d7dd989355107192a35d6af8814c9',
  'site/v51-exam-publication-ui-polish.js':'c55497e54679dd17a9f020ca7a7898cd4d30a510',
  'site/v51-multipart-question-management.js':'8658f800def32aa882bdbc168b6477fbc6dbb56e',
  'site/v51-one-confirmation-paper-import.js':'a468e532f95a0bce8ce014ee102890de833c3bf3',
  'site/v51-paper-package-preview-status.js':'7882585ced5c808672bd3700b053efe45dba9421',
  'site/v51-paper-package-preview.js':'0bfc5249064d9d9ec91a5203eca76576e19d663d',
  'site/v51-paper-profile-validator.js':'eaf1f52fd1a1dae3ef4547332b99b8d5e535b8a1',
  'site/v51-post-import-integrity.js':'242083da412b3709acda1b48f084a8729e6962c2',
  'site/v51-question-bank-bulk-metadata.js':'a1e344bedf32d8ba6e709abff0f1253565764928',
  'site/v51-question-bank-bulk-status.js':'810b3e28705871ad0599f6f72802c81798114694',
  'site/v51-question-bank-qa.js':'654d32df4d9930bfb64a09f36b60e3f391dcfa7d',
  'site/v51-question-change-history.js':'99b42fd00900e68b7841c8908bc9cfbc44e35cc3',
  'site/v51-question-review-workflow.js':'1e41f98e2a16538e58d2d78281aaedc61a8466e1',
  'site/v51-student-exam-paper-library.js':'71ef78b9546ff239dbc90be10cf483d755281ae9',
  'site/v51-student-exam-resume-progress.js':'f02e05bb987e1c0d1bad66098609239635fbb636',

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
  'site/assignments-student.js':'5b5bf1604120df9a8aa037db6c8fa8ab4d0970d2',
  'site/assignments-teacher.js':'872b3d4f149a96b896bbdf586cabc46ee2765afe',

  // Consolidated Past Paper runtime.
  'site/past-paper-core.js':'8b007f6cae55dbcb32267c97bfbc4b25e4654fe0',
  'site/past-paper-resume.js':'844cf3f514c75736079278ead84d402f39be09d1',
  'site/past-paper-results.js':'ab2a4edc98d042bd6344cbd7ab81fc2175292b81',
  'site/past-paper-assignments.js':'e67d9018a1ebf42e3ff104ef1cabf6d92c8474fd',
  'site/past-paper-progress.js':'46080d3b78e39fc205d2ef3f7a9fd602e363f8f8',
  'site/past-paper-analytics.js':'db017e8a8fcf45afa3f1530e6f548a29153f509e',
  'site/past-paper-cross-device.js':'cc975d4188f465be9464dd6de7b1d8b8a08ff868',
  'site/past-paper-analytics-actions.js':'7d1a39376a48fa8c42dc0ce26b3dfd33163e274e',

  // Consolidated Gamification runtime.
  'site/gamification-core.js':'87d6175270284e4b40c3a1fbcd196622179d0402',
  'site/gamification-student.js':'4847c0be7c635d46bb1e458a81510d37f1079851',
  'site/gamification-teacher.js':'04b93c670575acbf53e023b4f53edde9171ed034',

  // Explicit V57C downstream consumer.
  'site/v57c-student-continue-learning-home.js':'b3daeac60970302bc6bb59e654f9ec8c484096a0',

  // Explicit V53A SQL contract, additionally covered by the complete Supabase tree.
  'supabase/v53a_practice_eligibility_foundation.sql':'198297e85b98997fed66f749ed87a489f22c0a00'
});

const rows=[];
for(const [file,expected] of Object.entries(protectedFiles)){
  const actual=gitObject(file);
  rows.push({file,expected,actual,ok:actual===expected});
  assert.equal(actual,expected,`${file} must remain byte-identical to the approved checkpoint baseline`);
}
console.table(rows);

const expectedSupabaseTree='19dd92c4e1f1d7c3ab9fc522d1b1cdf191afc456';
const actualSupabaseTree=gitObject('supabase');
console.table([{tree:'supabase/',expected:expectedSupabaseTree,actual:actualSupabaseTree,ok:actualSupabaseTree===expectedSupabaseTree}]);
assert.equal(actualSupabaseTree,expectedSupabaseTree,'the complete Supabase Git tree must remain byte-identical to current main');

console.log(`Phase 4 V53 UI/resource protected SHA audit passed: ${rows.length} files + complete Supabase tree.`);
