'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const SITE=path.resolve(__dirname,'..');
const SUPABASE=path.resolve(SITE,'..','supabase');
const read=name=>fs.readFileSync(path.join(SITE,name),'utf8');
const loader=read('v40-release.js');
const ui=read('resource-bank-ui.js');
const bulk=read('resource-bank-bulk.js');
const reviewSafety=fs.readFileSync(path.join(SUPABASE,'v54h_practice_review_safety.sql'),'utf8');

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
// Phase 5A: v54a-f source files deleted — section source-equivalence checks removed.

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
assert.ok(a.includes("const SUMMARY_ID = 'v54a-resource-bank-summary'"),'A must preserve the exact #v54a-resource-bank-summary DOM id');
assert.ok(b.includes("const FEEDBACK_ID = 'v54b-eligibility-feedback'"),'B must preserve the exact #v54b-eligibility-feedback DOM id');
for(const token of ['V54AResourceBankVisibility','V54BPracticeEligibilityControls','V54CCompactQuestionBank','V54DTopicalResourceSimplification','v54b-practice-toggle'])
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
assert.ok(e.includes('canRun:selectedList.length > 0 && topical.length === 0 && groups.length > 0 && changingRows > 0'),'E bulk plan must reject topical selection');
assert.match(f,/addEventListener\('click',[\s\S]*true\);/,'F scope guard must remain capture-phase');
assert.match(f,/stopImmediatePropagation\(\)/,'F scope guard must block competing scope handlers');

// V54H adds one database-authority invariant without changing browser owners or historical V54 migrations.
assert.ok(reviewSafety.includes('V5.4H — Practice eligibility / review-state safety'),'V54H migration marker must remain exact');
assert.ok(reviewSafety.includes("q.practice_eligible = true\n      and q.review_status = 'needs_review'"),'migration preflight must reject pre-existing conflicts');
assert.ok(reviewSafety.includes('create or replace function public.guard_question_practice_review_safety_v54h()'),'database guard function must exist');
assert.ok(reviewSafety.includes("new.practice_eligible = true\n     and new.review_status = 'needs_review'"),'guard must reject only the unresolved-review Practice conflict');
assert.ok(reviewSafety.includes('before insert or update of practice_eligible, review_status on public.questions'),'all relevant future question writes must pass the database guard');
assert.ok(reviewSafety.includes('Remove it from Practice before marking Needs Review, or resolve the review before enabling Practice.'),'guard failure must be actionable');
assert.ok(reviewSafety.includes('revoke all on function public.guard_question_practice_review_safety_v54h() from public, anon, authenticated'),'guard function must not become a callable application RPC');
assert.doesNotMatch(reviewSafety,/update\s+public\.questions\s+set/i,'V54H must not silently mutate existing question rows');
assert.doesNotMatch(reviewSafety,/set\s+active\s*=/i,'V54H must preserve legacy active independently');
assert.doesNotMatch(reviewSafety,/set\s+practice_eligible\s*=/i,'V54H must reject conflicts rather than silently de-eligibilize rows');

// Frozen stable checkpoint/V54G remain outside consolidation.
assert.equal(fs.existsSync(path.join(SITE,'v54-stable-release-checkpoint.js')),true);
assert.equal(fs.existsSync(path.join(SITE,'v52b1-question-bank-performance.js')),true);

require('./verify-phase4-v54-resource-bank-dormant-reference-integrity.cjs');
require('./verify-phase4-v54-resource-bank-protected-sha.cjs');
console.log('Phase 4 V54 consolidated resource-bank integrity checks passed.');
