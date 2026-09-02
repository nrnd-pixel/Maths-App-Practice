const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(site, ...parts), 'utf8');

const studentSession = read('platform-student-session-v01.js');
const logoutGuard = read('platform-logout-guard-v01.js');
const signInOwner = read('platform-signin-owner-v01.js');
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
  ['platform-signin-owner-v01.js', signInOwner],
  ['v40-student-session.js', mathsSession],
  ['platform-subject-access-v01.js', subjectAccess],
  ['platform-year-launch-v01.js', yearLaunch],
  ['platform-subject-home-v01.js', subjectHome],
  ['science/platform-session-adapter.js', scienceAdapter],
  ['science/access-denied-polish-v01.js', accessDeniedPolish]
]) new vm.Script(source, { filename:name });

for (const source of [studentSession, logoutGuard, signInOwner, subjectAccess, yearLaunch, subjectHome]) {
  assert(source.includes("host.startsWith('deploy-preview-')"), 'Platform UI must remain deploy-preview gated.');
  assert(source.includes("host.endsWith('--magical-pixie-a61111.netlify.app')"), 'Platform UI must remain isolated from the live hostname.');
}

for (const phrase of [
  "const PLATFORM_KEY = 'learningPlatformSessionV01'",
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
assert.doesNotMatch(
  studentSession,
  /alert\('Mathematics is not enabled for this student\./,
  'Science-only sign-in must not show the legacy Mathematics-disabled alert.'
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
  "button.addEventListener('click', clearPlatformBeforeMathLogout, { capture:true })"
]) assert(logoutGuard.includes(phrase), `Atomic logout guard is missing: ${phrase}`);

for (const phrase of [
  'const platformValidateStudentAccess = validateStudentAccess',
  'event.stopImmediatePropagation()',
  "button.addEventListener('click', captureSignInClick, { capture:true })",
  "pin.addEventListener('keydown', capturePinEnter, { capture:true })",
  "await platformValidateStudentAccess('practice')",
  'function showScienceReady(session)',
  'Science access confirmed',
  'Science is ready',
  'href="/science/"',
  'Open Science →',
  'Signed in securely. Science is ready.'
]) assert(signInOwner.includes(phrase), `Platform Science-ready handoff is missing: ${phrase}`);
assert.doesNotMatch(signInOwner, /window\.location\.assign\('\/science\/'\)/,
  'Science-only authentication must not depend on an async programmatic redirect.');
assert.doesNotMatch(signInOwner, /localStorage\./,
  'Preview sign-in ownership must not persist credentials or session state in localStorage.');

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
  "link.download = 'year_4_science_student_credentials.csv'",
  'does not put the plaintext PIN list into localStorage or sessionStorage'
]) assert(yearLaunch.includes(phrase), `Year 4 launch preparation is missing: ${phrase}`);
assert.doesNotMatch(yearLaunch, /localStorage\.setItem|sessionStorage\.setItem/,
  'Plaintext launch credentials must never be persisted in browser storage.');

for (const phrase of [
  "const PLATFORM_KEY = 'learningPlatformSessionV01'",
  "session.subjects?.maths?.allowed === true",
  "session.subjects?.science?.allowed === true",
  "location.assign('/science/')",
  'Subject access is controlled by your teacher.'
]) assert(subjectHome.includes(phrase), `Subject home is missing: ${phrase}`);

for (const phrase of [
  'Science is not available for your account',
  'Your teacher has not enabled Science for you.',
  '← Return to My Learning',
  "platform?.subjects?.science?.allowed === true"
]) assert(accessDeniedPolish.includes(phrase), `Science access-denied polish is missing: ${phrase}`);

assert.doesNotMatch(config, /science-subject-home\.js/,
  'The retired Science-only subject-home loader must stay removed.');
assert.doesNotMatch(config, /platform-science-only-redirect-v01\.js/,
  'The automatic Science-only redirect module must not be loaded.');
assert.match(config, /\.\/v40-student-session\.js'[\s\S]*\.\/v561-practice-first-student-experience\.js'[\s\S]*\.\/platform-student-session-v01\.js'[\s\S]*\.\/platform-logout-guard-v01\.js'[\s\S]*\.\/platform-signin-owner-v01\.js'/,
  'Platform sign-in must load after the complete Maths stack and own the final preview interaction.');
assert.match(config, /\.\/platform-signin-owner-v01\.js'[\s\S]*\.\/platform-subject-access-v01\.js'[\s\S]*\.\/platform-year-launch-v01\.js'[\s\S]*\.\/platform-subject-home-v01\.js'/,
  'Platform sign-in ownership, controls, Year 4 credential prep and subject home must remain in the expected order.');
assert.match(scienceHtml, /<script src="\.\/platform-session-adapter\.js"><\/script>[\s\S]*<script src="\.\/app\.js"><\/script>[\s\S]*<script src="\.\/access-denied-polish-v01\.js"><\/script>/,
  'Science must load the platform adapter, app and access-denied polish in order.');
assert.match(scienceAdapter, /learningPlatformSessionV01/,
  'Science adapter must consume the platform session rather than requiring a Maths-only identity.');

console.log('Science V0.1 subject-access checks passed.');
console.log('- platform Student ID/PIN session is the final sign-in wrapper');
console.log('- preview sign-in button is capture-owned before legacy Maths listeners');
console.log('- Science-only login uses an explicit normal Open Science link');
console.log('- automatic Science-only async redirect is disabled');
console.log('- atomic logout race regression guarded');
console.log('- class + individual teacher subject controls present');
console.log('- Year 4 credentials can be prepared while classes remain inactive');
console.log('- plaintext Year 4 PINs are not persisted in browser storage');
console.log('- denied Science access has student-friendly messaging');
console.log('- Science uses the platform-session adapter');
