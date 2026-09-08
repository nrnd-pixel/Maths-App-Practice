'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const SITE=path.resolve(__dirname,'..');
const loader=fs.readFileSync(path.join(SITE,'v40-release.js'),'utf8');
const dormant=Object.freeze([
  'v53a-practice-eligibility.js',
  'v53c-two-mode-student-ui.js',
  'v53d6-resource-bank-status-clarity.js'
]);

for(const file of dormant){
  const full=path.join(SITE,file);
  assert.equal(fs.existsSync(full),true,`${file} must remain in the repository as dormant/reference source`);
  assert.equal(loader.includes(`loadScriptOnce('${file}`),false,`${file} must not remain active in v40-release.js`);
}

assert.match(loader,/loadScriptOnce\('practice-eligibility-ui\.js',\s*'data-practice-eligibility-ui'\)/,'consolidated V53A owner must be active');
assert.match(loader,/loadScriptOnce\('practice-ui-resource-clarity\.js',\s*'data-practice-ui-resource-clarity'\)/,'consolidated V53C/D6 owner must be active');

function listCjsFiles(dir){
  const files=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) files.push(...listCjsFiles(full));
    else if(entry.isFile()&&entry.name.endsWith('.cjs')) files.push(full);
  }
  return files.sort();
}

function mentionsDormantBrowserFile(source,dormantFile){
  const regexLiteralForm=dormantFile.replace(/\.js$/, '\\.js');
  return source.includes(dormantFile)||source.includes(regexLiteralForm);
}

// Only guards whose purpose is to preserve/compare the historical source may name
// these retired browser files. Ordinary maintained verifiers must target the active
// consolidated owners instead. Keep this allowlist explicit so a new stale verifier
// reference fails closed.
const allowedReferenceVerifiers=new Set([
  'verify-phase4-v53-ui-resource-companion-dormant-reference-integrity.cjs',
  'verify-phase4-v53-ui-resource-companion-integrity.cjs',
  'verify-phase4-v53-ui-resource-companion-protected-sha.cjs',
  'verify-phase4-v53-practice-selection-protected-sha.cjs',
  'verify-phase4-teacher-assignments-checkpoint2-protected-sha.cjs'
]);

const allVerifiers=listCjsFiles(__dirname);
const unexpected=[];
const seen=new Map();
for(const full of allVerifiers){
  const rel=path.relative(__dirname,full).replaceAll(path.sep,'/');
  const source=fs.readFileSync(full,'utf8');
  const hits=dormant.filter(file=>mentionsDormantBrowserFile(source,file));
  if(!hits.length) continue;
  seen.set(rel,hits);
  if(!allowedReferenceVerifiers.has(rel)) unexpected.push(`${rel}: ${hits.join(', ')}`);
}

assert.deepEqual(
  unexpected,
  [],
  `No maintained verifier may depend on newly dormant V53A/C/D6 browser filenames outside explicit reference guards.\n${unexpected.join('\n')}`
);

for(const expected of [
  'verify-phase4-v53-ui-resource-companion-dormant-reference-integrity.cjs',
  'verify-phase4-v53-ui-resource-companion-integrity.cjs',
  'verify-phase4-v53-ui-resource-companion-protected-sha.cjs'
]){
  assert.equal(seen.has(expected),true,`${expected} should remain an intentional historical-reference guard`);
}

console.log(`Phase 4 V53 UI/resource dormant-reference scan passed: ${allVerifiers.length} site/tests .cjs files scanned recursively; ${seen.size} explicit reference guards contain retired V53A/C/D6 filenames.`);
