'use strict';
const fs = require('fs');
const vm = require('vm');

const file = 'site/demo-student/index.html';
const src = fs.readFileSync(file, 'utf8');

function assert(condition, message){
  if (!condition) throw new Error(message);
}

assert(src.includes('Student Question Demo'), 'student question demo identity missing');
assert(src.includes('VIEW-STUDENT-01'), 'viewer ID missing');
assert(src.includes('2468'), 'viewer PIN missing');
assert(src.includes('connect-src \'none\''), 'network-blocking CSP missing');
assert(src.includes('noindex,nofollow,noarchive'), 'robots isolation missing');
assert(src.includes('2025 Paper 1'), 'real question source snapshot missing');
assert(src.includes('up to two attempts'), 'Practice-style two-attempt behaviour missing');
assert(src.includes('Check Answer'), 'question interaction missing');
assert(src.includes('Show Hint'), 'hint interaction missing');
assert(src.includes('Demo Practice Complete'), 'completion screen missing');

[
  'supabase.',
  'cloud.rpc(',
  'cloud.from(',
  'fetch(',
  'XMLHttpRequest',
  'WebSocket',
  'localStorage.',
  'sessionStorage.'
].forEach(token => assert(!src.includes(token), `forbidden live/persistent capability found: ${token}`));

const scriptMatches = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert(scriptMatches.length === 1, 'expected one inline script');
new vm.Script(scriptMatches[0][1], { filename: file });

console.log('PASS: V5.8.1 Student Question Demo is interactive, static, and isolated from live data.');
