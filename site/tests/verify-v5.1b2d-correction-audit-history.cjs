'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {section}=require('./v51-owner-section-helper.cjs');

const root = path.resolve(__dirname,'..','..');
const sql = fs.readFileSync(path.join(root,'supabase','v51b2d_question_change_history.sql'),'utf8');
const source = section('question-bank-audit-multipart.js','/* V5.1B2D — Teacher-only correction audit history viewer.','/* V5.1B2E — Multipart Question Management.');
const js = source;

function has(text,needle,message){ assert(text.includes(needle),message || `Missing ${needle}`); }

has(sql,'create table if not exists public.question_change_history','audit table must exist');
has(sql,'create trigger questions_change_history_v51b2d','database trigger must enforce capture');
has(sql,'after update on public.questions','trigger must capture question updates');
has(sql,"'answer'",'answer changes must be tracked');
has(sql,"'marks'",'mark changes must be tracked');
has(sql,"'active'",'active changes must be tracked');
has(sql,"'question_number'",'question numbering changes must be tracked');
has(sql,"'response_config'",'response configuration changes must be tracked');
has(sql,"'parent_question_number'",'multipart changes must be tracked');
has(sql,"'review_status'",'review state changes must be tracked');
assert(!/v_fields[^;]*updated_at/s.test(sql),'updated_at must not be a tracked audit field');
has(sql,'auth.uid()','audit rows must capture authenticated actor when available');
has(sql,"revoke all on table public.question_change_history from anon, authenticated",'clients must not read/write audit table directly');
has(sql,"if not public.is_teacher() then",'history RPC must require teacher access');
has(sql,"revoke all on function public.get_question_change_history_v51b2d(uuid,integer) from public, anon",'history RPC must not be anonymous');
has(sql,"grant execute on function public.get_question_change_history_v51b2d(uuid,integer) to authenticated",'authenticated teachers need RPC access');

has(js,"cloud.rpc('get_question_change_history_v51b2d'",'viewer must use teacher history RPC');
has(js,'Select exactly one question','viewer must require one selected question');
has(js,'old', 'viewer must render old values');
has(js,'new', 'viewer must render new values');
has(js,'Authenticated teacher','viewer should label authenticated actor without exposing UUID in primary UI');
has(js,'function refreshLifecycle()','viewer must expose an owner-native lifecycle refresh');
has(js,"if (typeof document === 'undefined') return [];","lifecycle refresh must fail safely without a DOM");
has(js,'bind();\n    return renderSelectionState();','lifecycle refresh must compose existing bind + selection-state ownership');
has(js,'renderHistory, refreshLifecycle','public API must export the lifecycle refresh');
assert(!js.includes(".from('question_change_history')"),'viewer must not bypass the teacher RPC');
assert(!/\.insert\s*\(/.test(js),'viewer must not write audit rows');
assert(!/\.update\s*\(/.test(js),'viewer must be read-only');
assert(!/\.delete\s*\(/.test(js),'viewer must be read-only');
assert(!/\.upsert\s*\(/.test(js),'viewer must be read-only');

console.log('V5.1B2D correction audit history — PASS');
