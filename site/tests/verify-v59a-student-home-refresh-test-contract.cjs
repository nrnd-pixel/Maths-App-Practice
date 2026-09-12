'use strict';
// V5.9A successor — consolidated Student Home integrity + acceptance contract.
// Locks one presentation/navigation layer over the current consolidated owners.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SITE = path.resolve(__dirname, '..');
const ROOT = path.resolve(SITE, '..');
const readSite = name => fs.readFileSync(path.join(SITE, name), 'utf8');
const readRoot = name => fs.readFileSync(path.join(ROOT, name), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const config = readSite('config.js');
const runtime = readSite('v59a-student-home-refresh.js');
const continueHome = readSite('v57c-student-continue-learning-home.js');
const pastPaperCore = readSite('past-paper-core.js');
const gamificationCore = readSite('gamification-core.js');
const gamificationStudent = readSite('gamification-student.js');
const firstUse = readSite('v58a-student-first-use-experience.js');
const feedback = readSite('v576-classroom-feedback-support.js');
const specPath = 'e2e/tests/v59a-student-home-refresh-acceptance.spec.cjs';
const spec = readRoot(specPath);

new vm.Script(runtime, { filename:'v59a-student-home-refresh.js' });
new vm.Script(spec, { filename:specPath });

// 1. Current consolidated owners remain the implementation boundary.
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

// 2. Exactly one successor runtime is loaded, after accepted V5.8 stable.
const loader = "'./v59a-student-home-refresh.js'";
assert((config.match(/\.\/v59a-student-home-refresh\.js/g) || []).length === 1, 'V5.9A runtime must be loaded exactly once');
assert(config.indexOf(loader) > config.indexOf("'./v58-stable-release-checkpoint.js'"), 'V5.9A must layer after V5.8 stable');
assert(config.includes('V5.9A refreshes the signed-in Student Home as one presentation/navigation layer'), 'V5.9A loader narrative missing');
for (const retiredSuccessor of ['v59a1-student-home-design-system.js','v59a2-student-home-mobile-density.js','v59a3-student-home-layout-correction.js','v59a4-student-home-concept-enrichment.js']) {
  assert(!fs.existsSync(path.join(SITE, retiredSuccessor)), `retired V5.9A patch layer must not be recreated: ${retiredSuccessor}`);
  assert(!config.includes(retiredSuccessor), `config must not load retired V5.9A patch layer: ${retiredSuccessor}`);
}

// 3. Runtime identity, stable surfaces and delegated controls.
for (const marker of [
  'V5.9A — Student Home Refresh successor',
  '__v59aStudentHomeRefreshInstalled',
  "const PROFILE_ID = 'v59a-student-profile'",
  "const SHORTCUTS_ID = 'v59a-practice-shortcuts'",
  "const MOBILE_NAV_ID = 'v59a-mobile-nav'",
  "const MORE_SHEET_ID = 'v59a-more-sheet'",
  "data-v59a-student-name",
  "data-v59a-year-class",
  "data-v59a-level",
  "data-v59a-xp-progress",
  "data-v59a-streak",
  "data-v59a-action=\"continue\"",
  "data-v59a-practice-type=\"mixed\"",
  "data-v59a-practice-type=\"topic\"",
  "data-v59a-practice-type=\"past_paper\"",
  "data-v59a-nav=\"home\"",
  "data-v59a-nav=\"practice\"",
  "data-v59a-nav=\"progress\"",
  "data-v59a-nav=\"badges\"",
  "data-v59a-nav=\"more\"",
  "data-v59a-more=\"assignments\"",
  "data-v59a-more=\"reviewed\"",
  "data-v59a-more=\"feedback\"",
  "ROOT.V55APastPaperPractice",
  "api.setPracticeType(type)",
  "document.getElementById('my-assignments-btn')",
  "document.getElementById('my-progress-btn')",
  "document.getElementById('check-reviewed-btn')",
  "document.getElementById('v576-send-feedback')",
  "activeQuiz() && key !== 'practice'",
  "Object.defineProperty(window,'V59AStudentHomeRefresh'",
  'const api = Object.freeze({',
]) assert(runtime.includes(marker), `V5.9A runtime contract missing marker: ${marker}`);

for (const eventName of ['v57c:home-updated','v571a:gamification-updated','v571b:achievements-updated','v572:missions-updated','v573:class-challenge-updated']) {
  assert(runtime.includes(eventName), `V5.9A must refresh after accepted owner event: ${eventName}`);
}

// 4. Presentation-only authority boundary. Delegated clicks are allowed; direct
// browser data/network/persistence/grading/assignment/Exam authority is not.
for (const forbidden of [
  'cloud.rpc(', 'cloud.from(', 'supabase.', 'fetch(', 'localStorage', 'sessionStorage',
  'startPractice(', "getElementById('start-btn')", 'grade_practice_response',
  'request_practice_hint', 'submit_practice_session', 'finalize_exam_attempt',
  'create_teacher_past_paper_assignments', 'update_teacher_past_paper_assignment',
  'save_question_practice_eligibility', 'MutationObserver'
]) assert(!runtime.includes(forbidden), `V5.9A must remain presentation/navigation only: ${forbidden}`);

assert(!/data-v59a-(?:practice-type|nav)=["']exam/i.test(runtime), 'V5.9A must not add an Exam destination');
assert(!/Exam Mode/i.test(runtime), 'V5.9A must not promote Exam Mode');

// 5. Playwright acceptance contract A-H remains real and non-skipped.
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
  'installSupabaseMock(page)', 'signInStudent(page)', 'startPractice(page)',
  'window.V55APastPaperPractice?.getPracticeType?.()',
  'mock.unexpectedWrites.length', 'mock.unhandledRpcCalls.length',
]) assert(spec.includes(marker), `V5.9A Playwright contract missing marker: ${marker}`);

for (const forbidden of ['test.skip(', 'test.fixme(', 'test.only(', 'describe.skip(', 'page.route(']) {
  assert(!spec.includes(forbidden), `V5.9A acceptance coverage must not be weakened/bypass shared mock: ${forbidden}`);
}

console.log('V5.9A Student Home successor integrity contract: PASS');
console.log('- one V5.9A presentation module loads after accepted V5.8 stable');
console.log('- consolidated Past Paper, Continue Learning, gamification, first-use and feedback owners remain authoritative');
console.log('- retired V59A.1–V59A.4 patch chain is not recreated');
console.log('- runtime contains no direct network, persistence, grading, assignment-write or Exam authority');
console.log('- Playwright acceptance gates A–H remain defined and non-skipped');
