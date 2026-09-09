const fs=require('fs');
const path=require('path');
const assert=require('assert');
const {section,loadApi}=require('./v52c-consolidated-test-helper.cjs');

const source=section('result');
const sqlPath=path.join(__dirname,'..','..','supabase','v52c2_topical_ticket_rotation.sql');
const sql=fs.readFileSync(sqlPath,'utf8');
const api=loadApi(source);

assert.strictEqual(api.norm(' Topical   Exercise 2 '),'topical exercise 2');
assert.strictEqual(api.isStruggleAction('Practice what I struggled with'),true);
assert.strictEqual(api.isStruggleAction('Practise what I struggled with'),true);
assert.strictEqual(api.isStruggleAction('Practice Again'),false);
assert(/Topical Practice result/.test(api.topicalPrivacyText()));

assert(source.includes("setTextIfChanged(heading,'Topical Practice Complete')"),'Topical result heading must be explicit and idempotent');
assert(source.includes("setTextIfChanged(again,'Practise this topical set again')"),'Repeat action must identify the topical set route');
assert(source.includes("result?.dataset.v52c2TopicalResult!=='1'"),'Ordinary Practice repeat behavior must be left untouched');
assert(source.includes("document.addEventListener('click',onCaptureClick,true)"),'Topical repeat must intercept the legacy ordinary Practice handler before it runs');
assert(source.includes("event.stopImmediatePropagation()"),'Topical repeat must prevent the legacy again handler from routing to ordinary Practice');
assert(source.includes("topical.click()"),'Repeat must reopen the existing Topical Practice mode');
assert(source.includes("waitForPublishedSet(context.source)"),'Repeat must wait for the server-filtered published library');
assert(source.includes("card.click()"),'Repeat must select through the existing published-set card rather than bypass publication');
assert(source.includes("This topical exercise is no longer available"),'Repeat must fail closed when the set has been unpublished');
assert(source.includes("isStruggleAction(button.textContent)"),'Ordinary struggle-practice CTA must be suppressed on topical results');
assert(source.includes("restoreOrdinaryResult(result)"),'Generic Practice result wording/actions must be restored for non-topical sessions');

assert(source.includes("attributeFilter:['class']"),'Result observer must only watch screen activation state');
assert(!source.includes('childList:true'),'Result observer must not watch text mutations that it creates itself');
assert(!source.includes('characterData:true'),'Result observer must not watch character data that it creates itself');
assert(!source.includes('subtree:true'),'Result observer must not observe its own descendant mutations');
assert(source.includes("if (node && node.textContent !== text) node.textContent = text"),'Result text writes must be idempotent');
assert(source.includes('html[data-theme="dark"]'),'Topical result UX must include dark-theme support');
assert(source.includes("background:var(--card)"),'Dark-mode topical set cards must use the themed card background');

assert(source.includes("cloud.rpc('renew_student_practice_access_v52c2'"),'Completed topical sessions must rotate the used Practice ticket');
assert(source.includes("stored.tokens.practice=next"),'Rotated Practice ticket must replace the V4 signed-in session token in sessionStorage');
assert(source.includes("practiceOverrideToken=next"),'Rotated Practice ticket must take effect immediately in the current page');
assert(source.includes("validateStudentAccess=async function(purpose)"),'Current-page access validation must use the rotated Practice token');
assert(source.includes('void rotateCompletedTopicalTicket()'),'Ticket rotation must start as soon as the topical result is shown');
assert(source.includes('const refreshed=await rotateCompletedTopicalTicket()'),'Repeat must wait for a successful ticket rotation');

assert(sql.includes('20260830162514 v52c2_topical_ticket_rotation'),'Repository SQL must record the first applied migration exactly');
assert(sql.includes('20260830162751 v52c2_topical_ticket_rotation_unbound'),'Repository SQL must record the final applied migration exactly');
assert(sql.includes('create or replace function public.renew_student_practice_access_v52c2'),'Rotation RPC must be versioned in the repository');
assert(sql.includes("or v_ticket.used_at is null"),'Only a completed/used Practice ticket may be rotated');
assert(sql.includes("nullif(trim(coalesce(v_ticket.topical_source,'')),'') is null"),'Only a ticket used by Topical Practice may be rotated');
assert(sql.includes("set expires_at=now()"),'The old used bearer token must be invalidated when rotated');
assert(sql.includes("v_ticket.year_level,v_ticket.class_group,v_expires_at,null"),'The replacement ticket must be unbound so normal Practice or another published topical set remains available');
assert(sql.includes("set search_path = ''"),'Security-definer rotation RPC must pin search_path');
assert(sql.includes('revoke execute on function public.renew_student_practice_access_v52c2(text)'),'Rotation RPC must revoke default PUBLIC execution');
assert(sql.includes('to anon, authenticated'),'Rotation RPC must explicitly grant only the student client roles');

assert(!source.includes("cloud.from('questions')"),'Result polish must not access the question table');
assert(!source.includes("cloud.rpc('get_student_questions'"),'Result polish must not call ordinary Practice retrieval');
assert(!source.includes("update({active"),'Result polish must never activate topical questions');
assert(!source.includes('save_topical_exercise_setting_v52c'),'Result polish must not change publication state');

console.log('V5.2C.2 topical result UX and ticket rotation checks passed.');