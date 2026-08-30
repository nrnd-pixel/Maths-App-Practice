const fs = require('fs');
const path = require('path');
const assert = require('assert');

const modulePath = path.join(__dirname,'..','v52b1-question-bank-performance.js');
const source = fs.readFileSync(modulePath,'utf8');
const api = require(modulePath);

assert.strictEqual(api.PAGE_SIZE,50,'Normal Question Bank browsing must render 50 cards per page');

const rows = Array.from({length:529},(_,index)=>({
  id:String(index+1),
  year_level:index<292?6:5,
  strand:index%2?'number':'geometry',
  topic:index<292?'Fractions':'Angles',
  skill:'Skill',
  question_text:`Question ${index+1}`,
  exam_year:index<292?null:2025,
  paper:index<292?'':'Paper 1',
  question_number:String(index+1),
  source_type:index<292?'topical_exercise':'past_paper',
  source:index<292?'Topical Exercise Paper 2 Extra':'2025 Paper 1',
  answer:'1',
  active:index>=292,
  review_status:index%3===0?'reviewed':''
}));

const first = api.paginateRows(rows,1);
assert.strictEqual(first.rows.length,50,'First page must contain only 50 rows');
assert.strictEqual(first.totalPages,11,'529 rows at 50 per page must produce 11 pages');
assert.strictEqual(first.start,1);
assert.strictEqual(first.end,50);

const last = api.paginateRows(rows,11);
assert.strictEqual(last.rows.length,29,'Last 529-row page must contain 29 rows');
assert.strictEqual(last.start,501);
assert.strictEqual(last.end,529);

const clamped = api.paginateRows(rows,999);
assert.strictEqual(clamped.page,11,'Out-of-range page requests must clamp safely');

const bulk = api.paginateRows(rows,3,50,true);
assert.strictEqual(bulk.rows.length,529,'Bulk selection mode must preserve full matching-row visibility');
assert.strictEqual(bulk.renderAll,true,'Bulk selection mode must be explicit');

assert(api.baseRowMatches(rows[0],{year:'6',strand:'geometry',status:'inactive',search:'topical exercise paper 2 extra'}),'Base filter helper must match the imported inactive topical row');
assert(!api.baseRowMatches(rows[0],{year:'5',strand:'all',status:'all'}),'Year filter must exclude non-matching rows');
assert(api.baseRowMatches(rows[300],{year:'all',strand:'all',status:'active',exam:'2025',paper:'paper 1',search:'question 301'}),'Exam/search/status filters must remain compatible with past-paper rows');
assert.strictEqual(api.normalizeReviewStatus('reviewed'),'reviewed');
assert.strictEqual(api.normalizeReviewStatus('needs_review'),'needs_review');
assert.strictEqual(api.normalizeReviewStatus(''),'none');

function renderSummary(){}
function renderAll(){}
assert.strictEqual(api.refreshCallbackKind(renderSummary),'bulk-status','B2A summary refresh must be recognized for coordination');
assert.strictEqual(api.refreshCallbackKind(renderAll),'review','Review refresh must be recognized for coordination');
const deduped = api.dedupeRefreshes([
  {kind:'qa',callback:()=>1},{kind:'qa',callback:()=>2},{kind:'review',callback:()=>3}
]);
assert.strictEqual(deduped.length,2,'Repeated refreshes of the same Question Bank layer must be coalesced');
assert.strictEqual(deduped.find(item=>item.kind==='qa').callback(),2,'Latest same-layer refresh must win');

assert(source.includes("if (!panelActive())"),'Question Bank rendering must be deferred while its tab is hidden');
assert(source.includes('teacherQuestions = Array.from(rows || [])'),'Performance layer must temporarily scope legacy rendering to the page rows');
assert(source.includes("'#v51b2a-select-visible'"),'Bulk Select all filtered must expand all matching rows before the existing selection handler runs');
assert(source.includes("'.v52b-select'"),'Topical Select set must retain whole-set selection behavior');
assert(source.includes("node.oninput=()=>scheduleRender(true)"),'Legacy input handlers must be replaced so they cannot rebuild the full bank');
assert(source.includes("node.onchange=()=>scheduleRender(true)"),'Legacy select handlers must be replaced so they cannot rebuild the full bank');
assert(source.includes('captureLegacyRefreshes'),'Legacy Question Bank wrapper refreshes must be captured during card rendering');
assert(source.includes('dedupeRefreshes'),'Captured wrapper refreshes must be deduplicated');
assert(source.includes('requestIdleCallback'),'Non-essential QA/review/library work must be deferred until the card page can paint');
assert(source.includes('V52TopicalActivationGuard?.decorate?.()'),'Topical activation safety decoration must be explicitly restored after observer suppression');
assert(source.includes('V51MultipartQuestionManagement?.renderGroup?.()'),'Multipart indicators must be explicitly restored after observer suppression');
assert(source.includes('Only this page is built in the browser'),'Paging UI must explain the browser-performance behavior');

assert(!source.includes("cloud.from('questions')"),'Performance hotfix must not write question data');
assert(!source.includes('localStorage.setItem'),'Performance hotfix must not write local storage');
assert(!source.includes('get_student_questions'),'Performance hotfix must not alter student retrieval');
assert(!source.includes('grade_practice_response'),'Performance hotfix must not alter grading');
assert(!source.includes('exam_paper_settings'),'Performance hotfix must not alter Exam publication');
assert(!source.includes('storage.from'),'Performance hotfix must not alter Storage');

console.log('V5.2B.1 Question Bank performance checks passed.');
