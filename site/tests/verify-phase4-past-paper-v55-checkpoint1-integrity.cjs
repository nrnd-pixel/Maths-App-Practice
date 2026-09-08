const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const site=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const config=read('config.js');
const core=read('past-paper-core.js');
const resume=read('past-paper-resume.js');
const results=read('past-paper-results.js');
const retiredV55b=read('v55b-full-paper-practice.js');
const v53d5=read('v53d5-practice-selection-intelligence.js');
const stable=read('v55-stable-release-checkpoint.js');
const v56b=read('v56b-teacher-assigned-past-paper-practice.js');
const v56c=read('v56c-student-past-paper-progress.js');
const v57a=read('v57a-cross-device-past-paper-resume.js');
const v57a1=read('v57a1-cross-device-local-bridge.js');
const v57a2=read('v57a2-stale-local-checkpoint-cleanup.js');
const v581a=read('v581a-practice-cloud-result-reconciliation.js');

const staged=[...config.matchAll(/'\.\/([^']+\.js)'/g)].map(match=>match[1]);
const pos=name=>staged.indexOf(name);

const retired=[
  'v55a-past-paper-practice.js',
  'v55a1-practice-type-guard.js',
  'v55b-full-paper-practice.js',
  'v55c-resume-past-paper-practice.js',
  'v55c1-resume-button-bridge.js',
  'v55d-past-paper-result-attribution.js'
];
for(const old of retired) assert.equal(pos(old),-1,`${old} must be dormant, not staged`);
for(const active of ['past-paper-core.js','past-paper-resume.js','past-paper-results.js']){
  assert.ok(pos(active)>=0,`${active} must be staged`);
}
assert.ok(pos('v54-stable-release-checkpoint.js') < pos('past-paper-core.js'));
assert.ok(pos('past-paper-core.js') < pos('past-paper-resume.js'),
  'Resume must load outside/after core so it captures the core-produced lifecycle.');
assert.ok(pos('past-paper-resume.js') < pos('past-paper-results.js'),
  'Results must capture the resume-wrapped finishPractice.');
assert.ok(pos('past-paper-results.js') < pos('v55-stable-release-checkpoint.js'));
assert.ok(pos('v55-stable-release-checkpoint.js') < pos('v56b-teacher-assigned-past-paper-practice.js'));
assert.ok(pos('past-paper-resume.js') < pos('v57a-cross-device-past-paper-resume.js'));
assert.ok(pos('past-paper-results.js') < pos('v581a-practice-cloud-result-reconciliation.js'));

// Historical browser globals and installation markers remain compatibility API.
for(const marker of [
  '__v55aPastPaperPracticeInstalled',
  '__v55a1PracticeTypeGuardInstalled',
  '__v55bFullPaperPracticeInstalled',
  '__v55aPastPaperPracticeWrappersInstalled',
  '__v55bFullPaperPracticeWrappersInstalled'
]) assert.ok(core.includes(marker),`Core must preserve ${marker}`);
for(const marker of [
  '__v55cResumePastPaperPracticeInstalled',
  '__v55c1ResumeButtonBridgeInstalled',
  '__v55cResumePastPaperPracticeWrappersInstalled'
]) assert.ok(resume.includes(marker),`Resume must preserve ${marker}`);
for(const marker of [
  '__v55dPastPaperResultAttributionInstalled',
  '__v55dPastPaperResultAttributionWrappersInstalled'
]) assert.ok(results.includes(marker),`Results must preserve ${marker}`);

for(const globalName of ['V55APastPaperPractice','V55A1PracticeTypeGuard','V55BFullPaperPractice']){
  assert.ok(core.includes(`Object.defineProperty(window,'${globalName}'`) || core.includes(`Object.defineProperty(window, '${globalName}'`),
    `Core must expose window.${globalName}`);
}
assert.match(resume,/Object\.defineProperty\(window,\s*'V55CResumePastPaperPractice'/);
assert.match(results,/Object\.defineProperty\(window,\s*'V55DPastPaperResultAttribution'/);

// Core replaces only the V55A/A1/B historical wrapping stack with one owner per function.
assert.equal((core.match(/const wrappedGetQuestions\s*=\s*async function/g)||[]).length,1);
assert.equal((core.match(/const wrappedShuffle\s*=\s*function/g)||[]).length,1);
assert.equal((core.match(/const wrappedStartPractice\s*=\s*async function/g)||[]).length,1);
assert.doesNotMatch(core,/wrappedNextQuestion|wrappedFinishPractice|wrappedResultRecord/,
  'Core must not absorb resume/results lifecycle ownership.');
assert.match(core,/const matched = .*\.filter\(item => matchesPaper\(item, year, paper\)\)/);
assert.match(core,/return matched\.filter\(isPastPaperItem\)/,
  'Selected-paper filtering must still be followed by the V55A.1 source-type guard.');
assert.match(core,/if \(fullRunActive && isPastPaperPractice\(\)\) return sortSourceOrder\(items\)/);
assert.match(core,/V53D3PracticeSelection/);
assert.match(core,/orderPracticeItems\(items, Math\.random\)/);
assert.match(core,/TEMP_COUNT_VALUE = '999'/);
assert.match(core,/fullRunActive = true[\s\S]*await runFreshStart[\s\S]*finally \{[\s\S]*fullRunActive = false/,
  'All Available must preserve its temporary full-run window and finally restoration.');
assert.match(core,/Choose a strand or topic before starting Topic Practice/);
assert.match(core,/Choose a past paper year and paper before starting Practice/);
assert.match(core,/state\.v55a_practice_type = practiceType/);
assert.match(core,/state\.v55a_exam_year = selectedYear\(\)/);
assert.match(core,/state\.v55a_paper = selectedPaper\(\)/);
assert.match(core,/state\.v55b_paper_scope = 'all_available'/);

// The accepted V55B source-order algorithm itself must remain character-for-character
// identical. Runtime ownership is separately guarded below because V53D5 can assign
// the global shuffle function after the staged V55 script has been queued.
function orderingBlock(source){
  const start=source.indexOf('  function questionOrderKey(item){');
  const sortStart=source.indexOf('  function sortSourceOrder(items){',start);
  const end=source.indexOf('\n\n  function ',sortStart+1);
  assert.ok(start>=0&&sortStart>start&&end>sortStart,'Could not isolate V55B source-order functions');
  return source.slice(start,end);
}
assert.equal(orderingBlock(core),orderingBlock(retiredV55b),
  'Consolidated questionOrderKey/sortSourceOrder must be character-for-character identical to retired V55B.');
assert.match(v53d5,/function installSelection\(\)[\s\S]*shuffle = smartShuffle[\s\S]*ROOT\.shuffle = smartShuffle/,
  'V53D5 must still be recognized as an earlier global shuffle owner.');
assert.match(core,/function selectionStackSettled\(\)[\s\S]*__v53d5PracticeSelectionInstalled[\s\S]*__v53d5PracticeSelectionRpcBridge/,
  'Core must wait until V53D5 selection/RPC ownership is settled before capturing shuffle.');
assert.match(core,/if \(!selectionStackSettled\(\)\) return false;/,
  'Core wrapper installation must not race V53D5 global shuffle installation.');

// Resume is a separate outer wrapper and retains the exact temporal contracts V57A consumes.
assert.match(resume,/if \(!ROOT\.__phase4PastPaperCoreWrappersInstalled\) return false/,
  'Resume must wait for and wrap the consolidated core rather than merge into it.');
assert.equal((resume.match(/const wrappedStartPractice\s*=\s*async function/g)||[]).length,1);
assert.equal((resume.match(/const wrappedNextQuestion\s*=\s*function/g)||[]).length,1);
assert.equal((resume.match(/const wrappedFinishPractice\s*=\s*async function/g)||[]).length,1);
assert.doesNotMatch(resume,/wrappedNextQuestion\s*=\s*async|async function\s+wrappedNextQuestion/,
  'Consolidated V55 nextQuestion must remain synchronous for V57A.');
assert.match(resume,/if \(resumeRequested && found\)[\s\S]*if \(await restoreFromCheckpoint\(found\)\) return;[\s\S]*await baseStartPractice\.apply/,
  'Explicit local resume must short-circuit before the fresh-start chain.');
assert.match(resume,/const wrappedNextQuestion = function\(\.\.\.args\)\{\s*checkpointCurrentBoundary\(\);\s*return baseNextQuestion\.apply\(this, args\);/,
  'Local checkpoint must be written before base nextQuestion advances.');
assert.match(resume,/const wrappedFinishPractice = async function[\s\S]*try \{[\s\S]*return await baseFinishPractice\.apply[\s\S]*\} finally \{[\s\S]*removeCheckpoint\(key\)/,
  'Local checkpoint cleanup must remain finally-protected.');
assert.match(resume,/button\.onclick = \(\) => ROOT\.nextQuestion\(\)/);
assert.match(resume,/button\.dataset\.v55cResumeBridge = 'true'/);
assert.doesNotMatch(resume,/exam-next-btn/,'V55C1 compatibility bridge must remain Practice-only.');

// The public V55C helper surface is consumed by untouched V56/V57 modules.
for(const helper of [
  'STORAGE_KEY','VERSION','MAX_AGE_MS','identityKey','checkpointIsFresh','pruneStore',
  'questionItemId','questionItemIds','safeAnswer','buildCheckpoint','applyCheckpointToItems',
  'rehydrateAnswers','readStore','writeStore'
]) assert.ok(resume.includes(helper),`Resume compatibility API missing ${helper}`);
assert.match(resume,/const STORAGE_KEY = 'mathPastPaperResumeV55C'/);
for(const forbidden of ['correctAnswer:q.answer','explanation:q.explanation','access_token','student-pin']){
  assert.doesNotMatch(resume,new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),
    `Local checkpoint persistence must not add protected field ${forbidden}`);
}

// Results stays outside resume: it captures the current finishPractice and delegates
// without swallowing errors, allowing resume's finally cleanup to complete first.
assert.equal((results.match(/const wrappedResultRecord\s*=\s*function/g)||[]).length,1);
assert.equal((results.match(/const wrappedFinishPractice\s*=\s*async function/g)||[]).length,1);
assert.match(results,/const baseFinishPractice = finishPractice/);
assert.match(results,/const output = await baseFinishPractice\.apply\(this, args\);[\s\S]*updateStudentResultContext/);
assert.doesNotMatch(results,/catch\s*\([^)]*\)\s*\{[^}]*return output/,
  'Results wrapper must not swallow a lower completion failure.');
for(const token of ["practice_mode:'past_paper'",'exam_year:examYear','paper,',"strand:'mixed'",'topic:pastPaperLabel']){
  assert.ok(results.includes(token),`Past Paper result attribution missing ${token}`);
}

// DOM tokens consumed by V56/V57 remain stable.
for(const token of [
  'v55a-practice-source','v55a-paper-panel','v55a-paper-year','v55a-paper-name',
  'v55a-paper-note','v55a-practice-type','v55a-source-grid','v55a-paper-grid',
  'v55b-paper-scope','v55b-paper-scope-btn','v55b-paper-scope-info','v55b-scope-grid',
  'v55c-resume-card','v55c-card','v55c-head','v55c-actions','v55c-progress','v55c-help',
  'data-v55c-resume','data-v55c-discard'
]) assert.ok((core+'\n'+resume).includes(token),`V55 compatibility DOM token missing: ${token}`);

// Untouched downstream modules still consume the preserved function/API boundary.
assert.match(v57a,/if \(!ROOT\.__v55cResumePastPaperPracticeWrappersInstalled\) return false/);
assert.match(v57a,/const baseStart = typeof ROOT\.startPractice === 'function' \? ROOT\.startPractice : null/);
assert.match(v57a,/const baseNext = typeof ROOT\.nextQuestion === 'function' \? ROOT\.nextQuestion : null/);
assert.match(v57a,/const wrappedNext = function\(\.\.\.args\)/,
  'Untouched V57A next wrapper must remain synchronous.');
assert.match(v57a,/const result = baseNext\.apply\(this,args\);[\s\S]*if \(snapshot\) void saveBoundary/,
  'Untouched V57A must call the synchronous V55 next boundary before its async cloud save.');
assert.match(v581a,/const base = typeof ROOT\.finishPractice === 'function'/);
assert.match(v581a,/const output = await base\.apply\(this,args\)/);
assert.match(v56b,/V55APastPaperPractice/);
assert.match(v56b,/V55BFullPaperPractice/);
assert.match(v56b,/ROOT\.startPractice/);
assert.match(v56c,/V55CResumePastPaperPractice/);
assert.match(v56c,/v55c-resume-card/);
assert.match(v57a1,/V55CResumePastPaperPractice/);
assert.match(v57a2,/V55CResumePastPaperPractice/);

// Stable V5.5 audit still keys off the historical markers preserved above.
for(const marker of [
  '__v55aPastPaperPracticeInstalled','__v55bFullPaperPracticeInstalled',
  '__v55cResumePastPaperPracticeInstalled','__v55c1ResumeButtonBridgeInstalled',
  '__v55dPastPaperResultAttributionInstalled'
]) assert.ok(stable.includes(marker),`Stable checkpoint must still consume ${marker}`);

// Consolidation does not take over authoritative grading/submission/Exam behavior.
const active=[core,resume,results].join('\n');
assert.doesNotMatch(active,/grade_practice_response|request_practice_hint|finalize_exam_attempt|save_exam_attempt/,
  'V55 consolidation must not own grading, hints or Exam execution.');
assert.doesNotMatch(active,/cloud\.from\('practice_sessions'\)|cloud\.from\('session_answers'\)/,
  'V55 consolidation must continue delegating Practice persistence to the existing engine.');

console.log('Phase 4 Past Paper V55 Checkpoint 1 integrity checks passed.');
console.log('- six historical V55 loaders retired; core -> resume -> results staged in order');
console.log('- historical V55 globals, flags, DOM and V55C storage/helper API retained');
console.log('- V55B source-order algorithm remains character-for-character identical; wrapper waits for settled V53D5 ownership');
console.log('- resume remains outside core; local-resume short circuit and synchronous next boundary retained');
console.log('- local finish cleanup remains finally-protected; result attribution remains outside resume');
console.log('- untouched V57A/V58.1A function-level wrapper composition remains compatible');
