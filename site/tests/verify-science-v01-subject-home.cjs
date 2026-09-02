const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(site, ...parts), 'utf8');

const studentSession = read('platform-student-session-v01.js');
const mathsSession = read('v40-student-session.js');
const signInGuard = read('v41-signin-guard.js');
const topicalResult = read('v52c2-topical-result-ux.js');
const subjectAccess = read('platform-subject-access-v01.js');
const yearLaunch = read('platform-year-launch-v01.js');
const subjectHome = read('platform-subject-home-v01.js');
const scienceAdapter = read('science', 'platform-session-adapter.js');
const accessDeniedPolish = read('science', 'access-denied-polish-v01.js');
const config = read('config.js');
const scienceHtml = read('science', 'index.html');
const redirects = read('_redirects');
const clientTicketSql = read('..', 'supabase', 'platform_student_client_ticket_v02.sql');

for (const [name, source] of [
  ['platform-student-session-v01.js', studentSession],
  ['v40-student-session.js', mathsSession],
  ['v41-signin-guard.js', signInGuard],
  ['v52c2-topical-result-ux.js', topicalResult],
  ['platform-subject-access-v01.js', subjectAccess],
  ['platform-year-launch-v01.js', yearLaunch],
  ['platform-subject-home-v01.js', subjectHome],
  ['science/platform-session-adapter.js', scienceAdapter],
  ['science/access-denied-polish-v01.js', accessDeniedPolish]
]) new vm.Script(source, { filename:name });

for (const source of [studentSession, subjectAccess, yearLaunch, subjectHome]) {
  assert(source.includes("host.startsWith('deploy-preview-')"), 'Platform UI must remain deploy-preview gated.');
  assert(source.includes("host.endsWith('--magical-pixie-a61111.netlify.app')"), 'Platform UI must remain isolated from the live hostname.');
}

for (const phrase of [
  "const PLATFORM_KEY = 'learningPlatformSessionV01'",
  "sendPlatformRpcWithoutWaiting('validate_platform_student_access_v02'",
  "'claim_platform_student_access_v02'",
  "callPlatformRpc('get_student_subject_access'",
  "validate_platform_student_access_v02: '/api/platform/begin-student-v02'",
  "claim_platform_student_access_v02: `${String(window.MATH_APP_CONFIG?.supabaseUrl || '').replace(/\\\/$/,'')}/rest/v1/rpc/claim_platform_student_access_v02`",
  "exchange_math_access_for_platform: '/api/platform/exchange-math'",
  "get_student_subject_access: '/api/platform/subject-access'",
  'const platformFetch = typeof window.MATH_APP_NATIVE_FETCH',
  'const response = await Promise.race([',
  "cache: 'no-store'",
  "credentials: String(endpoint || '').startsWith('/') ? 'same-origin' : 'omit'",
  'Verifying your Learning Platform access…',
  'Access confirmed. Preparing My Learning…',
  'const RPC_TIMEOUT_MS = 15 * 1000',
  'const mathValidateStudentAccess = validateStudentAccess',
  'if (!mathsAllowed(session))',
  'const mathAccess = await mathValidateStudentAccess(purpose)',
  'addMathAccessTransform(transform)',
  "signIn.addEventListener('click', captureSignIn, { capture:true })",
  "pin.addEventListener('keydown', capturePinEnter, { capture:true })",
  "logout.addEventListener('click', captureLogout, { capture:true })",
  'event.stopImmediatePropagation()',
  'let logoutInProgress = false'
]) assert(studentSession.includes(phrase), `Platform student session is missing: ${phrase}`);

assert.match(
  studentSession,
  /if \(!mathsAllowed\(session\)\)[\s\S]*?if \(pin\) pin\.value = '';/,
  'Science-only sign-in must clear the PIN immediately.'
);
assert.doesNotMatch(studentSession, /window\.location|location\.assign|location\.replace/,
  'Authentication must never navigate automatically.');
assert.doesNotMatch(studentSession, /localStorage\./,
  'Platform sign-in must not persist credentials or session state in localStorage.');
assert.match(signInGuard, /window\.platformStudentSessionV01\?\.signIn/,
  'The older Enter-key guard must yield to the platform controller on previews.');
assert.match(topicalResult, /controller\.addMathAccessTransform\(applyOverride\)/,
  'Late topical ticket rotation must register with the platform controller instead of replacing it.');
assert.match(
  mathsSession,
  /finally\s*\{[\s\S]*?const pin = document\.getElementById\('student-pin'\);[\s\S]*?if \(pin\) pin\.value = '';/,
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
  "href:'/science/'",
  'Subject access is controlled by your teacher.'
]) assert(subjectHome.includes(phrase), `Subject home is missing: ${phrase}`);
assert.doesNotMatch(subjectHome, /location\.(assign|replace)\('\/science\/'\)/,
  'Science must open only through the normal subject anchor.');
assert.doesNotMatch(subjectHome, /MutationObserver|window\.addEventListener\('focus'/,
  'The subject home must remain a pure renderer; the session controller owns refresh.');

for (const phrase of [
  'Science is not available for your account',
  'Your teacher has not enabled Science for you.',
  '← Return to My Learning',
  "platform?.subjects?.science?.allowed === true"
]) assert(accessDeniedPolish.includes(phrase), `Science access-denied polish is missing: ${phrase}`);

assert.doesNotMatch(config, /science-subject-home\.js|platform-science-only-redirect-v01\.js/,
  'Retired subject-home and redirect modules must stay removed.');
assert.doesNotMatch(config, /platform-(?:logout-guard|signin-owner)-v01\.js/,
  'Retired sign-in/logout wrapper modules must not be loaded.');
assert.match(config, /\.\/v40-student-session\.js'[\s\S]*\.\/v561-practice-first-student-experience\.js'[\s\S]*\.\/platform-student-session-v01\.js\?v=science-v01-ticket3'/,
  'The single platform session controller must load after the complete Maths stack.');
assert.match(config, /\.\/platform-student-session-v01\.js\?v=science-v01-ticket3'[\s\S]*\.\/platform-subject-access-v01\.js'[\s\S]*\.\/platform-year-launch-v01\.js'[\s\S]*\.\/platform-subject-home-v01\.js'/,
  'Platform session, controls, Year 4 credential prep and subject home must remain in the expected order.');
assert.match(scienceHtml, /<script src="\.\/platform-session-adapter\.js"><\/script>[\s\S]*<script src="\.\/app\.js"><\/script>[\s\S]*<script src="\.\/access-denied-polish-v01\.js"><\/script>/,
  'Science must load the platform adapter, app and access-denied polish in order.');
assert.match(scienceAdapter, /learningPlatformSessionV01/,
  'Science adapter must consume the platform session rather than requiring a Maths-only identity.');

for (const route of [
  '/api/platform/begin-student-v02  https://lmveznstltjxzpalcmid.supabase.co/rest/v1/rpc/validate_platform_student_access_v02  200',
  '/api/platform/exchange-math     https://lmveznstltjxzpalcmid.supabase.co/rest/v1/rpc/exchange_math_access_for_platform     200',
  '/api/platform/subject-access    https://lmveznstltjxzpalcmid.supabase.co/rest/v1/rpc/get_student_subject_access            200'
]) assert(redirects.includes(route), `Same-origin platform proxy is missing: ${route}`);
assert.equal(
  redirects.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#')).length,
  3,
  'The preview proxy must expose only the three required platform RPCs.'
);

for (const phrase of [
  'create or replace function public.validate_platform_student_access_v02(',
  "v_token !~ '^[0-9a-f]{64}$'",
  'on conflict (token_hash) do nothing',
  'create or replace function public.claim_platform_student_access_v02(',
  "return jsonb_build_object('r',false)",
  "grant execute on function public.validate_platform_student_access_v02(text,text,text,text,smallint,text) to anon, authenticated",
  "grant execute on function public.claim_platform_student_access_v02(text) to anon, authenticated"
]) assert(clientTicketSql.includes(phrase), `Client-activated ticket SQL is missing: ${phrase}`);

console.log('Science V0.1 subject-access checks passed.');
console.log('- one platform-first controller owns sign-in and coordinated logout');
console.log('- preview sign-in is capture-owned before legacy Maths listeners');
console.log('- Science opens only from an explicit normal anchor');
console.log('- class + individual teacher subject controls remain present');
console.log('- Science continues to consume the backend-enforced platform session');
