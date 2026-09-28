const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const site = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(site, ...parts), 'utf8');

const html = read('science-v02', 'index.html');
const config = read('science-v02', 'config.js');
const app = read('science-v02', 'app.js');

assert.match(html, /SR Lumapas Science/);
assert.match(html, /Student sign in/);
assert.match(html, /\.\/config\.js/);
assert.match(html, /\.\/app\.js/);

assert.match(config, /rojetehazryfpcxlwtbi\.supabase\.co/,
  'Science V0.2 must use Science Dev Supabase.');
assert.doesNotMatch(config, /lmveznstltjxzpalcmid/,
  'Science V0.2 must not point at the production Maths database.');

for (const phrase of [
  "rpc('science_v02_sign_in'",
  "rpc('science_v02_session'",
  "rpc('science_v02_sign_out'",
  "rpc('science_student_catalog'",
  "rpc('science_student_lesson'",
  'sessionStorage.setItem',
  'credentials: \'omit\''
]) assert(app.includes(phrase), `Missing standalone Science behavior: ${phrase}`);

for (const forbidden of [
  'mathStudentSessionV40',
  'learningPlatformSessionV01',
  'validate_platform_student_access',
  'exchange_math_access_for_platform',
  'platformsubjectaccesschange',
  'location.assign(',
  'window.location='
]) assert(!app.includes(forbidden), `Standalone Science must not contain: ${forbidden}`);

assert(!app.includes('localStorage.setItem'), 'Science token must not be persisted in localStorage.');
assert.match(app, /Student ID or PIN is incorrect/);
assert.match(app, /Science took too long to respond/);

console.log('Science V0.2 standalone checks passed.');
console.log('- Science Dev database only');
console.log('- one-step direct Science sign-in');
console.log('- no Maths/platform session dependency');
console.log('- sessionStorage-only student token');
console.log('- catalog + lesson + logout flow present');
