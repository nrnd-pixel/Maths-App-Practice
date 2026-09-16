'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const CONFIG = path.join(ROOT, 'site', 'config.js');
const source = fs.readFileSync(CONFIG, 'utf8');
const marker = '/* Stage 3E deploy-preview-only adaptive target selector.';
const start = source.indexOf(marker);

assert.ok(start >= 0, 'Stage 3E temporary selector marker must be present');
const selector = source.slice(start);

assert.match(selector, /\^deploy-preview-\\d\+--\.\+\\\.netlify\\\.app\$/i, 'selector must be deploy-preview gated');
assert.ok(selector.includes("params.get('adaptivePilot')!=='2'"), 'selector must require ?adaptivePilot=2');
assert.ok(selector.includes("pilotRoster='5e386522-ae0f-4c82-8cf3-6bf0979272f7'"), 'selector must be restricted to the sole pilot roster UUID');
assert.ok(selector.includes("String(activeStudentAccess?.roster_student_id||'')===pilotRoster"), 'selector must verify the active roster identity');

assert.ok(selector.includes("q9b:{id:'c4feda04-6c85-4123-baf6-8e38deb1d1fa'"), 'Q9(b) must be an exact smoke target');
assert.ok(selector.includes("q4:{id:'c2041abf-d204-47b3-ba92-3129c97681ae'"), 'Q4 must be an exact smoke target');
assert.ok(!selector.includes('077872ec-2c3c-402f-9c51-491c77500791'), 'Q30 must not be exposed by this Stage 3E telemetry smoke selector');

assert.ok(selector.includes('await startPractice();'), 'selector must delegate question retrieval to ordinary Practice');
assert.ok(selector.includes('state.questions=[item];state.index=0;state.count=1;renderQuestion();'), 'selector may only pin an item returned by ordinary Practice');
assert.ok(!selector.includes('cloud.rpc('), 'selector must not call RPCs directly');
assert.ok(!selector.includes(".from('questions')"), 'selector must not read the questions table directly');
assert.ok(!selector.includes('student_adaptive_lifecycle_event_v1'), 'selector must not own telemetry writes');
assert.ok(!selector.includes('student_adaptive_trigger_check_v1'), 'selector must not own adaptive trigger authority');
assert.ok(!selector.includes('student_adaptive_question_readiness_v2'), 'selector must not own readiness authority');

console.log('V5.9B Stage 3E deploy-preview smoke selector verifier passed.');
