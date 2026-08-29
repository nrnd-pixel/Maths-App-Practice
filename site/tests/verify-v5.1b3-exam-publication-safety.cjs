const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname,'..');
const jsPath = path.join(root,'v51-exam-publication-safety.js');
const sqlPath = path.join(root,'..','supabase','v51b3_exam_publication_safety.sql');
const code = fs.readFileSync(jsPath,'utf8');
const sql = fs.readFileSync(sqlPath,'utf8');

const sandbox = { window:{}, console };
vm.createContext(sandbox);
vm.runInContext(code,sandbox,{filename:'v51-exam-publication-safety.js'});
const api = sandbox.window.V51ExamPublicationSafety;
assert(api,'V51ExamPublicationSafety API should be exported');

const missing = api.safeMissingSetting(null);
assert.strictEqual(missing.exists,false,'missing setting must be identified');
assert.strictEqual(missing.is_available,false,'missing setting must default to unavailable');
assert.strictEqual(missing.answer_release_rule,'after_manual_review','missing setting should use conservative answer release');

const saved = api.safeMissingSetting({is_available:true,duration_minutes:45,answer_release_rule:'never'});
assert.strictEqual(saved.exists,true);
assert.strictEqual(saved.is_available,true);
assert.strictEqual(saved.duration_minutes,45);
assert.strictEqual(saved.answer_release_rule,'never');

assert.strictEqual(api.availabilityTransition(false,true),'publish');
assert.strictEqual(api.availabilityTransition(true,false),'unpublish');
assert.strictEqual(api.availabilityTransition(false,false),'none');
assert.strictEqual(api.canPublish({ready:true}),true);
assert.strictEqual(api.canPublish({ready:false}),false);
assert.strictEqual(api.blockerCount({metadata_blockers:1,image_blockers:2,review_blockers:1,duplicate_groups:1,ungrouped_multipart_rows:1,multipart_blocker_groups:1}),7);

assert(code.includes("cloud.rpc('get_exam_paper_readiness_v51b3'"),'UI must read server readiness');
assert(code.includes("cloud.rpc('save_exam_paper_setting_v51b3'"),'UI must save through guarded RPC');
assert(!code.includes("from('exam_paper_settings').upsert"),'B3 UI must not directly upsert settings');
assert(code.includes('Students will be able to start this exam immediately after this save.'),'publish transition must have explicit confirmation wording');
assert(code.includes('Existing results are preserved; students will no longer be able to start this paper.'),'unpublish transition must explain preservation');

assert(sql.includes('create or replace function public.exam_paper_readiness_v51b3'),'migration must define server readiness');
assert(sql.includes('create or replace function public.save_exam_paper_setting_v51b3'),'migration must define guarded save RPC');
assert(sql.includes("current_setting('app.v51b3_guarded_save',true)"),'direct publication must require guarded RPC context');
assert(sql.includes('Exam paper is not ready for publication'),'database must reject unready publication');
assert(sql.includes('create constraint trigger questions_published_exam_integrity_v51b3'),'published papers must be protected from breaking question changes');
assert(sql.includes('deferrable initially deferred'),'question integrity guard must evaluate final transaction state');
assert(sql.includes('Unpublish it before making this question-bank change'),'published integrity failure must tell teacher how to proceed');

console.log('V5.1B3 exam publication safety checks passed.');
