const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const site=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const normSource=value=>String(value).replace(/\r\n/g,'\n').trimEnd();

const config=read('config.js');
const assignments=read('past-paper-assignments.js');
const progress=read('past-paper-progress.js');
const analytics=read('past-paper-analytics.js');
const cross=read('past-paper-cross-device.js');
const actions=read('past-paper-analytics-actions.js');
const v55core=read('past-paper-core.js');
const v55resume=read('past-paper-resume.js');
const v55results=read('past-paper-results.js');
const v57b=read('v57b-teacher-assignment-management.js');
const v57c=read('v57c-student-continue-learning-home.js');
const gamCore=read('gamification-core.js');
const v581a=read('v581a-practice-cloud-result-reconciliation.js');

const retired={
  v56b:read('v56b-teacher-assigned-past-paper-practice.js'),
  v56c:read('v56c-student-past-paper-progress.js'),
  v56d:read('v56d-teacher-past-paper-analytics.js'),
  v57a:read('v57a-cross-device-past-paper-resume.js'),
  v57a1:read('v57a1-cross-device-local-bridge.js'),
  v57a2:read('v57a2-stale-local-checkpoint-cleanup.js'),
  v57d:read('v57d-past-paper-analytics-actions.js'),
  v57d1:read('v57d1-focus-plan-copy-fallback.js')
};

const staged=[...config.matchAll(/'\.\/([^']+\.js)'/g)].map(match=>match[1]);
const pos=name=>staged.indexOf(name);
const oldFiles=[
  'v56b-teacher-assigned-past-paper-practice.js',
  'v56c-student-past-paper-progress.js',
  'v56d-teacher-past-paper-analytics.js',
  'v57a-cross-device-past-paper-resume.js',
  'v57a1-cross-device-local-bridge.js',
  'v57a2-stale-local-checkpoint-cleanup.js',
  'v57d-past-paper-analytics-actions.js',
  'v57d1-focus-plan-copy-fallback.js'
];
for(const old of oldFiles) assert.equal(pos(old),-1,`${old} must remain repository-dormant/unloaded`);
for(const active of [
  'past-paper-assignments.js','past-paper-progress.js','past-paper-analytics.js',
  'past-paper-cross-device.js','past-paper-analytics-actions.js'
]) assert.ok(pos(active)>=0,`${active} must be staged`);

// Exact release-phase positions: no cross-phase timing movement.
assert.ok(pos('v56a1-bulk-practice-confirmation-bridge.js') < pos('past-paper-assignments.js'));
assert.ok(pos('past-paper-assignments.js') < pos('past-paper-progress.js'));
assert.ok(pos('past-paper-progress.js') < pos('past-paper-analytics.js'));
assert.ok(pos('past-paper-analytics.js') < pos('v56-stable-release-checkpoint.js'));
assert.ok(pos('v561-practice-first-student-experience.js') < pos('past-paper-cross-device.js'));
assert.ok(pos('past-paper-cross-device.js') < pos('v57b-teacher-assignment-management.js'));
assert.ok(pos('v57b-teacher-assignment-management.js') < pos('v57c-student-continue-learning-home.js'));
assert.ok(pos('v57c-student-continue-learning-home.js') < pos('past-paper-analytics-actions.js'));
assert.ok(pos('past-paper-analytics-actions.js') < pos('v57-stable-release-checkpoint.js'));

// The three V56 owners are exact source moves, not behavioural rewrites.
assert.equal(normSource(assignments),normSource(retired.v56b),'past-paper-assignments.js must remain source-equivalent to V56B');
assert.equal(normSource(progress),normSource(retired.v56c),'past-paper-progress.js must remain source-equivalent to V56C');
assert.equal(normSource(analytics),normSource(retired.v56d),'past-paper-analytics.js must remain source-equivalent to V56D');

// V57A/A1/A2 are consolidated in their original execution order, character-equivalent apart from separator whitespace.
const a1Marker='/* V5.7A.1 — Cross-device resume bridge.';
const a2Marker='/* V5.7A.2 — Stale same-device checkpoint cleanup.';
const a1Start=cross.indexOf(a1Marker);
const a2Start=cross.indexOf(a2Marker);
assert.ok(a1Start>0&&a2Start>a1Start,'Cross-device consolidated sections must be V57A -> V57A1 -> V57A2');
assert.equal(normSource(cross.slice(0,a1Start)),normSource(retired.v57a),'V57A runtime section must remain source-equivalent');
assert.equal(normSource(cross.slice(a1Start,a2Start)),normSource(retired.v57a1),'V57A1 bridge section must remain source-equivalent');
assert.equal(normSource(cross.slice(a2Start)),normSource(retired.v57a2),'V57A2 cleanup section must remain source-equivalent');

// V57D/D1 likewise retain their exact action/capture ordering inside one staged owner.
const d1Marker='/* V5.7D.1 — Focus Plan Copy Fallback.';
const d1Start=actions.indexOf(d1Marker);
assert.ok(d1Start>0,'Analytics-actions module must contain V57D followed by V57D1');
assert.equal(normSource(actions.slice(0,d1Start)),normSource(retired.v57d),'V57D action section must remain source-equivalent');
assert.equal(normSource(actions.slice(d1Start)),normSource(retired.v57d1),'V57D1 fallback section must remain source-equivalent');

// Load-bearing V55/V57 function boundary: V55 is consumed, not modified or widened here.
assert.match(v55resume,/ROOT\.__v55cResumePastPaperPracticeWrappersInstalled = true/);
assert.match(v55resume,/Object\.defineProperty\(window, 'V55CResumePastPaperPractice'/);
assert.match(cross,/if \(!ROOT\.__v55cResumePastPaperPracticeWrappersInstalled\) return false/);
assert.match(cross,/const baseStart = typeof ROOT\.startPractice === 'function' \? ROOT\.startPractice : null/);
assert.match(cross,/const baseNext = typeof ROOT\.nextQuestion === 'function' \? ROOT\.nextQuestion : null/);
assert.match(cross,/const wrappedStart = async function\(\.\.\.args\)/);
assert.match(cross,/const wrappedNext = function\(\.\.\.args\)/);
assert.doesNotMatch(cross,/const wrappedNext = async function|async function\s+wrappedNext/,
  'Outer cross-device nextQuestion wrapper must stay synchronous.');
assert.match(cross,/const result = baseNext\.apply\(this,args\);\s*if \(snapshot\) void saveBoundary\(snapshot,assignment\);\s*return result/,
  'V57A must synchronously traverse V55 before starting its cloud save.');
assert.match(cross,/ROOT\.__v57aCrossDevicePastPaperResumeWrappersInstalled = true/);

for(const globalName of [
  'V56BTeacherAssignedPastPaperPractice','V56CStudentPastPaperProgress','V56DTeacherPastPaperAnalytics',
  'V57ACrossDevicePastPaperResume','V57A1CrossDeviceLocalBridge','V57A2StaleLocalCheckpointCleanup',
  'V57DPastPaperAnalyticsActions','V57D1FocusPlanCopyFallback'
]) assert.ok((assignments+'\n'+progress+'\n'+analytics+'\n'+cross+'\n'+actions).includes(globalName),`Missing compatibility global ${globalName}`);
for(const marker of [
  '__v56bTeacherAssignedPastPaperPracticeInstalled','__v56cStudentPastPaperProgressInstalled','__v56dTeacherPastPaperAnalyticsInstalled',
  '__v57aCrossDevicePastPaperResumeInstalled','__v57a1CrossDeviceLocalBridgeInstalled','__v57a2StaleLocalCheckpointCleanupInstalled',
  '__v57dPastPaperAnalyticsActionsInstalled','__v57d1FocusPlanCopyFallbackInstalled'
]) assert.ok((assignments+'\n'+progress+'\n'+analytics+'\n'+cross+'\n'+actions).includes(marker),`Missing historical install marker ${marker}`);

// Assignment RPC bridge and dynamic launch composition remain intact.
assert.match(assignments,/__v53d1PracticeAssignmentRpcBridge/);
assert.match(assignments,/__v56bPastPaperAssignmentRpcBridge/);
assert.match(assignments,/startRecommendedPracticeV35=async function/);
assert.match(assignments,/typeof ROOT\.startPractice==='function'/);
assert.match(assignments,/complete_student_practice_assignment_v56b/);

// Analytics actions remain preparation-only and explicitly delegate management to untouched V57B.
assert.doesNotMatch(actions,/create_teacher_past_paper_assignments_v56b/,
  'Analytics actions must never auto-create an assignment.');
assert.match(actions,/const api=ROOT\.V57BTeacherAssignmentManagement/);
assert.match(actions,/api\.openOverlay\(\)/);
assert.match(actions,/window\.addEventListener\('click',handleCopyClick,true\)/,
  'V57D1 window-capture copy override must remain before the V57D document handler.');
assert.match(actions,/event\.stopImmediatePropagation\?\.\(\)/);

// Protected downstream callers still consume the preserved public APIs.
assert.match(v57c,/V57ACrossDevicePastPaperResume\?\.passivePracticeAccess/);
assert.match(v57c,/V57ACrossDevicePastPaperResume/);
assert.match(gamCore,/V57ACrossDevicePastPaperResume\?\.passivePracticeAccess/);
assert.match(v581a,/V56BTeacherAssignedPastPaperPractice/);
assert.match(v581a,/const base = typeof ROOT\.finishPractice === 'function'/);

// The frozen V55 files retain their previously-verified ownership split.
assert.match(v55core,/__phase4PastPaperCoreWrappersInstalled/);
assert.match(v55resume,/__phase4PastPaperResumeWrappersInstalled/);
assert.match(v55results,/__phase4PastPaperResultsWrappersInstalled/);

console.log('Phase 4 Past Paper V56/V57 Checkpoint 1 integrity checks passed.');
console.log('- five phase-preserving owners staged at the former V56B/C/D, V57A and V57D positions');
console.log('- all eight retired modules remain source-equivalent inside their new owners and are no longer staged');
console.log('- V57A remains an outer synchronous-next wrapper over the accepted V55 resume boundary');
console.log('- analytics actions remain preparation-only and continue delegating management to untouched V57B');
