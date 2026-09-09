'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const SITE=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(SITE,name),'utf8');
const loader=read('v40-release.js');
const ui=read('resource-bank-ui.js');
const bulk=read('resource-bank-bulk.js');

new vm.Script(ui,{filename:'resource-bank-ui.js'});
new vm.Script(bulk,{filename:'resource-bank-bulk.js'});

const markers={
  a:'/* V5.4A — Unified Teacher Resource Bank visibility.',
  b:'/* V5.4B — Teacher Practice eligibility controls.',
  c:'/* V5.4C — Compact Teacher Question Bank browsing.',
  d:'/* V5.4D — Topical Resource Library simplification.',
  e:'/* V5.4E — Bulk Practice eligibility controls.',
  f:'/* V5.4F — Bulk selection scope safety.'
};
function section(source,start,end){
  const from=source.indexOf(start);
  assert.ok(from>=0,`missing section ${start}`);
  const to=end?source.indexOf(end,from+start.length):source.length;
  assert.ok(!end||to>from,`missing following section ${end}`);
  return source.slice(from,to).trimEnd();
}

const a=section(ui,markers.a,markers.b);
const b=section(ui,markers.b,markers.c);
const c=section(ui,markers.c,markers.d);
const d=section(ui,markers.d,null);
const e=section(bulk,markers.e,markers.f);
const f=section(bulk,markers.f,null);
for(const [key,active,file] of [
  ['A',a,'v54a-resource-bank-visibility.js'],['B',b,'v54b-practice-eligibility-controls.js'],
  ['C',c,'v54c-compact-question-bank.js'],['D',d,'v54d-topical-resource-simplification.js'],
  ['E',e,'v54e-bulk-practice-eligibility.js'],['F',f,'v54f-bulk-selection-scope-safety.js']
]) assert.equal(active,read(file).trimEnd(),`active V54${key} section must remain source-equivalent to historical reference`);

const clarity="loadScriptOnce('practice-ui-resource-clarity.js', 'data-practice-ui-resource-clarity');";
const uiLoad="loadScriptOnce('resource-bank-ui.js', 'data-resource-bank-ui');";
const bulkLoad="loadScriptOnce('resource-bank-bulk.js', 'data-resource-bank-bulk');";
assert.ok(loader.includes(clarity)&&loader.includes(uiLoad)&&loader.includes(bulkLoad),'active consolidated loader entries must exist');
assert.ok(loader.indexOf(clarity)<loader.indexOf(uiLoad)&&loader.indexOf(uiLoad)<loader.indexOf(bulkLoad),'loader must preserve clarity → A-D → E-F topology');
for(const file of ['v54a-resource-bank-visibility.js','v54b-practice-eligibility-controls.js','v54c-compact-question-bank.js','v54d-topical-resource-simplification.js','v54e-bulk-practice-eligibility.js','v54f-bulk-selection-scope-safety.js'])
  assert.equal(loader.includes(`loadScriptOnce('${file}`),false,`${file} must be dormant`);

// A installs first; B captures the already-wrapped renderer and becomes the outer V54 wrapper.
assert.ok(ui.indexOf('__v54aPreviousRenderQuestions')<ui.indexOf('__v54bPreviousRenderQuestions'),'A render bridge must be installed before B bridge');
assert.match(a,/const previous = renderQuestions;[\s\S]*__v54aPreviousRenderQuestions = previous;[\s\S]*renderQuestions = function/);
assert.match(b,/const previous=renderQuestions;[\s\S]*__v54bPreviousRenderQuestions=previous;[\s\S]*renderQuestions=function/);

// D6 synchronous composition and downstream DOM/API compatibility contracts.
assert.match(a,/ROOT\.V53D6ResourceBankStatusClarity\?\.decorate\?\.\(\)/);
assert.ok(a.includes('.v53d6-practice-eligibility-badge'),'A must reuse exact D6 badge');
for(const token of ['V54AResourceBankVisibility','V54BPracticeEligibilityControls','V54CCompactQuestionBank','V54DTopicalResourceSimplification','#v54a-resource-bank-summary','v54a-resource-bank-summary','v54b-eligibility-feedback','v54b-practice-toggle'])
  assert.ok(ui.includes(token),`UI owner must retain ${token}`);
for(const token of ['V54EBulkPracticeEligibility','V54FBulkSelectionScopeSafety','__v54fBulkSelectionScopeSafetyInstalled','v54e-add-practice','v54e-remove-practice'])
  assert.ok(bulk.includes(token),`bulk owner must retain ${token}`);
assert.match(e,/V53D1TeacherPracticePoolAlignment\?\.logicalQuestionKey/,'E must reuse frozen V53D1 logical key API');
assert.match(e,/V51QuestionBankBulkStatus/,'E must reuse V51 selection');
assert.match(f,/V51QuestionBankBulkStatus/,'F must reuse V51 selection');
assert.doesNotMatch(bulk,/const selectedIds = new Set/,'consolidation must not create a second selection store');

// Topical whole-set and scope-safety boundaries remain explicit in browser code.
assert.match(b,/if \(isTopical\(row\)\) throw new Error/,'B browser writer must reject topical rows');
assert.match(b,/label:'Managed by set'/,'B topical rows must remain whole-set managed');
assert.match(e,/topical\.length[\s\S]*canRun:selectedList\.length > 0 && topical\.length === 0/,'E bulk plan must reject topical selection');
assert.match(f,/addEventListener\('click',[\s\S]*true\);/,'F scope guard must remain capture-phase');
assert.match(f,/stopImmediatePropagation\(\)/,'F scope guard must block competing scope handlers');

// Frozen stable checkpoint/V54G remain outside consolidation.
assert.equal(fs.existsSync(path.join(SITE,'v54-stable-release-checkpoint.js')),true);
assert.equal(fs.existsSync(path.join(SITE,'v52b1-question-bank-performance.js')),true);

require('./verify-phase4-v54-resource-bank-dormant-reference-integrity.cjs');
require('./verify-phase4-v54-resource-bank-protected-sha.cjs');
console.log('Phase 4 V54 consolidated resource-bank integrity checks passed.');
