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

const directVerifiers=Object.freeze({
  'verify-v5.3a-practice-eligibility.cjs':'practice-eligibility-ui.js',
  'verify-v5.3c-two-mode-student-ui.cjs':'practice-ui-resource-clarity.js',
  'verify-v5.3d6-resource-bank-status-clarity.cjs':'practice-ui-resource-clarity.js'
});
for(const [verifier,activeFile] of Object.entries(directVerifiers)){
  const text=fs.readFileSync(path.join(__dirname,verifier),'utf8');
  assert.ok(text.includes(activeFile),`${verifier} must target active ${activeFile}`);
  for(const file of dormant){
    assert.equal(text.includes(`require('../${file}')`),false,`${verifier} must not execute dormant ${file}`);
  }
}

for(const verifier of ['verify-v5.4a-resource-bank-visibility.cjs','verify-v5.4b-practice-eligibility-controls.cjs']){
  const text=fs.readFileSync(path.join(__dirname,verifier),'utf8');
  assert.ok(text.includes("practice-ui-resource-clarity.js"),`${verifier} must inspect the active D6 owner`);
  assert.equal(text.includes("path.join(siteRoot,'v53d6-resource-bank-status-clarity.js')"),false,`${verifier} must not validate dormant D6 as runtime`);
}

console.log('Phase 4 V53 UI/resource dormant-reference integrity guard passed.');
