'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..', '..');
const site = path.join(root, 'site');
const index = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
const config = fs.readFileSync(path.join(site, 'config.js'), 'utf8');
const experience = fs.readFileSync(path.join(site, 'v59d-student-experience-preview.js'), 'utf8');

function ok(condition, message){ if (!condition) throw new Error(message); }
function gitBlobSha(text){
  const body = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${body.length}\0`), body])).digest('hex');
}

ok(gitBlobSha(index) === '607f3d950a88117b496aa158fea30ce3994b918c', 'site/index.html differs from exact V5.8 Stable.');
ok(experience.includes("get(PARAM) !== '1'"), 'V5.9D must self-guard behind the explicit preview flag.');
ok(config.includes("stagedScripts.push('./v59d-student-experience-preview.js')"), 'config.js must load V5.9D in preview mode.');
ok((config.match(/v59d-student-experience-preview\.js/g) || []).length === 1, 'V5.9D should be referenced exactly once in config.js.');
ok(config.indexOf("./v59d-student-experience-preview.js") > config.indexOf("./v59c-student-quiz-result-preview.js"), 'V5.9D must load after V5.9C.');

[
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bsendBeacon\b/,
  /\bcloud\s*\./,
  /\.rpc\s*\(/,
  /\.from\s*\(/,
  /localStorage\.setItem/,
  /sessionStorage\.setItem/
].forEach(pattern => ok(!pattern.test(experience), `V5.9D contains forbidden direct data/network behavior: ${pattern}`));

// Full concept-route coverage added in V5.9D.
[
  'Your progress',
  'Topics practised',
  'Current streak',
  'Your topic journey',
  'This week',
  'Your badges',
  'Weekly missions',
  'Class challenge',
  'More',
  'Settings',
  'Notifications',
  'About this preview',
  'Need a hand?'
].forEach(label => ok(experience.includes(label), `V5.9D concept page/section missing: ${label}`));

// Practice fidelity completion.
[
  'Continue learning',
  'v59d-practice-continue',
  'function resumableContinue()',
  'function enhancePracticeHub()',
  '.v57c-primary'
].forEach(label => ok(experience.includes(label), `V5.9D Practice continuation treatment missing: ${label}`));

// Question fidelity completion without replacing the established engine.
[
  'Save &amp; leave',
  'Take your time. It’s okay to use a hint.',
  'function enhanceQuiz()',
  'path-pill',
  'progress-text',
  'quit-btn'
].forEach(label => ok(experience.includes(label), `V5.9D question treatment missing: ${label}`));

// Result fidelity completion while preserving V5.8 result sources.
[
  'Correct answers',
  'Questions practised',
  'A little reflection',
  'Your answers',
  'My progress',
  'res-mastery',
  'result-score',
  'result-message',
  'review'
].forEach(label => ok(experience.includes(label), `V5.9D result treatment missing: ${label}`));

// Existing V5.8 sources remain authoritative.
[
  'student-progress-practice',
  'student-progress-topics',
  'student-progress-strengths',
  'student-progress-focus',
  'my-progress-btn',
  'v571a-gamification-card',
  'v571b-latest-achievement',
  'v572-weekly-missions-card',
  'v574-class-challenge-card',
  'v573-class-challenge-card',
  'v576-send-feedback'
].forEach(source => ok(experience.includes(source), `V5.9D existing source/delegation missing: ${source}`));

ok(experience.includes('function icon(name,size=22)'), 'V5.9D must use a consistent line-icon helper.');
ok(experience.includes("challenge.dataset.v59Action='challenge'"), 'Home class challenge must route to the dedicated concept page.');
ok(experience.includes('Preview-only display options. They are not saved.'), 'Settings must remain preview-only and non-persistent.');
ok(!experience.includes('exam-result'), 'V5.9D must leave Exam Result untouched.');

console.log('V5.9D student experience concept/isolation checks passed.');
