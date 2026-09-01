const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname,'..');
const modulePath = path.join(root,'v54d-topical-resource-simplification.js');
const releasePath = path.join(root,'v40-release.js');
const topicalPublicationPath = path.join(root,'v52c-topical-publication.js');
const eligibilityPath = path.join(root,'v53a-practice-eligibility.js');
const v54bPath = path.join(root,'v54b-practice-eligibility-controls.js');

const source = fs.readFileSync(modulePath,'utf8');
const release = fs.readFileSync(releasePath,'utf8');
const publication = fs.readFileSync(topicalPublicationPath,'utf8');
const eligibility = fs.readFileSync(eligibilityPath,'utf8');
const v54b = fs.readFileSync(v54bPath,'utf8');
require(modulePath);

assert(source.includes('#v52b-topical-library .v52c-publication{display:none!important}'),
  'Teacher Topical Resource Library must hide the obsolete legacy publication panel');
assert(source.includes('#questions-cards .toggle-q[data-v52-topical-locked="1"]{display:none!important}'),
  'Question Bank must hide the obsolete locked topical Active control');

assert(release.includes("loadScriptOnce('v52c-topical-publication.js?v=52c-1', 'data-v52c-topical-publication');"),
  'Legacy V5.2C publication backend must remain loaded as rollback infrastructure');
assert(publication.includes('save_topical_exercise_setting_v52c'),
  'Legacy publication implementation must remain intact behind the hidden teacher surface');
assert(eligibility.includes('v53a-eligibility-toggle'),
  'Set-level Practice eligibility controls must remain present');
assert(v54b.includes('Managed by set'),
  'Topical Question Bank rows must continue directing Practice eligibility to set-level management');

assert(!source.includes('.v53a-practice-eligibility{display:none'),
  'V5.4D must not hide current set-level Practice eligibility controls');
assert(!source.includes('.v54b-practice-toggle{display:none'),
  'V5.4D must not hide V5.4B Practice eligibility controls');
assert(!source.includes('new MutationObserver'),
  'V5.4D must not add a permanent DOM observer');
assert(!source.includes('cloud.rpc('),
  'V5.4D must not call database RPCs');
assert(!source.includes('cloud.from('),
  'V5.4D must not access question tables');
assert(!source.includes('practice_eligible ='),
  'V5.4D must not mutate Practice eligibility');
assert(!source.includes('grade_practice_response'),
  'V5.4D must not alter grading');
assert(!source.includes('exam_paper_settings'),
  'V5.4D must not alter Exam publication');

const c = release.indexOf("v54c-compact-question-bank.js?v=54c-1");
const d = release.indexOf("v54d-topical-resource-simplification.js?v=54d-1");
assert(c >= 0 && d > c,'Release loader must preserve V5.4C → V5.4D composition order');

console.log('V5.4D topical resource simplification checks passed.');
