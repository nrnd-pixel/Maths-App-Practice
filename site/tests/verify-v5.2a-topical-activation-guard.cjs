const fs = require('fs');
const path = require('path');
const assert = require('assert');

const guardPath = path.join(__dirname,'..','v52-topical-activation-guard.js');
const source = fs.readFileSync(guardPath,'utf8');
const api = require(guardPath);

const topical = {id:'t1',source_type:'topical_exercise',active:false};
const practice = {id:'p1',source_type:'practice',active:false};
const activeTopical = {id:'t2',source_type:'topical_exercise',active:true};

assert(api.isTopical(topical),'Topical activation guard must identify topical_exercise rows');
assert(!api.isTopical(practice),'Topical activation guard must not affect ordinary Practice rows');
assert.strictEqual(api.rowById('t1',[topical,practice]),topical,'Activation guard must resolve Question Bank rows by id');
assert.deepStrictEqual(api.selectedTopicalRows([topical,practice,activeTopical],['t1','p1','t2']),[topical],'Only inactive topical rows should block bulk activation');

const fakeTarget = {
  closest(selector){
    if (selector !== '.toggle-q') return null;
    return {dataset:{id:'t1',active:'false'}};
  }
};
assert.strictEqual(api.blockedIndividualActivation(fakeTarget,[topical,practice]),topical,'Individual activation of a staged topical row must be blocked');
assert.strictEqual(api.blockedIndividualActivation(fakeTarget,[practice]),null,'Ordinary Practice activation must remain untouched');
assert(/must remain inactive in V5\.2A/i.test(api.blockMessage(1)),'Guard must explain the V5.2A staging boundary');
assert(/Deselect them before activating other questions/i.test(api.blockMessage(2)),'Bulk guard must give a safe recovery action');

assert(source.includes("document.addEventListener('click',guardClick,true)"),'Activation guard must intercept Question Bank activation in capture phase');
assert(source.includes("event.target?.closest?.('#v51b2a-activate')"),'Bulk Activate selected must be guarded');
assert(source.includes("target?.closest?.('.toggle-q')"),'Individual Activate must be guarded');
assert(source.includes("button.textContent = 'Staged — inactive'"),'Topical cards must visibly communicate the staging lock');

assert(!source.includes('cloud.from('),'Activation guard must not write Question Bank data itself');
assert(!source.includes('cloud.rpc('),'Activation guard must not call RPCs');
assert(!source.includes('localStorage.setItem'),'Activation guard must not write local storage');
assert(!source.includes('localStorage.removeItem'),'Activation guard must not delete local storage');
assert(!source.includes('correctResponse'),'Activation guard must not alter grading');
assert(!source.includes('get_student_questions'),'Activation guard must not alter student delivery');
assert(!source.includes('exam_paper_settings'),'Activation guard must not alter Exam publication');

console.log('V5.2A Topical Activation Guard checks passed.');
