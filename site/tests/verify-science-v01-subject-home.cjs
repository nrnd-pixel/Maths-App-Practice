const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(site, ...parts), 'utf8');

const studentSession = read('platform-student-session-v01.js');
const logoutGuard = read('platform-logout-guard-v01.js');
const mathsSession = read('v40-student-session.js');
const subjectAccess = read('platform-subject-access-v01.js');
const yearLaunch = read('platform-year-launch-v01.js');
const subjectHome = read('platform-subject-home-v01.js');
const scienceAdapter = read('science', 'platform-session-adapter.js');
const accessDeniedPolish = read('science', 'access-denied-polish-v01.js');
const config = read('config.js');
const scienceHtml = read('science', 'index.html');

for (const [name, source] of [
  ['platform-student-session-v01.js', studentSession],
  ['platform-logout-guard-v01.js', logoutGuard],
  ['v40-student-session.js', mathsSession],
  ['platform-subject-access-v01.js', subjectAccess],
  ['platform-year-launch-v01.js', yearLaunch],
  ['platform-subject-home-v01.js', subjectHome],
  ['science/platform-session-adapter.js', scienceAdapter],
  ['science/access-denied-polish-v01.js', accessDeniedPolish]
]) new vm.Script(source, { filename:name });

for (const source of [studentSession, logoutGuard, subjectAccess, yearLaunch, subjectHome]) {
  assert(source.includes("host.startsWith('deploy-preview-')"), 'Platform UI must remain deploy-preview gated.');
  assert(source.includes("host.endsWith('--magical-pixie-a61111.netlify.app')"), 'Platform UI must remain isolated from the live hostname.');
}

for (const phrase of [
  "const PLATFORM_KEY = 'learningPlatformSessionV01'",
  "const START_VIEW_KEY = 'v40StartView'",
  "cloud.rpc('validate_platform_student_access'",
  "cloud.rpc('get_student_subject_access'",
  "if (!mathsAllowed(platformSession))",
  'return mathValidateStudentAccess(purpose)'
]) assert(studentSession.includes(phrase), `Platform student session is missing: ${phrase}`);

assert.doesNotMatch(
  studentSession,
  /if \(pin\) \{\s*pin\.disabled = true;\s*pin\.value = '';\s*\}/,
  'Platform rendering must not clear the PIN before the existing Maths session validator can issue its tickets.'
);
assert.match(
  studentSession,
  /if \(!mathsAllowed\(platformSession\)\)[\s\S]*?if \(pin\) pin\.value = '';/,
  'Science-only sign-in must still clear the PIN immediately.'
);
assert.match(
  studentSession,
  /if \(!mathsAllowed\(platformSession\)\)[\s\S]*?Signed in\. Choose an available subject from My Learning\.[\s\S]*?platformsubjectaccesschange[\s\S]*?return null;/,
  'Science-only sign-in must complete the Learning Hub session without issuing a Maths capability.'
);
assert.doesNotMatch(
  studentSession,
  /alert\('Mathematics is not enabled for this student\./,
  'Science-only sign-in must not show the legacy Mathematics-disabled alert.'
);
for (const phrase of [
  'function enterPlatformHome()',
  "if (typeof show === 'function') show('start')",
  "start.classList.add('v40-shell-authenticated')",
  "start.classList.remove('v40-shell-logged-out')",
  "start.dataset.v40StartView = 'home'",
  "sessionStorage.setItem(START_VIEW_KEY, 'home')",
  'enterPlatformHome();'
]) assert(studentSession.includes(phrase), `Science-only home transition is missing: ${phrase}`);
assert.match(
  studentSession,
  /if \(!mathsAllowed\(session\)\)[\s\S]*?enterPlatformHome\(\);/,
  'A restored or newly signed-in Science-only platform session must explicitly enter My Learning Home.'
);
assert.match(
  mathsSession,
  /finally\s*\{[\s\S]*?const pin = document\.getElementById\('student-pin'\);[\s\S]*?if \(pin\) pin\.value = '';/,
  'The existing Maths session must retain responsibility for clearing the PIN after ticket issuance.'
);

for (const phrase of [
  'let logoutInProgress = false',
  'if (logoutInProgress) return null',
  "window.platformStudentSessionV01?.clear",
  "button.addEventListener('click', clearPlatformBeforeMathLogout, { capture:true })",
  'setTimeout(() => {'
]) assert(logoutGuard.includes(phrase), `Atomic logout guard is missing: ${phrase}`);

for (const phrase of [
  'Permission precedence: student override > class setting > platform default.',
  "tab.textContent = 'Subject Access'",
  'Maths only',
  'Science only',
  'Both subjects',
  'Individual student overrides',
  'teacher_set_class_subject_access',
  'teacher_set_student_subject_access_override',
  'teacher_set_year_subject_access'
]) assert(subjectAccess.includes(phrase), `Teacher subject access is missing: ${phrase}`);

for (const phrase of [
  'Year 4 credential setup',
  'Generate 6-digit Year 4 PINs',
  "cloud.rpc('teacher_year_launch_overview_v01'",
  "cloud.rpc('teacher_generate_year_pins_v01'",
  'classes are still inactive',
  "link.download = 'year_4_science_student_credentials.csv'",
  'beforeunload',
  'does not put the plaintext PIN list into localStorage or sessionStorage'
]) assert(yearLaunch.includes(phrase), `Year 4 launch preparation is missing: ${phrase}`);
assert.doesNotMatch(yearLaunch, /localStorage\.setItem|sessionStorage\.setItem/,
  'Plaintext launch credentials must never be persisted in browser storage.');
assert.doesNotMatch(yearLaunch, /activate.*class|teacher_set_class_active/i,
  'Credential preparation must not activate Year 4 classes.');

for (const phrase of [
  "const PLATFORM_KEY = 'learningPlatformSessionV01'",
  "session.subjects?.maths?.allowed === true",
  "session.subjects?.science?.allowed === true",
  "subject:'maths'",
  "subject:'science'",
  "location.assign('/science/')",
  'Subject access is controlled by your teacher.'
]) assert(subjectHome.includes(phrase), `Subject home is missing: ${phrase}`);

for (const phrase of [
  'Science is not available for your account',
  'Your teacher has not enabled Science for you.',
  '← Return to My Learning',
  "platform?.subjects?.science?.allowed === true",
  "window.location.assign('../')"
]) assert(accessDeniedPolish.includes(phrase), `Science access-denied polish is missing: ${phrase}`);

assert.doesNotMatch(subjectHome, /position\s*:\s*fixed/i,
  'The old floating Science launcher must not return.');
assert.doesNotMatch(config, /science-subject-home\.js/,
  'The retired Science-only subject-home loader must stay removed.');
assert.match(config, /\.\/v40-student-session\.js'[\s\S]*\.\/platform-student-session-v01\.js'[\s\S]*\.\/platform-logout-guard-v01\.js'/,
  'Platform identity and atomic logout guard must layer after the existing V4.0 student session.');
assert.match(config, /\.\/v56-stable-release-checkpoint\.js'[\s\S]*\.\/v561-practice-first-student-experience\.js'[\s\S]*\.\/platform-subject-access-v01\.js'[\s\S]*\.\/platform-year-launch-v01\.js'[\s\S]*\.\/platform-subject-home-v01\.js'/,
  'Subject controls, Year 4 credential prep and subject home must layer after the complete V5.6.1 Maths release stack.');
assert.match(scienceHtml, /<script src="\.\/platform-session-adapter\.js"><\/script>[\s\S]*<script src="\.\/app\.js"><\/script>[\s\S]*<script src="\.\/access-denied-polish-v01\.js"><\/script>/,
  'Science must load the platform adapter, app and access-denied polish in order.');
assert.match(scienceHtml, /class="subject-switcher" href="\/"[^>]*>← All subjects<\/a>/,
  'Science must provide a native same-tab route back to the subject home.');
assert.match(scienceAdapter, /learningPlatformSessionV01/,
  'Science adapter must consume the platform session rather than requiring a Maths-only identity.');

console.log('Science V0.1 subject-access checks passed.');
console.log('- preview-host isolation retained');
console.log('- platform Student ID/PIN session present');
console.log('- duplicate PIN prompt regression guarded');
console.log('- Science-only sign-in completes without a Maths alert or capability');
console.log('- Science-only sign-in explicitly enters My Learning Home');
console.log('- atomic logout race regression guarded');
console.log('- class + individual teacher subject controls present');
console.log('- Year 4 credentials can be prepared while classes remain inactive');
console.log('- plaintext Year 4 PINs are not persisted in browser storage');
console.log('- student subject home renders only allowed subjects');
console.log('- denied Science access has student-friendly messaging');
console.log('- Science uses the platform-session adapter');
console.log('- latest V5.6.1 Maths loader remains in front of preview platform modules');
