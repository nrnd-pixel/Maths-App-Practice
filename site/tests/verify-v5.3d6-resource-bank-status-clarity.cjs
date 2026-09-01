const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname,'..','..');
const modulePath = path.join(root,'site','v53d6-resource-bank-status-clarity.js');
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

assert(source.includes('Topical Exercise Resource Library'),'Topical library must use current resource-bank wording');
assert(source.includes('Practice resource bank'),'Eligibility section must use resource-bank wording');
assert(source.includes('Student retrieval live'),'Teacher UI must state that unified Practice retrieval is live');
assert(source.includes('Available in Practice'),'Teacher UI must expose current Practice availability');
assert(source.includes('Legacy Topical route (hidden)'),'Legacy V5.2C publication must be clearly identified as hidden rollback infrastructure');
assert(source.includes('Practice eligible'),'Question cards must distinguish Practice eligibility from inactive legacy state');
assert(source.includes('Locked inactive'),'Topical active controls must communicate the intentional legacy lock');
assert(source.includes('practice_eligible === true'),'Clarity must derive normal-Practice access from practice_eligible');
assert(source.includes('row.active===false'),'Clarity must preserve the separate legacy active-state distinction');
assert(!source.includes('new MutationObserver('),'D6 must not add a permanent MutationObserver');
assert(!source.includes('cloud.rpc('),'D6 must not call Supabase RPCs');
assert(!source.includes('grade_practice_response'),'D6 must not touch Practice grading');
assert(!source.includes('submit_practice_session'),'D6 must not touch Practice submission');
assert(!source.includes('get_student_questions'),'D6 must not alter question retrieval');
assert(!source.includes('exam_attempt'),'D6 must not alter Exam Mode');

assert(loader.includes("loadScriptOnce('v53d5-practice-selection-intelligence.js?v=53d5-1', 'data-v53d5-practice-selection-intelligence');"),'Accepted V5.3D5 loader must remain present');
assert(loader.includes("loadScriptOnce('v53d6-resource-bank-status-clarity.js?v=53d6-1', 'data-v53d6-resource-bank-status-clarity');"),'D6 loader wiring must be present');

console.log('V5.3D6 resource-bank status clarity checks passed.');
