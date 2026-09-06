'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const config = fs.readFileSync(path.join(root, 'site', 'config.js'), 'utf8');
const source = fs.readFileSync(path.join(root, 'site', 'v59g-student-home-visual-fidelity.js'), 'utf8');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(config.includes("stagedScripts.push('./v59g-student-home-visual-fidelity.js');"), 'config must load V5.9G in the guarded preview block');
expect(config.indexOf("./v59f-student-home-concept-polish.js") < config.indexOf("./v59g-student-home-visual-fidelity.js"), 'V5.9G must load after V5.9F');
expect(source.includes("get(PARAM) !== '1'"), 'V5.9G must be query guarded');
expect(source.includes('__v59gStudentHomeVisualFidelityInstalled'), 'V5.9G must install once');
expect(source.includes('v59g-journey-art'), 'Continue Learning must receive the learning-journey artwork');
expect(source.includes('v59g-step s1'), 'Learning journey must include visible progress steps');
expect(source.includes('v59g-star'), 'Learning journey must include the goal star');
expect(source.includes('v59g-flag'), 'Learning journey must include the goal flag');
expect(source.includes("['mixed','[data-v59-action=\"mixed\"]']"), 'Mixed Practice icon must be visually upgraded');
expect(source.includes("['topic','[data-v59-action=\"topic\"]']"), 'Topic Practice icon must be visually upgraded');
expect(source.includes("['paper','[data-v59-action=\"past_paper\"]']"), 'Past Papers icon must be visually upgraded');
expect(source.includes('v59g-badge-card'), 'Latest badge must receive celebratory visual treatment');
expect(source.includes("content:'🏆'"), 'Class Challenge must receive a larger trophy treatment');
expect(source.includes('html[data-theme="dark"]'), 'Visual fidelity layer must preserve explicit dark-mode treatment');
expect(source.includes('v59-welcome-wrap:before'), 'Header must include the concept-style mountain layer');
expect(source.includes('v59-avatar:after'), 'Avatar must receive the concept-style achievement accent');

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
  expect(!source.includes(token), `V5.9G must not introduce direct network/data persistence: ${token}`);
}

console.log('V5.9G student home visual fidelity isolation checks passed.');
