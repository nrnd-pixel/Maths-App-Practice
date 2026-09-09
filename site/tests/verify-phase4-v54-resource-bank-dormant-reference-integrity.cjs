'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const SITE=path.resolve(__dirname,'..');
const loader=fs.readFileSync(path.join(SITE,'v40-release.js'),'utf8');
const dormant=Object.freeze([
  'v54a-resource-bank-visibility.js',
  'v54b-practice-eligibility-controls.js',
  'v54c-compact-question-bank.js',
  'v54d-topical-resource-simplification.js',
  'v54e-bulk-practice-eligibility.js',
  'v54f-bulk-selection-scope-safety.js'
]);

for(const file of dormant){
  assert.equal(fs.existsSync(path.join(SITE,file)),true,`${file} must remain in-repo as dormant/reference source`);
  assert.equal(loader.includes(`loadScriptOnce('${file}`),false,`${file} must not remain active in v40-release.js`);
}
assert.match(loader,/loadScriptOnce\('resource-bank-ui\.js',\s*'data-resource-bank-ui'\)/,'A-D consolidated owner must be active');
assert.match(loader,/loadScriptOnce\('resource-bank-bulk\.js',\s*'data-resource-bank-bulk'\)/,'E-F consolidated owner must be active');

function listCjsFiles(dir){
  const files=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) files.push(...listCjsFiles(full));
    else if(entry.isFile()&&entry.name.endsWith('.cjs')) files.push(full);
  }
  return files.sort();
}
function mentionsDormant(source,file){
  const escaped=file.replace(/\.js$/,'\\.js');
  return source.includes(file)||source.includes(escaped);
}

// Only guards whose explicit purpose is historical/source/SHA preservation may name
// retired A-F filenames. All ordinary maintained verifiers must target the active owners.
const allowed=new Set([
  'verify-phase4-v54-resource-bank-dormant-reference-integrity.cjs',
  'verify-phase4-v54-resource-bank-integrity.cjs',
  'verify-phase4-v54-resource-bank-protected-sha.cjs',
  'verify-phase4-v53-ui-resource-companion-protected-sha.cjs',
  'verify-phase4-v53-practice-selection-protected-sha.cjs',
  'verify-phase4-teacher-assignments-checkpoint2-protected-sha.cjs',
  'verify-phase4-v52c-legacy-student-route-protected-sha.cjs'
]);

const all=listCjsFiles(__dirname);
const unexpected=[];
const seen=new Map();
for(const full of all){
  const rel=path.relative(__dirname,full).replaceAll(path.sep,'/');
  const source=fs.readFileSync(full,'utf8');
  const hits=dormant.filter(file=>mentionsDormant(source,file));
  if(!hits.length) continue;
  seen.set(rel,hits);
  if(!allowed.has(rel)) unexpected.push(`${rel}: ${hits.join(', ')}`);
}
assert.deepEqual(unexpected,[],`No ordinary verifier may depend on retired V54A-F browser filenames.\n${unexpected.join('\n')}`);
for(const expected of [
  'verify-phase4-v54-resource-bank-dormant-reference-integrity.cjs',
  'verify-phase4-v54-resource-bank-integrity.cjs',
  'verify-phase4-v54-resource-bank-protected-sha.cjs'
]) assert.equal(seen.has(expected),true,`${expected} should intentionally reference historical V54A-F sources`);

console.log(`Phase 4 V54 dormant-reference scan passed: ${all.length} site/tests .cjs files scanned recursively; ${seen.size} explicit reference guards contain retired V54A-F filenames.`);
