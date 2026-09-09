const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname,'..','..');
const modulePath = path.join(root,'site','practice-ui-resource-clarity.js');
const loaderPath = path.join(root,'site','v40-release.js');
const source = fs.readFileSync(modulePath,'utf8');
const loader = fs.readFileSync(loaderPath,'utf8');
const api = require(modulePath);

const rows = [
  {id:'a',year_level:6,source_type:'topical_exercise',source:'Set A',practice_eligible:true,active:false},
  {id:'b',year_level:6,source_type:'topical_exercise',source:'Set A',practice_eligible:true,active:false},
  {id:'c',year_level:6,source_type:'topical_exercise',source:'Set B',practice_eligible:false,active:false},
  {id:'d',year_level:6,source_type:'past_paper',source:'Paper 1',practice_eligible:true,active:true}
];

const summary = api.summarizeAccess(rows);
assert.strictEqual(summary.topicalRows,3,'Only topical resource rows should be summarized');
assert.strictEqual(summary.eligibleRows,2,'Practice-eligible topical rows should be counted directly');
assert.strictEqual(summary.sets.length,2,'Topical sets should remain source/year scoped');
assert.strictEqual(summary.fullyEligibleSets,1,'Fully eligible topical sets should be identified');
assert.strictEqual(api.accessLabel({allEligible:true,partlyEligible:false}),'Available in Practice');
assert.strictEqual(api.accessLabel({allEligible:false,partlyEligible:true}),'Partly available in Practice');
assert.strictEqual(api.accessLabel({allEligible:false,partlyEligible:false}),'Not in Practice');
assert(api.accessHelp({allEligible:true,partlyEligible:false}).includes('legacy active flag remains off'),'Teacher copy must distinguish Practice eligibility from legacy active');

const cStart=source.indexOf('/* V5.3C — Two-mode student UI.');
const d6Start=source.indexOf('/* V5.3D6 — Resource Bank Status Clarity.');
assert(cStart>=0 && d6Start>cStart,'V53C must execute before V53D6 in the consolidated owner');
assert(source.includes('Topical Exercise Resource Library'),'Topical library must use current resource-bank wording');
assert(source.includes('Practice resource bank'),'Eligibility section must use resource-bank wording');
assert(source.includes('Student retrieval live'),'Teacher UI must state that unified Practice retrieval is live');
assert(source.includes('Available in Practice'),'Teacher UI must expose current Practice availability');
assert(source.includes('Legacy Topical route (hidden)'),'Legacy V5.2C publication must be clearly identified as hidden rollback infrastructure');
assert(source.includes('Practice eligible'),'Question cards must distinguish Practice eligibility from inactive legacy state');
assert(source.includes('Locked inactive'),'Topical active controls must communicate the intentional legacy lock');
assert(source.includes('practice_eligible === true'),'Clarity must derive normal-Practice access from practice_eligible');
assert(source.includes('row.active===false'),'Clarity must preserve the separate legacy active-state distinction');
assert(source.includes('v53d6-practice-eligibility-badge'),'Exact V54A topical badge contract must remain present');
assert(source.includes('decorate\n  });') || source.includes('decorate\r\n  });'),'V53D6 public API must continue to expose decorate');
assert(source.includes("Object.defineProperty(window,'V53D6ResourceBankStatusClarity'"),'V53D6 public API must remain published');
assert(source.includes('ROOT.__v53d6ResourceBankStatusClarityInstalled = true'),'V53D6 install flag must remain published');
const d6Source=source.slice(d6Start);
assert(!d6Source.includes('new MutationObserver('),'D6 must not add a permanent MutationObserver');
assert(!d6Source.includes('cloud.rpc('),'D6 must not call Supabase RPCs');
assert(!d6Source.includes('grade_practice_response'),'D6 must not touch Practice grading');
assert(!d6Source.includes('submit_practice_session'),'D6 must not touch Practice submission');
assert(!d6Source.includes('get_student_questions'),'D6 must not alter question retrieval');
assert(!d6Source.includes('exam_attempt'),'D6 must not alter Exam Mode');

assert(loader.includes("loadScriptOnce('practice-selection-engine.js', 'data-practice-selection-engine');"),'Accepted consolidated V5.3B/D3/D4/D5 engine loader must remain present');
assert(!loader.includes("loadScriptOnce('v53d5-practice-selection-intelligence.js"),'Historical D5 source must remain dormant');
assert(loader.includes("loadScriptOnce('practice-ui-resource-clarity.js', 'data-practice-ui-resource-clarity');"),'Consolidated V53C/D6 loader wiring must be present');
assert(loader.indexOf('practice-selection-engine.js') < loader.indexOf('practice-ui-resource-clarity.js'),'Clarity owner must remain after Practice engine');
assert(loader.indexOf('practice-ui-resource-clarity.js') < loader.indexOf('v54a-resource-bank-visibility.js'),'D6 compatibility layer must remain before V54A');

console.log('V5.3D6 resource-bank status clarity checks passed against consolidated owner.');
