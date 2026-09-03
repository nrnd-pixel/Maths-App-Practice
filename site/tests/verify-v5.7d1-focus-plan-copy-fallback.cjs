const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname,'..');
const modulePath = path.join(root,'v57d1-focus-plan-copy-fallback.js');
const configPath = path.join(root,'config.js');
const source = fs.readFileSync(modulePath,'utf8');
const config = fs.readFileSync(configPath,'utf8');
const api = require(modulePath);

assert.equal(api.RPC_NAME,'get_teacher_past_paper_analytics_v56d');
assert.equal(typeof api.enableFocusButtons,'function','focus-plan fallback must expose the disabled-button repair helper');
assert.match(source,/window\.addEventListener\(['"]click['"],handleCopyClick,true\)/,'fallback must intercept the focus-plan gesture before V5.7D document capture');
assert.match(source,/button\.disabled\s*=\s*false/,'focus-plan action must be re-enabled even when V5.7D has no weak-question/topic rows yet');
assert.match(source,/removeAttribute\(['"]disabled['"]\)/,'disabled attribute must be removed so the user click can actually fire');
assert.match(source,/MutationObserver/,'focus-plan action must be repaired after analytics panel rerenders');
assert.match(source,/showOverlay\(text\)/,'top-level focus-plan action should always open a visible in-app plan');
assert.match(source,/document\.execCommand\(['"]copy['"]\)/,'synchronous clipboard fallback should remain available from the explicit Copy Plan gesture');
assert.match(source,/navigator\.clipboard\?\.writeText/,'modern Clipboard API should remain supported');
assert.match(source,/Teaching Focus Plan/);
assert.match(source,/Ctrl\+C/,'manual copy instructions must remain available when browser clipboard access is blocked');
assert.match(source,/data-v57d1-copy/);
assert.match(source,/data-v57d1-select/);
assert.match(source,/readonly aria-label="Teaching focus plan"/);
assert.doesNotMatch(source,/create_teacher_past_paper_assignments_v56b|update_teacher_past_paper_assignment_v57b|reassign_teacher_past_paper_assignment_v57b/,'copy fallback must not add assignment writes');
assert.doesNotMatch(source,/cloud\.from\(/,'copy fallback must remain read-only');
assert.doesNotMatch(source,/correct_answer|correctAnswer|service_role|student_pin|pin_hash/i,'copy fallback must not expose protected answer or credential data');
assert.doesNotMatch(source,/localStorage|sessionStorage/,'copy fallback needs no browser persistence');

const v57d = config.indexOf("'./v57d-past-paper-analytics-actions.js'");
const v57d1 = config.indexOf("'./v57d1-focus-plan-copy-fallback.js'");
assert.ok(v57d >= 0 && v57d1 > v57d,'V5.7D.1 must load after V5.7D analytics actions');
assert.match(config,/synchronous and selectable in-app fallbacks/i);

console.log('V5.7D.1 Focus Plan Copy Fallback regression passed.');
console.log('- disabled analytics focus-plan buttons are repaired after every panel render');
console.log('- top-level action always opens a visible selectable plan before clipboard use');
console.log('- restricted clipboard contexts retain explicit Copy Plan and manual-copy fallbacks');
console.log('- analytics remains teacher-authenticated and read-only');
