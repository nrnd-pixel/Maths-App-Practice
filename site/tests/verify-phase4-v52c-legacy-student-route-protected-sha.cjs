'use strict';

const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const ROOT=path.resolve(__dirname,'../..');
const gitObject=pathspec=>execFileSync('git',['rev-parse',`HEAD:${pathspec}`],{cwd:ROOT,encoding:'utf8'}).trim();

const protectedFiles=Object.freeze({
  // V53 active owners / engine.
  'site/practice-eligibility-ui.js':'3d12cb7090289b50b0e809b9f86b4edd6156d849',
  'site/practice-selection-engine.js':'46db6d9b8ad4f011100ff36f81e13cf286b4c8a1',
  'site/practice-ui-resource-clarity.js':'1e458670d8020f6cc5c627ffa6176137365b3533',
  // Historical V53 references.
  'site/v53a-practice-eligibility.js':'a7a940b9ee080b8fa6a5ed518b0b060f6ba504ca',
  'site/v53b-unified-practice-retrieval.js':'b427513531fce17b8de348ef3251c9d1614d9ca2',
  'site/v53c-two-mode-student-ui.js':'05257bf18a97873f3b76e11f44da2127e3f02898',
  'site/v53d1-teacher-practice-pool-alignment.js':'d8c95a61b78e3d70278dbd442c877c1aad260869',
  'site/v53d3-practice-selection-quality.js':'5a59a347dd966c3cbc2317aa14c08021647f20e5',
  'site/v53d4-student-recommendation-alignment.js':'6c6d21102f0ddae7b28d4624a56e419371a7cc22',
  'site/v53d5-practice-selection-intelligence.js':'595735f995318c97e783680dda58ea5c22609c27',
  'site/v53d6-resource-bank-status-clarity.js':'98c5c1c24480856745dd85922ed674e16bf7bfc1',

  // V51 complete runtime boundary.
  'site/paper-import-management.js':'dddbc15919479df2a3016e0088b8372ab6fd14ae',
  'site/paper-import-management.js':'7a066b493eae01289ef2aa340e7e019bb17ab688',
  'site/paper-import-management.js':'7c4b6a3d27ba59d1b2cebb4799617ee268187efb',
  'site/v51-exam-publication-safety.js':'183f313e630d7dd989355107192a35d6af8814c9',
  'site/v51-exam-publication-ui-polish.js':'c55497e54679dd17a9f020ca7a7898cd4d30a510',
  'site/question-bank-audit-multipart.js':'8658f800def32aa882bdbc168b6477fbc6dbb56e',
  'site/paper-import-management.js':'a468e532f95a0bce8ce014ee102890de833c3bf3',
  'site/paper-import-management.js':'7882585ced5c808672bd3700b053efe45dba9421',
  'site/paper-import-management.js':'0bfc5249064d9d9ec91a5203eca76576e19d663d',
  'site/paper-import-management.js':'eaf1f52fd1a1dae3ef4547332b99b8d5e535b8a1',
  'site/paper-import-management.js':'242083da412b3709acda1b48f084a8729e6962c2',
  'site/question-bank-metadata-review.js':'a1e344bedf32d8ba6e709abff0f1253565764928',
  'site/question-bank-selection-qa.js':'810b3e28705871ad0599f6f72802c81798114694',
  'site/question-bank-selection-qa.js':'654d32df4d9930bfb64a09f36b60e3f391dcfa7d',
  'site/question-bank-audit-multipart.js':'99b42fd00900e68b7841c8908bc9cfbc44e35cc3',
  'site/question-bank-metadata-review.js':'1e41f98e2a16538e58d2d78281aaedc61a8466e1',
  'site/student-exam-ui.js':'71ef78b9546ff239dbc90be10cf483d755281ae9',
  'site/student-exam-ui.js':'f02e05bb987e1c0d1bad66098609239635fbb636',

  // V52 frozen runtime + dormant V52C reference sources. The observer gate is
  // intentionally explicit because the retired compatibility shim remains in the established loader chain.
  'site/v52-teacher-topical-library.js':'92df3624a7b48ed88a64eb5de985cd232c63b215',
  'site/v52-topical-activation-guard.js':'2df46ed74e364e06efbc462284fd398cfcd6c5f4',
  'site/v52-topical-exercise-foundation.js':'6283c212c788b8ceba417569b0522ee957fd6cbb',
  'site/v52b1-large-import-timeout-recovery.js':'b3c902b7c0d5fca9a1ad1063dbbbf2c981d468ab',
  'site/v52b1-question-bank-observer-gate.js':'d0c4745afdd78fc326b39748eca559e9d530503a',
  // Phase 7C-E exact history-scheduler successor; prior approved blob: 87124f4bc252289203409fc0abe614748ed1dd86.
  'site/v52b1-question-bank-performance.js':'5a2e180ca5e7c6579f6504be072a2cf90bf8e1d6',
  'site/v52c-student-topical-library.js':'9c926222506e78f885c456816d732abf55727aa1',
  'site/v52c-topical-hint-bridge.js':'df6301d32f82fa718cbd180ccded7c6ed796bca1',
  'site/v52c-topical-publication.js':'0657511377d2edbb70ae8ba33e71c0fe87ee8312',
  'site/v52c1-topical-library-mount-hotfix.js':'c25c75fc6b558260d01c5462bc430386e944e8d0',
  'site/v52c2-topical-result-ux.js':'38d7ccd573e47d9b098dff1ec3d36477efe07590',

  // V54 active consolidated owners.
  'site/resource-bank-ui.js':'07a3c75122207d44297dde4d1e8820ceb8b83724',
  'site/resource-bank-bulk.js':'4a25893e6ba43c4b106b2e0dff00e9f9a5e29738',
  // Historical V54 references and release checkpoint.
  'site/v54a-resource-bank-visibility.js':'2c07b345b66ea436e03c90ecbc5650e410400b97',
  'site/v54b-practice-eligibility-controls.js':'85b11da1e7e99b6cf8ea04027f599fd5c35436e1',
  'site/v54c-compact-question-bank.js':'15579557518ddb4dce5b9adea69891a245b28ede',
  'site/v54d-topical-resource-simplification.js':'3d33b94187a5250c8fe399a88d7cb55aeb1f1bf3',
  'site/v54e-bulk-practice-eligibility.js':'4e536559364c086bfb298051efeac8f1b3c869ca',
  'site/v54f-bulk-selection-scope-safety.js':'d1c77a5dc3453d1121eaf7ea6a6bc78a3eb93938',
  'site/v54-stable-release-checkpoint.js':'bee266ae0b718295c7e8a3eb9b8e4b3defff7e71',

  // Direct V56 downstream contracts.
  'site/v56a-question-bank-response-filter.js':'89f4fd3eb293f321af4908f9435f09015012b95b',
  'site/v56a1-bulk-practice-confirmation-bridge.js':'a99194ca4e2d1d701f197349501a9f0fc350988d',

  // Assignments and V53D1 compatibility owner.
  'site/assignment-deadlines.js':'7d8a4b44f0eb0f8feb009e239de37fa342458d6c',
  'site/assignment-intervention-history.js':'e85d5a986637524ec91e4d2497be51f8b5f851a5',
  'site/assignment-intervention-queue-support.js':'532285487c1510623ba487e5d49647ffc7e96399',
  'site/assignment-interventions.js':'55ed7959677a348907b2857bb2f2ad4d1320273b',
  'site/assignments-core.js':'39e47ff10dd1efdc704a572aea4376e313a9b727',
  'site/assignments-student.js':'1004dba36c2d0bfe737b1e4c590360142001d419',
  'site/assignments-teacher.js':'872b3d4f149a96b896bbdf586cabc46ee2765afe',

  // Past Paper runtime.
  'site/past-paper-core.js':'8b007f6cae55dbcb32267c97bfbc4b25e4654fe0',
  'site/past-paper-resume.js':'844cf3f514c75736079278ead84d402f39be09d1',
  'site/past-paper-results.js':'ab2a4edc98d042bd6344cbd7ab81fc2175292b81',
  'site/past-paper-assignments.js':'bd05a8b516987bcaa5b16ad9e8be991b947b2894',
  'site/past-paper-progress.js':'46080d3b78e39fc205d2ef3f7a9fd602e363f8f8',
  'site/past-paper-analytics.js':'db017e8a8fcf45afa3f1530e6f548a29153f509e',
  'site/past-paper-cross-device.js':'cc975d4188f465be9464dd6de7b1d8b8a08ff868',
  'site/past-paper-analytics-actions.js':'7d1a39376a48fa8c42dc0ce26b3dfd33163e274e',

  // Gamification runtime.
  'site/gamification-core.js':'87d6175270284e4b40c3a1fbcd196622179d0402',
  'site/gamification-student.js':'d9c4dc0e25cbed50346937db887a703800be5a59',
  'site/gamification-teacher.js':'04b93c670575acbf53e023b4f53edde9171ed034',
  'site/v57c-student-continue-learning-home.js':'196225cf94035363869b8051bc33cdd3c03993f9',

  // V58 complete runtime boundary.
  'site/v58-stable-release-checkpoint.js':'7afdfa50363672f7dd35d67473bcec8485944fdd',
  'site/v581a-practice-cloud-result-reconciliation.js':'09f167eab59737a393113ec3059724b8931155d3',
  'site/v58a-student-first-use-experience.js':'8e0279e86b1ece862586238f99c760129c13465f',
  'site/v58b-teacher-workspace-consolidation.js':'661c54ddc1f5cf45252f14b0dadf8600c1243ab2',
  'site/v58c-parent-friendly-student-report.js':'ab1ec58ff7cae1d886879002e4983179d7280145',
  'site/v58c-parent-summary-workspace-shortcut.js':'a6bbf05422d414d94fa7e6164f1d302e27feda51',
  'site/v58d-content-workflow-consolidation.js':'7905fce53236305d946315cae260c4b1bf212be6',

  // Existing V54 SQL contracts are included explicitly and the complete Supabase tree is frozen below.
  'supabase/v54b_teacher_practice_eligibility_controls.sql':'b3ad6cf8b0d2605cc9de16406900959b1dac1e3d',
  'supabase/v54e_bulk_practice_eligibility_controls.sql':'b91b909ca85f76a5e0dec9dc1a1a5fe4e1dbc4e3',
  'supabase/v54b_retire_legacy_v54a_writer.sql':'05be3fb1108d1e4b512aec91ca5d94a19a118398'
});

const currentV51ActiveScope=new Set(["site/paper-import-management.js", "site/question-bank-audit-multipart.js", "site/question-bank-metadata-review.js", "site/question-bank-selection-qa.js", "site/student-exam-ui.js"]);
const rows=[];
for(const [file,expected] of Object.entries(protectedFiles)){
  if(currentV51ActiveScope.has(file)) continue;
  if(!fs.existsSync(path.join(ROOT,file))) continue; // Phase 5A: dormant files deleted
  const actual=gitObject(file);
  rows.push({file,expected,actual,ok:actual===expected});
  assert.equal(actual,expected,`${file} must remain byte-identical to approved current-main baseline`);
}
console.table(rows);
const expectedSupabaseTree='27b8fdc47b6e56b4e54f6ad749827e631ce84110';
const actualSupabaseTree=gitObject('supabase');
console.table([{tree:'supabase/',expected:expectedSupabaseTree,actual:actualSupabaseTree,ok:actualSupabaseTree===expectedSupabaseTree}]);
assert.equal(actualSupabaseTree,expectedSupabaseTree,'complete Supabase Git tree must remain byte-identical to current main');
console.log(`Phase 4 V52C protected SHA audit passed: ${rows.length} files + complete Supabase tree.`);
