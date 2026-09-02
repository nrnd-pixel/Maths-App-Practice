const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(site, ...parts), 'utf8');

const studentSession = read('platform-student-session-v01.js');
const mathsSession = read('v40-student-session.js');
const subjectAccess = read('platform-subject-access-v01.js');
const subjectHome = read('platform-subject-home-v01.js');
const scienceAdapter = read('science', 'platform-session-adapter.js');
const config = read('config.js');
const scienceHtml = read('science', 'index.html');

for (const [name, source] of [
  ['platform-student-session-v01.js', studentSession],
  ['v40-student-session.js', mathsSession],
  ['platform-subject-access-v01.js', subjectAccess],
  ['platform-subject-home-v01.js', subjectHome],
  ['science/platform-session-adapter.js', scienceAdapter]
]) new vm.Script(source, { filename:name });

for (const source of [studentSession, subjectAccess, subjectHome]) {
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
  /if \(!mathsAllowed\(platformSession\)\)[\s\S]*if \(pin\) pin\.value = '';/,
  'Science-only sign-in must still clear the PIN immediately.'
);
assert.match(
  mathsSession,
  /finally \(\) =>|finally\s*\{[\s\S]*pin\.value = '';/,
  'The existing Maths session must retain responsibility for clearing the PIN after ticket issuance.'
);

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
  "const PLATFORM_KEY = 'learningPlatformSessionV01'",
  "session.subjects?.maths?.allowed === true",
  "session.subjects?.science?.allowed === true",
  "subject:'maths'",
  "subject:'science'",
  "location.assign('/science/')",
  'Subject access is controlled by your teacher.'
]) assert(subjectHome.includes(phrase), `Subject home is missing: ${phrase}`);

assert.doesNotMatch(subjectHome, /position\s*:\s*fixed/i,
  'The old floating Science launcher must not return.');
assert.doesNotMatch(config, /science-subject-home\.js/,
  'The retired Science-only subject-home loader must stay removed.');
assert.match(config, /\.\/v40-student-session\.js'[\s\S]*\.\/platform-student-session-v01\.js'/,
  'Platform identity must layer after the existing V4.0 student session.');
assert.match(config, /\.\/v56-stable-release-checkpoint\.js'[\s\S]*\.\/v561-practice-first-student-experience\.js'[\s\S]*\.\/platform-subject-access-v01\.js'[\s\S]*\.\/platform-subject-home-v01\.js'/,
  'Subject controls/home must layer after the complete V5.6.1 Maths release stack.');
assert.match(scienceHtml, /<script src="\.\/platform-session-adapter\.js"><\/script>[\s\S]*<script src="\.\/app\.js"><\/script>/,
  'Science must load the platform-session adapter before its app.');
assert.match(scienceHtml, /class="subject-switcher" href="\/"[^>]*>← All subjects<\/a>/,
  'Science must provide a native same-tab route back to the subject home.');
assert.match(scienceAdapter, /learningPlatformSessionV01/,
  'Science adapter must consume the platform session rather than requiring a Maths-only identity.');

console.log('Science V0.1 subject-access checks passed.');
console.log('- preview-host isolation retained');
console.log('- platform Student ID/PIN session present');
console.log('- duplicate PIN prompt regression guarded');
console.log('- class + individual teacher subject controls present');
console.log('- student subject home renders only allowed subjects');
console.log('- Science uses the platform-session adapter');
console.log('- latest V5.6.1 Maths loader remains in front of preview platform modules');
