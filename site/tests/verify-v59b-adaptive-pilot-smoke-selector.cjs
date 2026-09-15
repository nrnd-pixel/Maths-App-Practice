'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const site = path.join(__dirname, '..');
const selectorPath = path.join(site, 'v59b-adaptive-pilot-smoke-selector.js');
const source = fs.readFileSync(selectorPath, 'utf8');

assert.match(source, /\^deploy-preview-\\d\+--\.\+\\\.netlify\\\.app\$/,
  'smoke selector must be restricted to Netlify deploy-preview hosts');
assert.match(source, /params\.get\(['"]adaptivePilot['"]\)\s*===\s*['"]2['"]/,
  'smoke selector must also require ?adaptivePilot=2');
assert.match(source, /if \(!enabled \|\| ROOT\[INSTALL_MARKER\]\) return/,
  'disabled/non-preview path must exit before installation');

for (const id of [
  'c4feda04-6c85-4123-baf6-8e38deb1d1fa',
  'c2041abf-d204-47b3-ba92-3129c97681ae',
  '077872ec-2c3c-402f-9c51-491c77500791',
]) {
  assert.ok(source.includes(id), `selector must pin approved pilot target ${id}`);
}

assert.match(source, /await startPractice\(\)/,
  'selector must delegate launch to the existing ordinary Practice owner');
assert.doesNotMatch(source, /startPractice\s*=/,
  'selector must never replace the ordinary Practice owner');
assert.match(source, /state\.questions\s*=\s*\[item\]/,
  'selector may only pin an item already returned by the normal eligible Practice pool');
assert.match(source, /itemContainsTarget/,
  'selector must support a physical target inside an ordinary multipart Practice item');
assert.match(source, /renderQuestion\(\)/,
  'selector must use the established Practice renderer after pinning the loaded item');

for (const forbidden of [
  /cloud\.rpc/,
  /\.from\s*\(\s*['"]questions['"]\s*\)/,
  /supabase/i,
  /correct_answer/,
  /accepted_answers/,
  /\.insert\s*\(/,
  /\.update\s*\(/,
  /\.delete\s*\(/,
]) {
  assert.doesNotMatch(source, forbidden,
    `preview smoke selector must not gain data/grading authority: ${forbidden}`);
}

assert.match(source, /data-v59b2-smoke-count/,
  'temporary expanded question-count option must be explicitly marked');
assert.match(source, /\.remove\(\)/,
  'temporary question-count option must be removed after launch');
assert.match(source, /restoreControls\(snapshot\)/,
  'normal Learn controls must be restored after deterministic launch setup');

console.log('V5.9B deploy-preview adaptive smoke selector integrity checks passed.');
console.log('- requires deploy-preview host + ?adaptivePilot=2');
console.log('- delegates to ordinary startPractice/renderQuestion; no owner replacement');
console.log('- pins only already-loaded eligible Practice items, including multipart targets');
console.log('- no direct data, RPC, grading or write authority');
