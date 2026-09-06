'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..', '..');
const site = path.join(root, 'site');
const indexPath = path.join(site, 'index.html');
const configPath = path.join(site, 'config.js');
const previewPath = path.join(site, 'v59-student-home-preview.js');
const practicePath = path.join(site, 'v59b-student-practice-preview.js');
const quizResultPath = path.join(site, 'v59c-student-quiz-result-preview.js');
const entryPath = path.join(site, 'student-v59-preview', 'index.html');

function read(file){ return fs.readFileSync(file, 'utf8'); }
function ok(condition, message){ if (!condition) throw new Error(message); }
function gitBlobSha(text){
  const body = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${body.length}\0`), body])).digest('hex');
}

const index = read(indexPath);
const config = read(configPath);
const preview = read(previewPath);
const practice = read(practicePath);
const quizResult = read(quizResultPath);
const entry = read(entryPath);

// Exact V5.8 stable root HTML must remain unchanged on the integration branch.
ok(gitBlobSha(index) === '607f3d950a88117b496aa158fea30ce3994b918c', 'site/index.html differs from the V5.8 stable blob.');

// The friendly route is test-only and forwards to an explicit guarded preview flag.
ok(/name=["']robots["'][^>]+noindex,nofollow/i.test(entry), 'Preview entry route must keep noindex,nofollow.');
ok(entry.includes("searchParams.set('v59-student-home-preview','1')"), 'Preview entry route must set the V5.9 preview flag.');
ok(entry.includes('TEST PREVIEW · NOT PRODUCTION'), 'Preview entry route must visibly identify itself as non-production.');

// V5.8 config may load the presentation layers only when the explicit query flag is present.
ok(config.includes("get('v59-student-home-preview') === '1'"), 'config.js must guard V5.9 preview loading behind the explicit query flag.');
[
  './v59-student-home-preview.js',
  './v59b-student-practice-preview.js',
  './v59c-student-quiz-result-preview.js'
].forEach(modulePath => {
  ok(config.includes(`stagedScripts.push('${modulePath}')`), `config.js must add ${modulePath} only inside the guarded path.`);
  const pattern = new RegExp(modulePath.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g');
  ok((config.match(pattern) || []).length === 1, `${modulePath} should be referenced exactly once from config.js.`);
});

const forbidden = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bsendBeacon\b/,
  /\bcloud\s*\./,
  /\.rpc\s*\(/,
  /\.from\s*\(/,
  /localStorage\.setItem/,
  /sessionStorage\.setItem/
];

// All V5.9 layers are presentation/delegation only: no direct network or persistence path.
ok(preview.includes("get(PARAM) !== '1'"), 'Home preview module must self-guard against accidental default loading.');
ok(preview.includes("meta.content = 'noindex,nofollow'"), 'Home preview module must mark the query preview noindex,nofollow.');
ok(preview.includes('Real signed-in V5.8 data'), 'Home preview must visibly state that it is using existing V5.8 data.');
ok(practice.includes("get(PARAM) !== '1'"), 'Practice preview module must self-guard against accidental default loading.');
ok(quizResult.includes("get(PARAM) !== '1'"), 'Quiz/Result preview module must self-guard against accidental default loading.');
forbidden.forEach(pattern => {
  ok(!pattern.test(preview), `Home preview contains forbidden direct data/network behavior: ${pattern}`);
  ok(!pattern.test(practice), `Practice preview contains forbidden direct data/network behavior: ${pattern}`);
  ok(!pattern.test(quizResult), `Quiz/Result preview contains forbidden direct data/network behavior: ${pattern}`);
});

// All real student actions delegate into already accepted V5.8 controls/APIs.
['.v57c-primary','.v57c-assignments','.v57c-progress','.v57c-learn','#my-assignments-btn','#my-progress-btn','#v40c-student-logout','V55APastPaperPractice?.setPracticeType']
  .forEach(selector => ok(preview.includes(selector), `Missing V5.8 delegation selector/API: ${selector}`));
['V55APastPaperPractice?.getPaperLibrary','V55APastPaperPractice?.setPracticeType','topic-filter','v55a-paper-year','v55a-paper-name']
  .forEach(selector => ok(practice.includes(selector), `V5.9B Practice preview is not delegating to the established Practice source: ${selector}`));

// Home must closely follow the approved concept hierarchy.
['Hi, ${html(model.name)}!','Today\'s practice','Mixed<br>Practice','Topic<br>Practice','Past<br>Papers','Assignments','Recommended next','Weekly missions','Latest badge','Class challenge']
  .forEach(label => ok(preview.includes(label), `Approved Home concept element missing: ${label}`));
['data-v59-action="home"','data-v59-action="practice"','data-v59-action="progress"','data-v59-action="badges"','data-v59-action="more"']
  .forEach(action => ok(preview.includes(action), `Approved five-item navigation is missing: ${action}`));
ok(preview.includes('v59-desktop-brand'), 'Desktop Maths Practice brand/sidebar treatment is missing.');
ok(preview.includes('data-v59-action="notifications"'), 'Concept notification control is missing.');
ok(preview.includes('data-v59-action="settings"'), 'Concept settings control is missing.');
ok(preview.includes('v573-class-challenge-card'), 'Class challenge must read the established V5.8 class-challenge source.');

// V5.9B must reproduce the approved Practice hub, Topic picker and Past Papers hierarchy.
['Your practice space','How would you like to practise?','Assigned practice','Recommended practice','Pick a topic','Past Papers','Familiar paper choices. Friendly practice.']
  .forEach(label => ok(practice.includes(label), `Approved Practice concept element missing: ${label}`));
['data-v59b-nav="home"','data-v59b-nav="practice"','data-v59b-nav="progress"','data-v59b-nav="badges"','data-v59b-nav="more"']
  .forEach(action => ok(practice.includes(action), `V5.9B five-item navigation is missing: ${action}`));
ok(practice.includes('function captureHomeAction(event)'), 'Practice preview must intercept Home Practice navigation without rewriting V5.8.');
ok(practice.includes('function chooseTopic(value)'), 'Practice preview must map topic choices to the established topic filter.');
ok(practice.includes('function choosePaper(yearValue,paperName)'), 'Practice preview must map paper choices to the established Past Paper Practice controls.');

// V5.9C must style the established quiz/result DOM instead of replacing grading/submission logic.
['#quiz.v59c-concept-quiz','#result.v59c-concept-result','One question at a time','You made progress!','Practice complete','response-shell','multipart-stack','drawing-stage','manual-response','result-code-box']
  .forEach(label => ok(quizResult.includes(label), `Approved Quiz/Result concept treatment missing: ${label}`));
['q-text','q-image','response-input','check-btn','hint-btn','feedback','quit-btn','next-btn','result-score','review','again-btn']
  .forEach(id => ok(quizResult.includes(id), `V5.9C must preserve/use established Quiz/Result element: ${id}`));
ok(quizResult.includes('function ensureQuizScaffold()'), 'Quiz preview must scaffold the existing question DOM rather than duplicate the engine.');
ok(quizResult.includes('function ensureResultScaffold()'), 'Result preview must decorate the existing result DOM rather than duplicate result logic.');
ok(!quizResult.includes('exam-result'), 'V5.9C must leave Exam result presentation untouched.');

// Handoff must reveal the established V5.8 destination and return to preview through Home.
ok(preview.includes('function suspendPreview()'), 'Home preview must suspend itself before handing off to existing V5.8 destinations.');
ok(preview.includes('function resumePreview()'), 'Home preview must provide an explicit Home resume path.');
ok(preview.includes("closest?.('[data-v40-nav=\"home\"],.back-home')"), 'Home preview must resume from established Home navigation.');

// Home rendering must remain idempotent and ignore its own DOM mutations.
ok(preview.includes('function signatureFor(model)'), 'Home preview must compute a stable render signature.');
ok(preview.includes('signature===lastSignature'), 'Home preview must skip unchanged re-renders.');
ok(preview.includes('function mutationBelongsToPreview(mutation)'), 'Home preview must identify its own DOM mutations.');
ok(preview.includes('mutations.every(mutationBelongsToPreview)'), 'MutationObserver must ignore preview-only mutations.');

console.log('V5.9 Home + Practice + Quiz/Result concept/isolation checks passed.');