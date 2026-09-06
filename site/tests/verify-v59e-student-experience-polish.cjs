const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const config = fs.readFileSync(path.join(root, 'site', 'config.js'), 'utf8');
const source = fs.readFileSync(path.join(root, 'site', 'v59e-student-experience-polish.js'), 'utf8');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(config.includes("stagedScripts.push('./v59e-student-experience-polish.js');"), 'config must load V5.9E only inside the guarded preview block');
expect(config.indexOf("./v59d-student-experience-preview.js") < config.indexOf("./v59e-student-experience-polish.js"), 'V5.9E must load after V5.9D');

expect(source.includes("get(PARAM) !== '1'"), 'V5.9E must be query guarded');
expect(source.includes('__v59eStudentExperiencePolishInstalled'), 'V5.9E must install once');
expect(source.includes("window.addEventListener('click', capture, true)"), 'V5.9E must capture before document-level V5.9B handlers');

expect(source.includes("prepareHomeLearn(mixed, 'mixed')"), 'Home Mixed Practice must be prepared for direct Learn handoff');
expect(source.includes("button.dataset.v59Action = 'learn'"), 'Home Mixed Practice must bypass the V5.9B Practice hub while preserving V5.9A suspension');
expect(source.includes("setPracticeType('past_paper')"), 'Past Paper selection must reuse the existing V5.5A practice type API');
expect(source.includes('attempt >= 24'), 'Past Paper selection must use a bounded readiness retry');
expect(source.includes('120'), 'Past Paper readiness retry must allow asynchronous option population');

expect(source.includes("'End & save'"), 'Question action must use the safer End & save wording');
expect(source.includes('End practice and save completed questions'), 'Question action must explain what is saved');
expect(source.includes('data-v59e-logout'), 'More must add a Sign out action');
expect(source.includes("getElementById('v40c-student-logout')"), 'Sign out must delegate to the existing V5.8 logout control');
expect(source.includes('latest practice score'), 'Progress must use score wording instead of labelling the extracted percentage accuracy');
expect(source.includes('latest visible Practice score'), 'Progress summary must use safer score wording');

// Stage 1.1 shell cleanup and concept-fidelity checks.
expect(source.includes('body.v59-preview-home-ready .app-theme-bar'), 'signed-in V5.9 preview must hide the legacy floating theme bar');
expect(source.includes('body.v59-preview-home-ready #start>.header'), 'signed-in V5.9 preview must hide the legacy Math Practice header');
expect(source.includes('body.v59-preview-home-ready #start .v39-teacher-zone'), 'signed-in V5.9 preview must hide Teacher access from the student shell');
expect(source.includes('body.v59-preview-home-ready #start>.info'), 'signed-in V5.9 preview must hide the legacy release footer');
expect(source.includes("banner.textContent = 'TEST PREVIEW'"), 'preview safety label must be compact instead of cutting across student content');
expect(source.includes('html[data-theme="dark"]'), 'V5.9E must include dedicated dark-mode concept contrast fixes');
expect(source.includes("'🎉 Weekly Missions Complete!'"), 'completed weekly missions must use a coherent celebratory state');
expect(source.includes("earned.textContent = 'You earned this!'"), 'latest earned badge must receive a student-facing celebration cue');
expect(source.includes("challengeIcon.textContent = '🏆'"), 'class challenge must receive a stronger concept-style visual focal point');
expect(source.includes('data-v59e-theme-toggle'), 'V5.9 Settings must expose Appearance inside the student experience');
expect(source.includes("getElementById('theme-toggle')"), 'V5.9 Appearance must delegate to the existing theme control');

const forbidden = [
  'fetch(',
  'XMLHttpRequest',
  'WebSocket',
  'sendBeacon',
  '.rpc(',
  '.from(',
  'localStorage.setItem',
  'sessionStorage.setItem'
];
for (const token of forbidden) {
  expect(!source.includes(token), `V5.9E must not introduce direct network or persistence path: ${token}`);
}

console.log('V5.9E student experience polish isolation checks passed.');
