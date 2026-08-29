const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname,'..');
const js = fs.readFileSync(path.join(root,'v51-exam-publication-bulk-guard.js'),'utf8');
const sql = fs.readFileSync(path.join(root,'..','supabase','v51b3_exam_publication_bulk_safety.sql'),'utf8');

const sandbox = { window:{}, document:undefined, console };
vm.createContext(sandbox);
vm.runInContext(js,sandbox,{filename:'v51-exam-publication-bulk-guard.js'});

assert(js.includes("event.stopImmediatePropagation()"),'bulk guard must suppress the legacy direct upsert handler');
assert(js.includes("cloud.rpc('save_exam_paper_settings_bulk_v51b3'"),'bulk save must use the canonical atomic B3 bulk RPC');
assert(js.includes("current_available:card.dataset.v51b3CurrentAvailable === 'true'"),'bulk guard must compare against persisted availability');
assert(js.includes('All selected papers are saved atomically.'),'bulk confirmation must explain atomic behavior');
assert(js.includes('Students will be able to start these exams immediately.'),'bulk publish confirmation must state student impact');
assert(js.includes('Existing results are preserved; students will no longer be able to start these papers.'),'bulk unpublish confirmation must state preservation');
assert(!js.includes("from('exam_paper_settings').upsert"),'bulk guard must not directly upsert settings');

assert(sql.includes('create or replace function public.save_exam_paper_settings_bulk_v51b3'),'bulk migration must define canonical guarded RPC');
assert(sql.includes('Pass 1: validate the entire batch before any write'),'bulk RPC must validate the whole batch before writes');
assert(sql.includes('public.exam_paper_readiness_v51b3'),'bulk RPC must reuse server readiness');
assert(sql.includes('Duplicate paper in bulk Exam Settings'),'bulk RPC must reject duplicate paper entries');
assert(sql.includes("grant execute on function public.save_exam_paper_settings_bulk_v51b3(jsonb) to authenticated"),'bulk RPC must be authenticated-only');
assert(sql.includes('At most 50 paper settings can be saved at once'),'bulk RPC must cap batch size');

console.log('V5.1B3 guarded bulk Exam Settings checks passed.');
