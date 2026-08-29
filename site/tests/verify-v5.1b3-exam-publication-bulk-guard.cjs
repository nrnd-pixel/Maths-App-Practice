const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname,'..');
const js = fs.readFileSync(path.join(root,'v51-exam-publication-bulk-guard.js'),'utf8');
const sql = fs.readFileSync(path.join(root,'..','supabase','v51b3_exam_publication_bulk_guard.sql'),'utf8');

const sandbox = { window:{}, document:undefined, console };
vm.createContext(sandbox);
vm.runInContext(js,sandbox,{filename:'v51-exam-publication-bulk-guard.js'});

assert(js.includes("event.stopImmediatePropagation()"),'bulk guard must suppress the legacy direct upsert handler');
assert(js.includes("cloud.rpc('save_exam_paper_settings_batch_v51b3'"),'bulk save must use the atomic B3 batch RPC');
assert(js.includes("current_available:card.dataset.v51b3CurrentAvailable === 'true'"),'bulk guard must compare against persisted availability');
assert(js.includes('All selected papers are saved atomically.'),'bulk confirmation must explain atomic behavior');
assert(js.includes('Students will be able to start these exams immediately.'),'bulk publish confirmation must state student impact');
assert(js.includes('Existing results are preserved; students will no longer be able to start these papers.'),'bulk unpublish confirmation must state preservation');
assert(!js.includes("from('exam_paper_settings').upsert"),'bulk guard must not directly upsert settings');

assert(sql.includes('create or replace function public.save_exam_paper_settings_batch_v51b3'),'batch migration must define guarded RPC');
assert(sql.includes('Preflight every requested publication before any write'),'batch RPC must preflight publications before writes');
assert(sql.includes('public.exam_paper_readiness_v51b3'),'batch RPC must reuse server readiness');
assert(sql.includes('public.save_exam_paper_setting_v51b3'),'batch RPC must reuse single-paper guarded save');
assert(sql.includes("grant execute on function public.save_exam_paper_settings_batch_v51b3(jsonb) to authenticated"),'batch RPC must be authenticated-only');
assert(sql.includes('At most 50 exam papers can be saved at once'),'batch RPC must cap batch size');

console.log('V5.1B3 guarded bulk Exam Settings checks passed.');
