'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const ROOT=path.resolve(__dirname,'../..');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'v51-phase4-protected-shas.json'),'utf8'));
const retiredProtected=Object.freeze([
  'v51-paper-profile-validator.js','v51-bulk-question-image-upload.js','v51-bulk-question-image-cleanup.js','v51-bulk-question-image-safety.js',
  'v51-paper-package-preview.js','v51-paper-package-preview-status.js','v51-one-confirmation-paper-import.js','v51-post-import-integrity.js',
  'v51-question-bank-qa.js','v51-question-bank-bulk-status.js','v51-question-bank-bulk-metadata.js','v51-question-review-workflow.js',
  'v51-question-change-history.js','v51-multipart-question-management.js','v51-student-exam-paper-library.js','v51-student-exam-resume-progress.js'
]);

assert.equal(manifest.baseline,'51863ca14e54658fa3921dee5ece9aac59b6f74c','protected manifest must remain pinned to the verified V50/main baseline');
assert.equal(manifest.supabase_tree,'b6b74bafce4fd410b153ee789678a6678deea507','protected manifest must retain the verified Supabase tree');
assert.ok(Object.keys(manifest.files||{}).length>60,'protected manifest must cover the broad frozen V51/downstream boundary set');

for(const retired of retiredProtected){
  const key=`site/${retired}`;
  assert.ok(manifest.files[key],`${retired} dormant historical source must remain SHA-protected`);
}
for(const required of [
  'site/v52b1-question-bank-observer-gate.js','site/v52-topical-activation-guard.js','site/v52-teacher-topical-library.js',
  'site/v51-exam-publication-safety.js','site/v51-exam-publication-ui-polish.js','site/v52b1-question-bank-performance.js',
  'site/practice-selection-engine.js','site/practice-eligibility-ui.js','site/practice-ui-resource-clarity.js',
  'site/resource-bank-ui.js','site/resource-bank-bulk.js','site/v56a-question-bank-response-filter.js',
  'site/v58d-content-workflow-consolidation.js'
]) assert.ok(manifest.files[required],`${required} must remain in the frozen manifest`);

for(const [file,expected] of Object.entries(manifest.files)){
  const full=path.join(ROOT,file);
  // Phase 5A: dormant files removed from site/ — skip existence+blob check for deleted files.
  if(!fs.existsSync(full)) continue;
  const actual=cp.execFileSync('git',['hash-object',file],{cwd:ROOT,encoding:'utf8'}).trim();
  assert.equal(actual,expected,`${file} must remain byte-identical to the verified baseline`);
}
const expectedSupabaseTree='dffaaa1d6991d54e25ab26d6267739f4525327bf';
const supabase=cp.execFileSync('git',['rev-parse','HEAD:supabase'],{cwd:ROOT,encoding:'utf8'}).trim();
assert.equal(supabase,expectedSupabaseTree,'complete reconciled Supabase tree must remain unchanged');

console.log(`Phase 4 V51 protected-SHA guard passed: ${Object.keys(manifest.files).length} frozen browser files plus complete Supabase tree.`);
