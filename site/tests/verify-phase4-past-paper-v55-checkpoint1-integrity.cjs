const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const site=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const config=read('config.js');
const core=read('past-paper-core.js');
const resume=read('past-paper-resume.js');
const results=read('past-paper-results.js');
const retiredV55b=null; // Phase 5A: v55b-full-paper-practice.js deleted — equivalence check removed
// Phase 5A: v53d5-practice-selection-intelligence.js deleted — direct content check removed.
// The core ownership check below still verifies the install marker reference in past-paper-core.js.
const stable=read('v55-stable-release-checkpoint.js');
const v56b=read('past-paper-assignments.js');
const v56c=read('past-paper-progress.js');
const cross=read('past-paper-cross-device.js');
const v581a=read('v581a-practice-cloud-result-reconciliation.js');

const staged=[...config.matchAll(/'\.\/([^']+\.js)'/g)].map(match=>match[1]);
const pos=name=>staged.indexOf(name);
const retired=[
  'v55a-past-paper-practice.js','v55a1-practice-type-guard.js','v55b-full-paper-practice.js',
  'v55c-resume-past-paper-practice.js','v55c1-resume-button-bridge.js','v55d-past-paper-result-attribution.js'
];
for(const old of retired) assert.equal(pos(old),-1,`${old} must be dormant, not staged`);
for(const active of ['past-paper-core.js','past-paper-resume.js','past-paper-results.js']) assert.ok(pos(active)>=0,`${active} must be staged`);
assert.ok(pos('v54-stable-release-checkpoint.js') < pos('past-paper-core.js'));
assert.ok(pos('past-paper-core.js') < pos('past-paper-resume.js'));
assert.ok(pos('past-paper-resume.js') < pos('past-paper-results.js'));
assert.ok(pos('past-paper-results.js') < pos('v55-stable-release-checkpoint.js'));
assert.ok(pos('v55-stable-release-checkpoint.js') < pos('past-paper-assignments.js'));
assert.ok(pos('past-paper-resume.js') < pos('past-paper-cross-device.js'));
assert.ok(pos('past-paper-results.js') < pos('v581a-practice-cloud-result-reconciliation.js'));

for(const marker of ['__v55aPastPaperPracticeInstalled','__v55a1PracticeTypeGuardInstalled','__v55bFullPaperPracticeInstalled','__v55aPastPaperPracticeWrappersInstalled','__v55bFullPaperPracticeWrappersInstalled']) assert.ok(core.includes(marker),`Core must preserve ${marker}`);
for(const marker of ['__v55cResumePastPaperPracticeInstalled','__v55c1ResumeButtonBridgeInstalled','__v55cResumePastPaperPracticeWrappersInstalled']) assert.ok(resume.includes(marker),`Resume must preserve ${marker}`);
for(const marker of ['__v55dPastPaperResultAttributionInstalled','__v55dPastPaperResultAttributionWrappersInstalled']) assert.ok(results.includes(marker),`Results must preserve ${marker}`);
for(const globalName of ['V55APastPaperPractice','V55A1PracticeTypeGuard','V55BFullPaperPractice']) assert.ok(core.includes(`Object.defineProperty(window,'${globalName}'`)||core.includes(`Object.defineProperty(window, '${globalName}'`));
assert.match(resume,/Object\.defineProperty\(window,\s*'V55CResumePastPaperPractice'/);
assert.match(results,/Object\.defineProperty\(window,\s*'V55DPastPaperResultAttribution'/);

assert.equal((core.match(/const wrappedGetQuestions\s*=\s*async function/g)||[]).length,1);
assert.equal((core.match(/const wrappedShuffle\s*=\s*function/g)||[]).length,1);
assert.equal((core.match(/const wrappedStartPractice\s*=\s*async function/g)||[]).length,1);
assert.doesNotMatch(core,/wrappedNextQuestion|wrappedFinishPractice|wrappedResultRecord/);
assert.match(core,/const matched = .*\.filter\(item => matchesPaper\(item, year, paper\)\)/);
assert.match(core,/return matched\.filter\(isPastPaperItem\)/);
assert.match(core,/if \(fullRunActive && isPastPaperPractice\(\)\) return sortSourceOrder\(items\)/);
assert.match(core,/V53D3PracticeSelection/);
assert.match(core,/orderPracticeItems\(items, Math\.random\)/);
assert.match(core,/TEMP_COUNT_VALUE = '999'/);
assert.match(core,/fullRunActive = true[\s\S]*await runFreshStart[\s\S]*finally \{[\s\S]*fullRunActive = false/);
assert.match(core,/Choose a strand or topic before starting Topic Practice/);
assert.match(core,/Choose a past paper year and paper before starting Practice/);
assert.match(core,/state\.v55a_practice_type = practiceType/);
assert.match(core,/state\.v55a_exam_year = selectedYear\(\)/);
assert.match(core,/state\.v55a_paper = selectedPaper\(\)/);
assert.match(core,/state\.v55b_paper_scope = 'all_available'/);

function orderingBlock(source){
  const start=source.indexOf('  function questionOrderKey(item){');
  const sortStart=source.indexOf('  function sortSourceOrder(items){',start);
  const end=source.indexOf('\n\n  function ',sortStart+1);
  assert.ok(start>=0&&sortStart>start&&end>sortStart,'Could not isolate V55B source-order functions');
  return source.slice(start,end);
}
// Phase 5A: source-equivalence check against v55b-full-paper-practice.js removed (file deleted).
assert.match(core,/function selectionStackSettled\(\)[\s\S]*__v53d5PracticeSelectionInstalled[\s\S]*__v53d5PracticeSelectionRpcBridge/);
assert.match(core,/if \(!selectionStackSettled\(\)\) return false;/);

assert.match(resume,/if \(!ROOT\.__phase4PastPaperCoreWrappersInstalled\) return false/);
assert.equal((resume.match(/const wrappedStartPractice\s*=\s*async function/g)||[]).length,1);
assert.equal((resume.match(/const wrappedNextQuestion\s*=\s*function/g)||[]).length,1);
assert.equal((resume.match(/const wrappedFinishPractice\s*=\s*async function/g)||[]).length,1);
assert.doesNotMatch(resume,/wrappedNextQuestion\s*=\s*async|async function\s+wrappedNextQuestion/);
assert.match(resume,/if \(resumeRequested && found\)[\s\S]*if \(await restoreFromCheckpoint\(found\)\) return;[\s\S]*await baseStartPractice\.apply/);
assert.match(resume,/const wrappedNextQuestion = function\(\.\.\.args\)\{\s*checkpointCurrentBoundary\(\);\s*return baseNextQuestion\.apply\(this, args\);/);
assert.match(resume,/const wrappedFinishPractice = async function[\s\S]*try \{[\s\S]*return await baseFinishPractice\.apply[\s\S]*\} finally \{[\s\S]*removeCheckpoint\(key\)/);
assert.match(resume,/button\.onclick = \(\) => ROOT\.nextQuestion\(\)/);
assert.match(resume,/button\.dataset\.v55cResumeBridge = 'true'/);
assert.doesNotMatch(resume,/exam-next-btn/);

for(const helper of ['STORAGE_KEY','VERSION','MAX_AGE_MS','identityKey','checkpointIsFresh','pruneStore','questionItemId','questionItemIds','safeAnswer','buildCheckpoint','applyCheckpointToItems','rehydrateAnswers','readStore','writeStore']) assert.ok(resume.includes(helper),`Resume compatibility API missing ${helper}`);
assert.match(resume,/const STORAGE_KEY = 'mathPastPaperResumeV55C'/);
for(const forbidden of ['correctAnswer:q.answer','explanation:q.explanation','access_token','student-pin']) assert.doesNotMatch(resume,new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));

assert.equal((results.match(/const wrappedResultRecord\s*=\s*function/g)||[]).length,1);
assert.equal((results.match(/const wrappedFinishPractice\s*=\s*async function/g)||[]).length,1);
assert.match(results,/const baseFinishPractice = finishPractice/);
assert.match(results,/const output = await baseFinishPractice\.apply\(this, args\);[\s\S]*updateStudentResultContext/);
assert.doesNotMatch(results,/catch\s*\([^)]*\)\s*\{[^}]*return output/);
for(const token of ["practice_mode:'past_paper'",'exam_year:examYear','paper,',"strand:'mixed'",'topic:pastPaperLabel']) assert.ok(results.includes(token),`Past Paper result attribution missing ${token}`);

for(const token of ['v55a-practice-source','v55a-paper-panel','v55a-paper-year','v55a-paper-name','v55a-paper-note','v55a-practice-type','v55a-source-grid','v55a-paper-grid','v55b-paper-scope','v55b-paper-scope-btn','v55b-paper-scope-info','v55b-scope-grid','v55c-resume-card','v55c-card','v55c-head','v55c-actions','v55c-progress','v55c-help','data-v55c-resume','data-v55c-discard']) assert.ok((core+'\n'+resume).includes(token),`V55 compatibility DOM token missing: ${token}`);

// Current consolidated downstream owner must still consume the exact V55 function/API boundary.
assert.match(cross,/if \(!ROOT\.__v55cResumePastPaperPracticeWrappersInstalled\) return false/);
assert.match(cross,/const baseStart = typeof ROOT\.startPractice === 'function' \? ROOT\.startPractice : null/);
assert.match(cross,/const baseNext = typeof ROOT\.nextQuestion === 'function' \? ROOT\.nextQuestion : null/);
assert.match(cross,/const wrappedNext = function\(\.\.\.args\)/);
assert.match(cross,/const result = baseNext\.apply\(this,args\);[\s\S]*if \(snapshot\) void saveBoundary/);
assert.match(v581a,/const base = typeof ROOT\.finishPractice === 'function'/);
assert.match(v581a,/const output = await base\.apply\(this,args\)/);
assert.match(v56b,/V55APastPaperPractice/);
assert.match(v56b,/V55BFullPaperPractice/);
assert.match(v56b,/ROOT\.startPractice/);
assert.match(v56c,/V55CResumePastPaperPractice/);
assert.match(v56c,/v55c-resume-card/);
assert.match(cross,/V55CResumePastPaperPractice/);

for(const marker of ['__v55aPastPaperPracticeInstalled','__v55bFullPaperPracticeInstalled','__v55cResumePastPaperPracticeInstalled','__v55c1ResumeButtonBridgeInstalled','__v55dPastPaperResultAttributionInstalled']) assert.ok(stable.includes(marker),`Stable checkpoint must still consume ${marker}`);
const active=[core,resume,results].join('\n');
assert.doesNotMatch(active,/grade_practice_response|request_practice_hint|finalize_exam_attempt|save_exam_attempt/);
assert.doesNotMatch(active,/cloud\.from\('practice_sessions'\)|cloud\.from\('session_answers'\)/);

console.log('Phase 4 Past Paper V55 Checkpoint 1 integrity checks passed.');
console.log('- V55 core/resume/results ownership and V53D5 shuffle-settling contract remain intact');
console.log('- current consolidated V56/V57 owners consume the same frozen V55 compatibility surface');
console.log('- V58.1A remains the later finishPractice reconciliation wrapper');
