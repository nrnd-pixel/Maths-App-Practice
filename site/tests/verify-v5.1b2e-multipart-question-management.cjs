const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname,'..');
const uiPath = path.join(root,'question-bank-audit-multipart.js');
const sqlPath = path.resolve(root,'../supabase/v51b2e_multipart_question_management.sql');
const ui = fs.readFileSync(uiPath,'utf8');
const sql = fs.readFileSync(sqlPath,'utf8');

global.window = {};
require(uiPath);
const api = global.window.V51MultipartQuestionManagement;
assert(api,'B2E API should be exposed');

function row(id,label,order,extra={}){
  return {
    id, year_level:6, exam_year:2020, paper:'Paper 2', parent_question_number:'23',
    question_number:`23(${label})`, part_label:label, part_order:order,
    group_prompt:'Study the graph.', active:true, review_status:'none', marks:1,
    question_text:`Part ${label}`,
    ...extra
  };
}

const clean = api.analyzeGroup([row('a','a',1),row('b','b',2)]);
assert.equal(clean.issues.length,0,'clean multipart group should have no structural issues');
assert.equal(clean.warnings.length,0,'clean multipart group should have no warnings');
assert.equal(clean.safeNormalize,true,'a/b labels should be safe to normalize');
assert.equal(clean.normalizationNeeded,false,'correct order should need no normalization');
assert.equal(clean.sharedPrompt,'Study the graph.');

const promptMismatch = api.analyzeGroup([
  row('a','a',1), row('b','b',2,{group_prompt:''})
]);
assert(promptMismatch.issues.some(x=>/prompts are inconsistent/i.test(x)),'blank-vs-filled prompt mismatch must be detected');

const duplicateOrder = api.analyzeGroup([row('a','a',1),row('b','b',1)]);
assert(duplicateOrder.issues.some(x=>/Duplicate part-order/i.test(x)),'duplicate part order must be detected');

const mixedState = api.analyzeGroup([
  row('a','a',1), row('b','b',2,{active:false,review_status:'needs_review'})
]);
assert(mixedState.warnings.some(x=>/mixed active/i.test(x)),'mixed active state should be a warning');
assert(mixedState.warnings.some(x=>/mixed review/i.test(x)),'mixed review state should be a warning');

const shuffled = api.analyzeGroup([row('a','a',2),row('b','b',1)]);
assert.equal(shuffled.safeNormalize,true,'unique contiguous labels should be normalizable');
assert.equal(shuffled.normalizationNeeded,true,'label/order disagreement should need normalization');

const gap = api.analyzeGroup([
  row('a','a',1),
  row('c','c',2,{question_number:'23(c)'})
]);
assert.equal(gap.safeNormalize,false,'a/c label gap must not be normalized automatically');

const numberMismatch = api.analyzeGroup([row('a','a',1,{question_number:'23(b)'}),row('b','b',2)]);
assert(numberMismatch.issues.some(x=>/Question number and part label/i.test(x)),'question number/label mismatch must be detected');

assert(ui.includes("cloud.rpc('manage_multipart_group_v51b2e'"),'browser writes must use the server-verified multipart RPC');
assert(!/\.from\(['\"]questions['\"]\)\.update\(/.test(ui),'B2E browser must not update questions directly');
assert(!/\.delete\s*\(/.test(ui),'B2E browser must not delete data');
assert(sql.includes('if not public.is_teacher()'),'RPC must enforce teacher access');
assert(sql.includes("'set_group_prompt','normalize_part_order'"),'RPC must whitelist multipart actions');
assert(/set group_prompt = v_prompt/.test(sql),'RPC should change group_prompt only for prompt action');
assert(/set part_order = ascii/.test(sql),'RPC should normalize only part_order for order action');
assert(sql.includes('revoke all on function public.manage_multipart_group_v51b2e') && sql.includes('from anon'),'anonymous execution must be revoked');
assert(!/set\s+(answer|marks|question_text|question_number|active|response_type)\s*=/i.test(sql),'RPC must not change protected content/status fields');

console.log('V5.1B2E multipart question management — PASS');
