'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
const TEST_ROOT=path.join(ROOT,'site','tests');

const retired=Object.freeze([
  'v51-paper-profile-validator.js',
  'v51-bulk-question-image-upload.js',
  'v51-bulk-question-image-cleanup.js',
  'v51-bulk-question-image-safety.js',
  'v51-paper-package-preview.js',
  'v51-paper-package-preview-status.js',
  'v51-one-confirmation-paper-import.js',
  'v51-post-import-integrity.js',
  'v51-question-bank-qa.js',
  'v51-question-bank-bulk-status.js',
  'v51-question-bank-bulk-metadata.js',
  'v51-question-review-workflow.js',
  'v51-question-change-history.js',
  'v51-multipart-question-management.js',
  'v51-student-exam-paper-library.js',
  'v51-student-exam-resume-progress.js'
]);

const explicitReferenceGuards=new Set([
  'verify-phase4-v51-question-bank-management-dormant-reference-integrity.cjs',
  'verify-phase4-v51-question-bank-management-integrity.cjs',
  'verify-phase4-v51-question-bank-management-protected-sha.cjs'
]);

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith('.cjs') ? [full] : [];
  });
}
function escaped(name){ return name.replace(/\./g,'\\.'); }

const files=walk(TEST_ROOT).sort();
const offenders=[];
const allowedHits=[];
for(const file of files){
  const source=fs.readFileSync(file,'utf8');
  const hits=retired.filter(name=>source.includes(name)||source.includes(escaped(name)));
  if(!hits.length) continue;
  const base=path.basename(file);
  if(explicitReferenceGuards.has(base)) allowedHits.push({file:path.relative(ROOT,file),hits});
  else offenders.push({file:path.relative(ROOT,file),hits});
}

assert.deepEqual(offenders,[],`ordinary maintained verifiers must not reference retired V51 source filenames:\n${JSON.stringify(offenders,null,2)}`);
for(const required of explicitReferenceGuards){
  assert.ok(allowedHits.some(row=>path.basename(row.file)===required),`${required} must remain an explicit historical-source/reference guard`);
}
console.log(`Phase 4 V51 dormant-reference scan passed: ${files.length} site/tests .cjs files scanned recursively; ${allowedHits.length} explicit guards contain retired V51 filenames.`);
