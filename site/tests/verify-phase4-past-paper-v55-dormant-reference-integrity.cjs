const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const testsRoot=__dirname;
const dormantBrowserFiles=Object.freeze([
  'v55a-past-paper-practice.js',
  'v55a1-practice-type-guard.js',
  'v55b-full-paper-practice.js',
  'v55c-resume-past-paper-practice.js',
  'v55c1-resume-button-bridge.js',
  'v55d-past-paper-result-attribution.js'
]);

function listCjsFiles(dir){
  const files=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) files.push(...listCjsFiles(full));
    else if(entry.isFile() && entry.name.endsWith('.cjs')) files.push(full);
  }
  return files.sort();
}

function mentionsDormantBrowserFile(source,dormant){
  const regexLiteralForm=dormant.replace(/\.js$/, '\\.js');
  return source.includes(dormant) || source.includes(regexLiteralForm);
}

const verifierFiles=listCjsFiles(testsRoot);
const allowedReferenceFiles=new Set([
  'verify-phase4-past-paper-v55-checkpoint1-integrity.cjs',
  'verify-phase4-past-paper-v55-dormant-reference-integrity.cjs'
]);

const hits=[];
const unexpected=[];
for(const file of verifierFiles){
  const source=fs.readFileSync(file,'utf8');
  const name=path.basename(file);
  for(const dormant of dormantBrowserFiles){
    if(!mentionsDormantBrowserFile(source,dormant)) continue;
    hits.push({name,dormant});
    if(!allowedReferenceFiles.has(name)) unexpected.push({name,dormant});
  }
}

if(unexpected.length){
  for(const hit of unexpected){
    console.error(`Unexpected dormant V55 browser-file reference: ${hit.name} -> ${hit.dormant}`);
  }
  assert.fail(`${unexpected.length} verifier reference(s) still treat a retired V55 browser file as current.`);
}

const actualReferenceFiles=[...new Set(hits.map(hit=>hit.name))].sort();
assert.deepEqual(actualReferenceFiles,[...allowedReferenceFiles].sort(),
  'Retired V55 browser filenames must be confined to the two Phase 4 negative/reference guards.');

const read=name=>fs.readFileSync(path.join(testsRoot,name),'utf8');
const integrity=read('verify-phase4-past-paper-v55-checkpoint1-integrity.cjs');
assert.match(integrity,/for\(const old of retired\) assert\.equal\(pos\(old\),-1/,
  'Checkpoint integrity must assert every old V55 browser loader is dormant.');

// The maintained historical verifiers must follow active consolidated ownership.
const expectedOwners={
  'verify-v5.5a-past-paper-practice.cjs':'past-paper-core.js',
  'verify-v5.5a1-practice-type-guard.cjs':'past-paper-core.js',
  'verify-v5.5b-full-paper-practice.cjs':'past-paper-core.js',
  'verify-v5.5c-resume-past-paper-practice.cjs':'past-paper-resume.js',
  'verify-v5.5c1-resume-button-bridge.cjs':'past-paper-resume.js',
  'verify-v5.5d-past-paper-result-attribution.cjs':'past-paper-results.js',
  'verify-v5.5-stable-release-checkpoint.cjs':'past-paper-core.js'
};
for(const [name,owner] of Object.entries(expectedOwners)){
  const source=read(name);
  assert.ok(source.includes(owner),`${name} must verify active owner ${owner}`);
}

console.log('Phase 4 Past Paper V55 dormant-reference integrity checks passed.');
console.log(`- ${verifierFiles.length} site/tests .cjs verifier files scanned recursively`);
console.log(`- ${hits.length} retired filename reference(s) found, confined to ${actualReferenceFiles.length} negative/reference guards`);
console.log('- maintained V5.5 verifiers follow active consolidated core/resume/results ownership');
