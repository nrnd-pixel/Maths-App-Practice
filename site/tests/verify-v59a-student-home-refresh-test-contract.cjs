'use strict';
// V5.9A successor — test-only architecture/acceptance contract.
//
// This verifier is deliberately valid BEFORE the V5.9A runtime exists. It locks
// the current consolidated owners and the Playwright acceptance contract so the
// implementation cannot reintroduce the retired five-layer V59A patch chain or a
// second learning/data engine. It will be upgraded to runtime integrity coverage
// when the single successor presentation module is implemented.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SITE = path.resolve(__dirname, '..');
const ROOT = path.resolve(SITE, '..');
const readSite = name => fs.readFileSync(path.join(SITE, name), 'utf8');
const readRoot = name => fs.readFileSync(path.join(ROOT, name), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const config = readSite('config.js');
const continueHome = readSite('v57c-student-continue-learning-home.js');
const pastPaperCore = readSite('past-paper-core.js');
const gamificationCore = readSite('gamification-core.js');
const gamificationStudent = readSite('gamification-student.js');
const firstUse = readSite('v58a-student-first-use-experience.js');
const feedback = readSite('v576-classroom-feedback-support.js');
const specPath = 'e2e/tests/v59a-student-home-refresh-acceptance.spec.cjs';
const spec = readRoot(specPath);

new vm.Script(spec, { filename: specPath });

// 1. The successor starts from the CURRENT consolidated architecture. Existing
// Phase 4 dormant-reference guards own the negative proof that retired browser
// owners stay retired; this verifier deliberately names only active owners.
for (const loader of [
  "'./past-paper-core.js'",
  "'./past-paper-resume.js'",
  "'./past-paper-results.js'",
  "'./gamification-core.js'",
  "'./gamification-student.js'",
  "'./gamification-teacher.js'",
  "'./v57c-student-continue-learning-home.js'",
  "'./v58a-student-first-use-experience.js'",
  "'./v576-classroom-feedback-support.js'",
]) assert(config.includes(loader), `current consolidated loader missing: ${loader}`);

// 2. Consolidated modules deliberately preserve the compatibility contracts that
// V5.9A is allowed to PRESENT, not own.
for (const marker of [
  "ROOT.__v55aPastPaperPracticeInstalled = true",
  "Object.defineProperty(window,'V55APastPaperPractice'",
  'setPracticeType,',
  "ROOT_ID = 'v55a-practice-source'",
]) assert(pastPaperCore.includes(marker), `past-paper compatibility contract missing: ${marker}`);

for (const marker of [
  "xpCard:'v571a-gamification-card'",
  "achievementCard:'v571b-latest-achievement'",
  "missionsCard:'v572-weekly-missions-card'",
  "classChallengeCard:'v574-class-challenge-card'",
]) assert(gamificationCore.includes(marker), `gamification DOM contract missing: ${marker}`);

for (const marker of [
  '__v571aGamificationFoundationInstalled = true',
  '__v571bStreaksAchievementsInstalled = true',
  '__v572WeeklyMissionsInstalled = true',
  "v571a:gamification-updated",
  "v571b:achievements-updated",
  "v572:missions-updated",
]) assert(gamificationStudent.includes(marker), `gamification compatibility/event contract missing: ${marker}`);

assert(continueHome.includes("window.dispatchEvent(new CustomEvent('v57c:home-updated'"), 'V57C Home update event must remain available');
assert(continueHome.includes("Object.defineProperty(window,'V57CStudentContinueLearningHome'"), 'V57C public API must remain available');
assert(firstUse.includes("const CARD_ID='v58a-first-use-card'"), 'V5.8A first-use card contract missing');
assert(firstUse.includes("document.getElementById('start-btn')"), 'V5.8A must continue delegating to accepted Practice start');
assert(feedback.includes("const STUDENT_TRIGGER_ID='v576-send-feedback'"), 'accepted student feedback trigger contract missing');

// 3. This checkpoint is test-only. No V5.9A runtime layer may be present yet.
const futureRuntimePath = path.join(SITE, 'v59a-student-home-refresh.js');
assert(!fs.existsSync(futureRuntimePath), 'test-only checkpoint must not include the V5.9A runtime yet');
assert(!config.includes("'./v59a-student-home-refresh.js'"), 'test-only checkpoint must not load V5.9A runtime yet');
for (const retiredSuccessor of ['v59a1-student-home-design-system.js','v59a2-student-home-mobile-density.js','v59a3-student-home-layout-correction.js','v59a4-student-home-concept-enrichment.js']) {
  assert(!fs.existsSync(path.join(SITE, retiredSuccessor)), `retired V5.9A patch layer must not be recreated: ${retiredSuccessor}`);
  assert(!spec.includes(retiredSuccessor), `acceptance contract must not depend on retired patch layer: ${retiredSuccessor}`);
}

// 4. The Playwright contract must be real, complete and non-skipped.
for (const marker of [
  "const FUTURE_RUNTIME = 'site/v59a-student-home-refresh.js'",
  "test('A — one presentation module renders profile identity from accepted student + gamification state'",
  "test('B — Continue Learning delegates to the existing V5.7C primary action'",
  "test('C — Mixed, Topic and Past Paper tiles set the accepted Past Paper core Practice type'",
  "test('D — accepted Home owner nodes remain single-source and the V5.8A first-use card is preserved'",
  "test('E — mobile Home / Practice / Progress / Badges / More navigation delegates to accepted controls'",
  "test('F — bottom navigation cannot bypass an active Practice session'",
  "test('G — genuinely new students keep the accepted V5.8A first-Practice path'",
  "test('H — V5.9A adds no Exam promotion and pure Home presentation interactions add no RPC/write authority'",
  'installSupabaseMock(page)',
  'signInStudent(page)',
  'startPractice(page)',
  'window.V55APastPaperPractice?.getPracticeType?.()',
  "#v58a-first-use-card",
  "#v571a-gamification-card",
  "#v572-weekly-missions-card",
  "#v571b-latest-achievement",
  "#v574-class-challenge-card, #v573-class-challenge-card",
  "data-v59a-practice-type",
  "data-v59a-nav",
  "data-v59a-more",
]) assert(spec.includes(marker), `V5.9A Playwright contract missing marker: ${marker}`);

for (const forbidden of ['test.skip(', 'test.fixme(', 'test.only(', 'describe.skip(', 'page.route(']) {
  assert(!spec.includes(forbidden), `V5.9A acceptance coverage must not be weakened/bypass shared mock: ${forbidden}`);
}

// 5. Explicit safety boundaries: no Exam destination and no test-owned authority.
assert(spec.includes("for (const type of ['mixed', 'topic', 'past_paper'])"), 'Practice acceptance set must remain mixed/topic/past_paper only');
assert(spec.includes("for (const key of ['home', 'progress', 'badges', 'more'])"), 'active-Practice navigation guard coverage missing');
assert(spec.includes("text.includes('exam mode')"), 'Exam-promotion negative assertion missing');
assert(spec.includes('mock.unexpectedWrites.length'), 'unexpected-write assertion missing');
assert(spec.includes('mock.unhandledRpcCalls.length'), 'unhandled-RPC assertion missing');

console.log('V5.9A Student Home successor test contract: PASS');
console.log('- current consolidated Past Paper, gamification, Continue Learning, first-use and feedback owners are locked');
console.log('- retired V59A.1–V59A.4 patch chain is explicitly forbidden');
console.log('- Playwright acceptance gates A–H are defined and not skipped');
console.log('- successor is test-only: no V5.9A runtime or loader entry exists yet');
console.log('- implementation boundary remains presentation/delegation only; Exam and new write/RPC authority are forbidden');
