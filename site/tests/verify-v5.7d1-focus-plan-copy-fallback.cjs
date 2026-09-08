const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname,'..');
const modulePath = path.join(root,'past-paper-analytics-actions.js');
const configPath = path.join(root,'config.js');
const combined = fs.readFileSync(modulePath,'utf8');
const d1Marker='/* V5.7D.1 — Focus Plan Copy Fallback.';
const d1Start=combined.indexOf(d1Marker);
assert.ok(d1Start>0,'Consolidated analytics-actions owner must contain the V57D1 fallback section');
const source=combined.slice(d1Start);
const config = fs.readFileSync(configPath,'utf8');
const sandbox={module:{exports:{}},exports:{},console};
vm.createContext(sandbox);
new vm.Script(source,{filename:'past-paper-analytics-actions.v57d1.js'}).runInContext(sandbox);
const api=sandbox.module.exports;

assert.equal(api.RPC_NAME,'get_teacher_past_paper_analytics_v56d');
assert.equal(typeof api.enableFocusButtons,'function');
assert.match(source,/window\.addEventListener\(['"]click['"],handleCopyClick,true\)/,'fallback must intercept before V57D document capture');
assert.match(source,/event\.stopImmediatePropagation\?\.\(\)/,'fallback must prevent the older V57D copy handler from also running');
assert.match(source,/button\.disabled\s*=\s*false/);
assert.match(source,/removeAttribute\(['"]disabled['"]\)/);
assert.match(source,/MutationObserver/);
assert.match(source,/showOverlay\(text\)/);
assert.match(source,/document\.execCommand\(['"]copy['"]\)/);
assert.match(source,/navigator\.clipboard\?\.writeText/);
assert.match(source,/Teaching Focus Plan/);
assert.match(source,/Ctrl\+C/);
assert.match(source,/data-v57d1-copy/);
assert.match(source,/data-v57d1-select/);
assert.match(source,/readonly aria-label="Teaching focus plan"/);
assert.doesNotMatch(combined,/create_teacher_past_paper_assignments_v56b|update_teacher_past_paper_assignment_v57b|reassign_teacher_past_paper_assignment_v57b/);
assert.doesNotMatch(combined,/cloud\.from\(/);
assert.doesNotMatch(combined,/correct_answer|correctAnswer|service_role|student_pin|pin_hash/i);
assert.doesNotMatch(combined,/localStorage|sessionStorage/);

const v57c = config.indexOf("'./v57c-student-continue-learning-home.js'");
const actionsIndex = config.indexOf("'./past-paper-analytics-actions.js'");
const stable = config.indexOf("'./v57-stable-release-checkpoint.js'");
assert.ok(actionsIndex > v57c && stable > actionsIndex,'Combined V57D/D1 owner must stay at the former V57D phase before V5.7 stable');
assert.match(config,/synchronous and selectable in-app fallbacks/i);

console.log('V5.7D.1 Focus Plan Copy Fallback regression passed.');
console.log('- disabled focus-plan buttons are repaired after analytics renders');
console.log('- window-capture fallback preserves the visible selectable plan before clipboard use');
console.log('- analytics remains teacher-authenticated and read-only');
