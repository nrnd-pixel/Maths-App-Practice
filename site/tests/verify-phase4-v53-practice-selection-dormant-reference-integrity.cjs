'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const SITE=path.resolve(__dirname,'..');
const loader=fs.readFileSync(path.join(SITE,'v40-release.js'),'utf8');
const dormant=Object.freeze([
  'v53b-unified-practice-retrieval.js',
  'v53d3-practice-selection-quality.js',
  'v53d4-student-recommendation-alignment.js',
  'v53d5-practice-selection-intelligence.js'
]);

for(const file of dormant){
  const full=path.join(SITE,file);
  assert.equal(fs.existsSync(full),true,`${file} must remain in the repository as dormant/reference source`);
  assert.equal(loader.includes(`loadScriptOnce('${file}`),false,`${file} must not remain active in v40-release.js`);
}

assert.match(loader,/loadScriptOnce\('practice-selection-engine\.js',\s*'data-practice-selection-engine'\)/,'deterministic Practice engine must be active');

// Maintained direct V53 verifiers must test the new active owner, not import a
// dormant source file as the runtime under test. Historical filenames may still
// appear in the dedicated dormant/protected guards themselves.
const directVerifiers=[
  'verify-v5.3b-unified-practice-retrieval.cjs',
  'verify-v5.3d3-practice-selection-quality.cjs',
  'verify-v5.3d4-student-recommendation-alignment.cjs',
  'verify-v5.3d5-practice-selection-intelligence.cjs'
];
for(const verifier of directVerifiers){
  const text=fs.readFileSync(path.join(__dirname,verifier),'utf8');
  assert.match(text,/practice-selection-engine\.js/,`${verifier} must target the active consolidated engine`);
  for(const file of dormant){
    assert.equal(text.includes(`require('../${file}')`),false,`${verifier} must not execute dormant ${file}`);
  }
}

console.log('Phase 4 V53 dormant/reference integrity guard passed.');
