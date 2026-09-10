'use strict';

const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
const gitObject=pathspec=>execFileSync('git',['rev-parse',`HEAD:${pathspec}`],{cwd:ROOT,encoding:'utf8'}).trim();

const protectedFiles=Object.freeze({
  // Frozen V50 boundaries: early native-observer owners + late security global owner.
  'site/v50-student-progress-overview.js':'2300ee96a28bf40c61b18f3344c1d6da6e55a0c8',
  'site/v50-accessibility-polish.js':'bdcee55fd5ce30fb675b614942761381eb08bb2d',
  'site/v50-security-hardening.js':'775185976309cd11eb30b0e4bc8ab03f35c0de6f',

  // Historical V50 sources consolidated by this checkpoint remain byte-identical references.
  'site/v50-teacher-class-report.js':'5da64a5fac824c7761eb4234612bf2b03e6f4231',
  'site/v50-teacher-student-report.js':'56e60e2116917f8e25307d2ebf53135b670d1513',
  'site/v50-reporting-export.js':'3d9ad8338ceaa4fccc8492a138073da9bb1f0bb2',
  'site/v50-report-archive.js':'1e1dff9f33dac00f863722e3593d5bdaff0d59ee',
  'site/v50-student-launch-readiness.js':'303c7dc2345de210480452baf595a45e00cd6da4',
  'site/v50-teacher-operations.js':'1aff06898465025b7baa58fc05a9f1ba0a9dcbdf',
  'site/v50-roster-edit.js':'0184eb76ad2c3e1914d402e59bcd36f553e13b76',
  'site/v50-production-polish.js':'54e74011be48e9b07053cc81022be3ff49718533',
  'site/v50-release-audit.js':'e446b60b6ef41e31b181c525c50d5c0bc76fd6b5',
  'site/v50-rc2-empty-result-code-polish.js':'4ecb5556b74b965ce1b192671626cbeecebb1ee4',
  'site/v50-release-audit-rc3.js':'26545966923b0e702a18bf1e0df987d4e7fcb830',

  // V53 current consolidated owners / engine. Historical V53 sources are frozen by their dedicated checkpoint guards.
  'site/practice-eligibility-ui.js':'3d12cb7090289b50b0e809b9f86b4edd6156d849',
  'site/practice-selection-engine.js':'46db6d9b8ad4f011100ff36f81e13cf286b4c8a1',
  'site/practice-ui-resource-clarity.js':'1e458670d8020f6cc5c627ffa6176137365b3533',

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

  // V52 complete runtime boundary, including the exact global MutationObserver owner.
  'site/v52-teacher-topical-library.js':'25a2e7eb176eb100ab852fc664379e5716feb6de',
  'site/v52-topical-activation-guard.js':'7ece6302bc0faf9066db9e1b615810ad63c5f0fa',
  'site/v52-topical-exercise-foundation.js':'6283c212c788b8ceba417569b0522ee957fd6cbb',
  'site/v52b1-large-import-timeout-recovery.js':'b3c902b7c0d5fca9a1ad1063dbbbf2c981d468ab',
  'site/v52b1-question-bank-observer-gate.js':'82a87ffed9091b76c9008a3949c3bd432c2d06ce',
  'site/v52b1-question-bank-performance.js':'87124f4bc252289203409fc0abe614748ed1dd86',
  'site/topical-legacy-student-route.js':'aa1c324014cade50a7f41d10d21b03181e06cdc2',
  'site/v52c-student-topical-library.js':'9c926222506e78f885c456816d732abf55727aa1',
  'site/v52c-topical-hint-bridge.js':'df6301d32f82fa718cbd180ccded7c6ed796bca1',
  'site/v52c-topical-publication.js':'0657511377d2edbb70ae8ba33e71c0fe87ee8312',
  'site/v52c1-topical-library-mount-hotfix.js':'c25c75fc6b558260d01c5462bc430386e944e8d0',
  'site/v52c2-topical-result-ux.js':'38d7ccd573e47d9b098dff1ec3d36477efe07590',

  // V54 current consolidated owners; historical A-F are frozen by the dedicated V54 guard.
  'site/resource-bank-ui.js':'07a3c75122207d44297dde4d1e8820ceb8b83724',
  'site/resource-bank-bulk.js':'4a25893e6ba43c4b106b2e0dff00e9f9a5e29738',
  'site/v54-stable-release-checkpoint.js':'bee266ae0b718295c7e8a3eb9b8e4b3defff7e71',

  // Direct V56 downstream contracts.
  'site/v56a-question-bank-response-filter.js':'89f4fd3eb293f321af4908f9435f09015012b95b',
  'site/v56a1-bulk-practice-confirmation-bridge.js':'a99194ca4e2d1d701f197349501a9f0fc350988d',

  // Assignments, including the active V53D1 compatibility owner.
  'site/assignment-deadlines.js':'7d8a4b44f0eb0f8feb009e239de37fa342458d6c',
  'site/assignment-intervention-history.js':'e85d5a986637524ec91e4d2497be51f8b5f851a5',
  'site/assignment-intervention-queue-support.js':'532285487c1510623ba487e5d49647ffc7e96399',
  'site/assignment-interventions.js':'55ed7959677a348907b2857bb2f2ad4d1320273b',
  'site/assignments-core.js':'39e47ff10dd1efdc704a572aea4376e313a9b727',
  'site/assignments-student.js':'5b5bf1604120df9a8aa037db6c8fa8ab4d0970d2',
  'site/assignments-teacher.js':'872b3d4f149a96b896bbdf586cabc46ee2765afe',

  // Past Paper runtime.
  'site/past-paper-core.js':'8b007f6cae55dbcb32267c97bfbc4b25e4654fe0',
  'site/past-paper-resume.js':'844cf3f514c75736079278ead84d402f39be09d1',
  'site/past-paper-results.js':'ab2a4edc98d042bd6344cbd7ab81fc2175292b81',
  'site/past-paper-assignments.js':'e67d9018a1ebf42e3ff104ef1cabf6d92c8474fd',
  'site/past-paper-progress.js':'46080d3b78e39fc205d2ef3f7a9fd602e363f8f8',
  'site/past-paper-analytics.js':'db017e8a8fcf45afa3f1530e6f548a29153f509e',
  'site/past-paper-cross-device.js':'cc975d4188f465be9464dd6de7b1d8b8a08ff868',
  'site/past-paper-analytics-actions.js':'7d1a39376a48fa8c42dc0ce26b3dfd33163e274e',

  // Gamification + V57C.
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

  // Explicit V54 SQL contracts (also covered by the complete Supabase tree).
  'supabase/v54b_teacher_practice_eligibility_controls.sql':'b3ad6cf8b0d2605cc9de16406900959b1dac1e3d',
  'supabase/v54e_bulk_practice_eligibility_controls.sql':'b91b909ca85f76a5e0dec9dc1a1a5fe4e1dbc4e3',
  'supabase/v54b_retire_legacy_v54a_writer.sql':'05be3fb1108d1e4b512aec91ca5d94a19a118398'
});

const currentV51ActiveScope=new Set(["site/paper-import-management.js", "site/question-bank-audit-multipart.js", "site/question-bank-metadata-review.js", "site/question-bank-selection-qa.js", "site/student-exam-ui.js"]);
const rows=[];
for(const [file,expected] of Object.entries(protectedFiles)){
  if(currentV51ActiveScope.has(file)) continue;
  const actual=gitObject(file);
  rows.push({file,expected,actual,ok:actual===expected});
  assert.equal(actual,expected,`${file} must remain byte-identical to approved current-main baseline`);
}
console.table(rows);
const expectedSupabaseTree='19dd92c4e1f1d7c3ab9fc522d1b1cdf191afc456';
const actualSupabaseTree=gitObject('supabase');
console.table([{tree:'supabase/',expected:expectedSupabaseTree,actual:actualSupabaseTree,ok:actualSupabaseTree===expectedSupabaseTree}]);
assert.equal(actualSupabaseTree,expectedSupabaseTree,'complete Supabase Git tree must remain byte-identical');
console.log(`Phase 4 V50 protected SHA audit passed: ${rows.length} files + complete Supabase tree.`);
