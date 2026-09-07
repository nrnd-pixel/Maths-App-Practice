const fs = require('fs');
const path = require('path');
const assert = require('assert');

const file = path.join(__dirname, '..', 'viewer-demo', 'index.html');
const source = fs.readFileSync(file, 'utf8');

assert(source.includes('VIEW-STUDENT-01'), 'Student viewer ID missing');
assert(source.includes("pin:'2468',role:'student'"), 'Student viewer PIN/role missing');
assert(source.includes('VIEW-TEACHER-01'), 'Teacher viewer ID missing');
assert(source.includes("pin:'8642',role:'teacher'"), 'Teacher viewer PIN/role missing');
assert(source.includes('VIEWER DEMO · FICTIONAL DATA'), 'Viewer demo warning missing');
assert(source.includes('Viewer Mode · Read only'), 'Teacher read-only warning missing');
assert(source.includes('noindex,nofollow,noarchive'), 'Search-engine exclusion missing');
assert(source.includes("connect-src 'none'"), 'Network CSP boundary missing');
assert(source.includes('disabled>Create Assignment</button>'), 'Teacher write action is not visibly disabled');
assert(source.includes('No real Student IDs or PINs are shown.'), 'Student-access privacy warning missing');

const forbidden = [
  'supabase.co',
  'createClient(',
  '.rpc(',
  'fetch(',
  'XMLHttpRequest',
  'WebSocket(',
  'service_role',
  'sb_publishable_',
  'teacher-email',
  'teacher-password',
  'validate_student_access'
];
for (const token of forbidden) {
  assert(!source.includes(token), `Viewer demo must not contain live authority/network token: ${token}`);
}

console.log('V5.9 demo viewer access safety regression passed.');
