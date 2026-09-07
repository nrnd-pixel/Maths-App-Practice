const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'demo', 'index.html');
const source = fs.readFileSync(file, 'utf8');

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

ok(source.includes('Current Live Demo · V5.8.1 baseline'), 'Missing V5.8.1 demo identity');
ok(source.includes('VIEW-STUDENT-01') && source.includes('2468'), 'Missing student viewer code');
ok(source.includes('VIEW-TEACHER-01') && source.includes('8642'), 'Missing teacher viewer code');
ok(source.includes("connect-src 'none'"), 'Network access must be blocked by CSP');
ok(source.includes('noindex,nofollow,noarchive'), 'Demo must stay out of search indexes');
ok(source.includes('Student Learning Hub'), 'Student live-style Home is missing');
ok(source.includes('Teacher Workspace'), 'Teacher V5.8 workspace is missing');
ok(source.includes('Classes & Assignments'), 'Teacher class/assignment view is missing');
ok(source.includes('Question Bank'), 'Teacher question-bank view is missing');
ok(source.includes('Viewer Mode is read-only'), 'Read-only interaction guard is missing');

for (const forbidden of [
  'supabase.co',
  'createClient(',
  '.rpc(',
  'fetch(',
  'XMLHttpRequest',
  'WebSocket(',
  'localStorage.setItem',
  'sessionStorage.setItem'
]) {
  ok(!source.includes(forbidden), `Forbidden live/network/persistence authority found: ${forbidden}`);
}

console.log('V5.8.1 current-live demo isolation checks passed.');
