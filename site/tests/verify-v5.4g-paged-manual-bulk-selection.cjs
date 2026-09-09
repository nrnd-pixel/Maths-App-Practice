'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const site = path.join(__dirname,'..');
const performancePath = path.join(site,'v52b1-question-bank-performance.js');
const releasePath = path.join(site,'v40-release.js');
const scopePath = path.join(site,'resource-bank-bulk.js');
const bulkPath = path.join(site,'question-bank-selection-qa.js');

const source = fs.readFileSync(performancePath,'utf8');
const release = fs.readFileSync(releasePath,'utf8');
const scopeAll = fs.readFileSync(scopePath,'utf8');
const fStart=scopeAll.indexOf('/* V5.4F — Bulk selection scope safety.');
assert.ok(fStart>=0,'Consolidated bulk owner must retain V54F scope section');
const scope=scopeAll.slice(fStart);
const bulk = fs.readFileSync(bulkPath,'utf8');
const api = require(performancePath);

assert.strictEqual(api.PAGE_SIZE,50,'Normal Question Bank paging must remain 50 cards.');
assert.strictEqual(typeof api.bulkSelectionCount,'function','V5.4G must expose canonical selection-count bridge.');
assert(source.includes('Ordinary manual bulk selection stays on the'));
assert(source.includes('ROOT.V51QuestionBankBulkStatus?.buildPlan?.(rows,undefined,false)?.selected'));
assert(source.includes('const manualLocked = selected > 0;'));
assert(source.includes("page.page<=1 || manualLocked?'disabled':''"));
assert(source.includes("page.page>=page.totalPages || manualLocked?'disabled':''"));
assert(source.includes('Clear selection to change page, or use Select all filtered'));
assert(source.includes('function beginExplicitSelectionExpansion()'));
assert(source.includes("event.target?.closest?.('#v51b2a-select-visible')"));
assert(source.includes("event.target?.closest?.('.v52b-select')"));
assert(source.includes('state.selectionMode=true;'));
assert(source.includes('if (state.selectionMode && !state.expandingForExplicitSelection && bulkSelectionCount(allRows) === 0)'));
assert(!source.includes('if (!state.selectionMode){ state.selectionMode=true; state.page=1; scheduleRender(false); }'));
assert(source.includes('Ordinary checkbox selection remains on the current 50-card page.'));
assert(bulk.includes('const selectedIds = new Set();'),'B2A must remain sole canonical selection store.');
assert(bulk.includes('buildPlan(rows=currentQuestions(),ids=selectedIds'));
assert(scope.includes('Selection scope locked.'),'Consolidated V54F scope safety must remain in place.');
assert(release.includes("loadScriptOnce('v52b1-question-bank-performance.js?v=52b1-3', 'data-v52b1-question-bank-performance');"));
assert(release.includes("loadScriptOnce('resource-bank-bulk.js', 'data-resource-bank-bulk');"));
assert(!/cloud\.from\(|cloud\.rpc\(|localStorage|sessionStorage/.test(source));
console.log('V5.4G paged manual bulk selection regression passed against consolidated V54F owner.');
