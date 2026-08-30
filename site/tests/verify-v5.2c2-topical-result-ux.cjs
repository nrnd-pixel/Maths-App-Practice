const fs=require('fs');
const path=require('path');
const assert=require('assert');

const modulePath=path.join(__dirname,'..','v52c2-topical-result-ux.js');
const source=fs.readFileSync(modulePath,'utf8');
const api=require(modulePath);

assert.strictEqual(api.norm(' Topical   Exercise 2 '),'topical exercise 2');
assert.strictEqual(api.isStruggleAction('Practice what I struggled with'),true);
assert.strictEqual(api.isStruggleAction('Practise what I struggled with'),true);
assert.strictEqual(api.isStruggleAction('Practice Again'),false);
assert(/Topical Practice result/.test(api.topicalPrivacyText()));

assert(source.includes("heading.textContent='Topical Practice Complete'"),'Topical result heading must be explicit');
assert(source.includes("again.textContent='Practise this topical set again'"),'Repeat action must identify the topical set route');
assert(source.includes("result?.dataset.v52c2TopicalResult!=='1'"),'Ordinary Practice repeat behavior must be left untouched');
assert(source.includes("document.addEventListener('click',onCaptureClick,true)"),'Topical repeat must intercept the legacy ordinary Practice handler before it runs');
assert(source.includes("event.stopImmediatePropagation()"),'Topical repeat must prevent the legacy again handler from routing to ordinary Practice');
assert(source.includes("topical.click()"),'Repeat must reopen the existing Topical Practice mode');
assert(source.includes("waitForPublishedSet(context.source)"),'Repeat must wait for the server-filtered published library');
assert(source.includes("card.click()"),'Repeat must select through the existing published-set card rather than bypass publication');
assert(source.includes("This topical exercise is no longer available"),'Repeat must fail closed when the set has been unpublished');
assert(source.includes("isStruggleAction(button.textContent)"),'Ordinary struggle-practice CTA must be suppressed on topical results');
assert(source.includes("restoreOrdinaryResult(result)"),'Generic Practice result wording/actions must be restored for non-topical sessions');

assert(!source.includes("cloud.from('questions')"),'Result polish must not access the question table');
assert(!source.includes("cloud.rpc('get_student_questions'"),'Result polish must not call ordinary Practice retrieval');
assert(!source.includes("update({active"),'Result polish must never activate topical questions');
assert(!source.includes('save_topical_exercise_setting_v52c'),'Result polish must not change publication state');

console.log('V5.2C.2 topical result UX checks passed.');
