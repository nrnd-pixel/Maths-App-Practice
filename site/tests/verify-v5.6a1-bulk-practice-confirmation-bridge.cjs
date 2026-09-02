const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const source = fs.readFileSync(path.join(site,'v56a1-bulk-practice-confirmation-bridge.js'),'utf8');
const config = fs.readFileSync(path.join(site,'config.js'),'utf8');

new vm.Script(source,{filename:'v56a1-bulk-practice-confirmation-bridge.js'});
const api = require(path.join(site,'v56a1-bulk-practice-confirmation-bridge.js'));

assert.equal(api.actionTarget({id:'v54e-add-practice'}),true);
assert.equal(api.actionTarget({id:'v54e-remove-practice'}),false);

for (const phrase of [
  'Remove selected questions from Practice?',
  'This confirmation stays inside the app',
  'Practice availability only',
  'active',
  'Exam availability'
]) assert(source.includes(phrase),`V5.6A.1 UI is missing: ${phrase}`);

assert.match(source,/V54EBulkPracticeEligibility/,
  'Bridge must route through the established V5.4E bulk Practice API.');
assert.match(source,/button\.click\(\)/,
  'Confirmed action must return to the established V5.4E button path.');
assert.match(source,/ROOT\.confirm = \(\) => true/,
  'Bridge must bypass the old native prompt only after in-app confirmation.');
assert.match(source,/event\.stopImmediatePropagation\(\)/,
  'Unconfirmed click must not leak through to the native-confirm action.');

assert.doesNotMatch(source,/cloud\.rpc\(|cloud\.from\(|\.update\(|\.insert\(|\.delete\(/i,
  'V5.6A.1 bridge must not duplicate database writes.');
assert.match(config,/\.\/v56a-question-bank-response-filter\.js'[\s\S]*\.\/v56a1-bulk-practice-confirmation-bridge\.js'/,
  'V5.6A.1 bridge must load after V5.6A response filter.');

console.log('V5.6A.1 bulk Practice confirmation bridge checks passed.');
console.log('- in-app confirmation replaces unreliable embedded-browser native prompt');
console.log('- confirmed action still uses the established V5.4E RPC path');
console.log('- bridge itself performs no direct database write');
