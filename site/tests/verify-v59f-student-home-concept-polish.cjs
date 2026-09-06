'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const config = fs.readFileSync(path.join(root, 'site', 'config.js'), 'utf8');
const source = fs.readFileSync(path.join(root, 'site', 'v59f-student-home-concept-polish.js'), 'utf8');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(config.includes("stagedScripts.push('./v59f-student-home-concept-polish.js');"), 'config must load V5.9F in the guarded preview block');
expect(config.indexOf("./v59e-student-experience-polish.js") < config.indexOf("./v59f-student-home-concept-polish.js"), 'V5.9F must load after V5.9E');
expect(source.includes("get(PARAM) !== '1'"), 'V5.9F must be query guarded');
expect(source.includes('__v59fStudentHomeConceptPolishInstalled'), 'V5.9F must install once');
expect(source.includes("getElementById('theme-toggle')"), 'Visible preview theme control must delegate to the existing V5.8 theme control');
expect(source.includes('v59f-theme-toggle'), 'Home must expose a visible theme toggle');
expect(source.includes('Weekly Missions Complete!'), 'Completed weekly missions need a clear celebratory state');
expect(source.includes('You earned this!'), 'Latest badge needs an earned-state message');
expect(source.includes("icon.textContent = '🏆'"), 'Class challenge should receive the concept-style trophy emphasis');
expect(source.includes('👋'), 'Greeting should carry the concept-style friendly wave');

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
  expect(!source.includes(token), `V5.9F must not introduce direct network/data persistence: ${token}`);
}

console.log('V5.9F student home concept polish isolation checks passed.');
