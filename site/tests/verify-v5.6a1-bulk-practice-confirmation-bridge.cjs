const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname,'..');
const source = fs.readFileSync(path.join(site,'v56a1-bulk-practice-confirmation-bridge.js'),'utf8');
const config = fs.readFileSync(path.join(site,'config.js'),'utf8');
const bulk = fs.readFileSync(path.join(site,'resource-bank-bulk.js'),'utf8');

new vm.Script(source,{filename:'v56a1-bulk-practice-confirmation-bridge.js'});
const api = require(path.join(site,'v56a1-bulk-practice-confirmation-bridge.js'));
assert.equal(api.actionTarget({id:'v54e-add-practice'}),true);
assert.equal(api.actionTarget({id:'v54e-remove-practice'}),false);
for (const phrase of ['Remove selected questions from Practice?','This confirmation stays inside the app','Practice availability only','active','Exam availability'])
  assert(source.includes(phrase),`V5.6A.1 UI is missing: ${phrase}`);
assert.match(source,/V54EBulkPracticeEligibility/,'Bridge must route through established V54E API.');
assert.match(source,/button\.click\(\)/);
assert.match(source,/ROOT\.confirm = \(\) => true/);
assert.match(source,/event\.stopImmediatePropagation\(\)/);
assert.doesNotMatch(source,/cloud\.rpc\(|cloud\.from\(|\.update\(|\.insert\(|\.delete\(/i);
assert.match(config,/\.\/v56a-question-bank-response-filter\.js'[\s\S]*\.\/v56a1-bulk-practice-confirmation-bridge\.js'/);

// The bridge's hard dependency now resolves from the consolidated E→F owner.
assert(bulk.includes("Object.defineProperty(window,'V54EBulkPracticeEligibility'"),'Consolidated bulk owner must publish V54E API');
assert(bulk.includes('buildPlan,'),'V54E API must preserve buildPlan()');
assert(bulk.includes('confirmationText'),'V54E API must preserve confirmationText()');
assert(bulk.includes('id="v54e-add-practice"')&&bulk.includes('id="v54e-remove-practice"'),'Exact V54E buttons must remain in active owner');
assert(source.includes('#v54e-add-practice,#v54e-remove-practice'),'V56A1 capture bridge must retain exact button selector');

console.log('V5.6A.1 bulk Practice confirmation bridge checks passed.');
console.log('- active consolidated V54E API/button contracts verified');
console.log('- bridge still delegates confirmed actions to established V54E path');
