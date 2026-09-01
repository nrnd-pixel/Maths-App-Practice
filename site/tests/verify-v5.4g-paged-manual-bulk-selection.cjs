'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const site = path.join(__dirname,'..');
const performancePath = path.join(site,'v52b1-question-bank-performance.js');
const releasePath = path.join(site,'v40-release.js');
const scopePath = path.join(site,'v54f-bulk-selection-scope-safety.js');
const bulkPath = path.join(site,'v51-question-bank-bulk-status.js');

const source = fs.readFileSync(performancePath,'utf8');
const release = fs.readFileSync(releasePath,'utf8');
const scope = fs.readFileSync(scopePath,'utf8');
const bulk = fs.readFileSync(bulkPath,'utf8');
const api = require(performancePath);

assert.strictEqual(api.PAGE_SIZE,50,'Normal Question Bank paging must remain 50 cards.');
assert.strictEqual(typeof api.bulkSelectionCount,'function','V5.4G must expose the canonical selection-count bridge for regression coverage.');

assert(source.includes('Ordinary manual bulk selection stays on the'), 'The performance contract must document paged manual selection.');
assert(source.includes('ROOT.V51QuestionBankBulkStatus?.buildPlan?.(rows,undefined,false)?.selected'), 'Selection count must reuse B2A canonical selection rather than create another selection store.');
assert(source.includes('const manualLocked = selected > 0;'), 'Pager lock must be driven by the canonical selection count.');
assert(source.includes("page.page<=1 || manualLocked?'disabled':''"), 'Previous must lock during manual selection.');
assert(source.includes("page.page>=page.totalPages || manualLocked?'disabled':''"), 'Next must lock during manual selection.');
assert(source.includes('Clear selection to change page, or use Select all filtered'), 'Teacher guidance must explain paged manual selection and explicit full-scope selection.');

assert(source.includes('function beginExplicitSelectionExpansion()'), 'Explicit full-scope selection helper must exist.');
assert(source.includes("event.target?.closest?.('#v51b2a-select-visible')"), 'Select all filtered must remain supported.');
assert(source.includes("event.target?.closest?.('.v52b-select')"), 'Topical Select set must remain supported.');
assert(source.includes('state.selectionMode=true;'), 'Explicit full-scope actions must still enable render-all selection mode.');
assert(source.includes('if (state.selectionMode && !state.expandingForExplicitSelection && bulkSelectionCount(allRows) === 0)'), 'Full-scope render must self-heal back to paging after the canonical selection clears.');

assert(!source.includes('if (!state.selectionMode){ state.selectionMode=true; state.page=1; scheduleRender(false); }'), 'Ordinary checkbox selection must not switch to full-render mode.');
assert(source.includes('Ordinary checkbox selection remains on the current 50-card page.'), 'Manual selection branch must explicitly preserve the current page.');

assert(bulk.includes('const selectedIds = new Set();'), 'B2A must remain the single canonical selection store.');
assert(bulk.includes('buildPlan(rows=currentQuestions(),ids=selectedIds'), 'B2A buildPlan must continue to read the canonical selection set.');
assert(scope.includes('Selection scope locked.'), 'V5.4F filter/topical scope safety must remain in place.');

assert(release.includes("loadScriptOnce('v52b1-question-bank-performance.js?v=52b1-3', 'data-v52b1-question-bank-performance');"), 'Release loader must use the V5.4G cache-bumped performance module.');
assert(!/cloud\.from\(|cloud\.rpc\(|localStorage|sessionStorage/.test(source), 'V5.4G performance code must not add data writes or browser persistence.');

console.log('V5.4G paged manual bulk selection regression passed.');
