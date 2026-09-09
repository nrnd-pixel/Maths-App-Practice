'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname);
const retired=Object.freeze([
  'v52c-topical-publication.js',
  'v52c-student-topical-library.js',
  'v52c1-topical-library-mount-hotfix.js',
  'v52c-topical-hint-bridge.js',
  'v52c2-topical-result-ux.js'
]);

const self=path.basename(__filename);
const explicitReferenceGuards=new Set([
  self,
  'verify-phase4-v52c-legacy-student-route-integrity.cjs'
]);

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(full));
    else if(entry.isFile()&&entry.name.endsWith('.cjs')) out.push(full);
  }
  return out;
}

function isExplicitReferenceGuard(file){
  const base=path.basename(file);
  return explicitReferenceGuards.has(base) || /protected-sha\.cjs$/.test(base);
}

function forms(name){
  return [name,name.replace(/\./g,'\\.')];
}

const files=walk(ROOT).sort();
const violations=[];
const referenceFiles=[];
for(const file of files){
  const source=fs.readFileSync(file,'utf8');
  const hits=[];
  for(const name of retired){
    if(forms(name).some(form=>source.includes(form))) hits.push(name);
  }
  if(!hits.length) continue;
  const rel=path.relative(ROOT,file).replace(/\\/g,'/');
  if(isExplicitReferenceGuard(file)) referenceFiles.push({file:rel,hits});
  else violations.push({file:rel,hits});
}

assert.deepEqual(violations,[],`ordinary maintained verifiers must not reference dormant V52C filenames:\n${violations.map(row=>`- ${row.file}: ${row.hits.join(', ')}`).join('\n')}`);
console.log(`Phase 4 V52C dormant-reference scan passed: ${files.length} site/tests .cjs files scanned recursively; ${referenceFiles.length} explicit reference/protected-SHA guards contain retired V52C filenames.`);
