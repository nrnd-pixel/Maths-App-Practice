const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const testsRoot=__dirname;
const dormantBrowserFiles=Object.freeze([
  'v56b-teacher-assigned-past-paper-practice.js',
  'v56c-student-past-paper-progress.js',
  'v56d-teacher-past-paper-analytics.js',
  'v57a-cross-device-past-paper-resume.js',
  'v57a1-cross-device-local-bridge.js',
  'v57a2-stale-local-checkpoint-cleanup.js',
  'v57d-past-paper-analytics-actions.js',
  'v57d1-focus-plan-copy-fallback.js'
]);

function listCjsFiles(dir){
  const files=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) files.push(...listCjsFiles(full));
    else if(entry.isFile()&&entry.name.endsWith('.cjs')) files.push(full);
  }
  return files.sort();
}

function mentions(source,dormant){
  return source.includes(dormant)||source.includes(dormant.replace(/\.js$/,'\\.js'));
}

const allowed=new Set([
  'verify-phase4-past-paper-v56-v57-checkpoint1-integrity.cjs',
  'verify-phase4-past-paper-v56-v57-dormant-reference-integrity.cjs'
]);
const files=listCjsFiles(testsRoot);
const hits=[];
const unexpected=[];
for(const file of files){
  const name=path.basename(file);
  const source=fs.readFileSync(file,'utf8');
  for(const dormant of dormantBrowserFiles){
    if(!mentions(source,dormant)) continue;
    hits.push({name,dormant});
    if(!allowed.has(name)) unexpected.push({name,dormant});
  }
}
if(unexpected.length){
  unexpected.forEach(hit=>console.error(`Unexpected dormant V56/V57 Past Paper reference: ${hit.name} -> ${hit.dormant}`));
  assert.fail(`${unexpected.length} verifier reference(s) still treat a retired V56/V57 Past Paper browser file as active.`);
}
assert.deepEqual([...new Set(hits.map(hit=>hit.name))].sort(),[...allowed].sort(),
  'Retired V56/V57 Past Paper filenames must be confined to the two Phase 4 guards.');

const read=name=>fs.readFileSync(path.join(testsRoot,name),'utf8');
const expectedOwners={
  'verify-v5.6b-teacher-assigned-past-paper-practice.cjs':'past-paper-assignments.js',
  'verify-v5.6c-student-past-paper-progress.cjs':'past-paper-progress.js',
  'verify-v5.6d-teacher-past-paper-analytics.cjs':'past-paper-analytics.js',
  'verify-v5.6-stable-release-checkpoint.cjs':'past-paper-assignments.js',
  'verify-v5.7a-cross-device-past-paper-resume.cjs':'past-paper-cross-device.js',
  'verify-v5.7d-past-paper-analytics-actions.cjs':'past-paper-analytics-actions.js',
  'verify-v5.7d1-focus-plan-copy-fallback.cjs':'past-paper-analytics-actions.js',
  'verify-v5.7-stable-release-checkpoint.cjs':'past-paper-cross-device.js'
};
for(const [name,owner] of Object.entries(expectedOwners)){
  assert.ok(read(name).includes(owner),`${name} must verify active owner ${owner}`);
}

const integrity=read('verify-phase4-past-paper-v56-v57-checkpoint1-integrity.cjs');
assert.match(integrity,/for\(const old of oldFiles\) assert\.equal\(pos\(old\),-1/,
  'Checkpoint integrity must assert every retired browser loader is dormant.');

console.log('Phase 4 Past Paper V56/V57 dormant-reference integrity checks passed.');
console.log(`- ${files.length} site/tests .cjs verifier files scanned recursively`);
console.log(`- ${hits.length} retired filename reference(s) found, confined to the two Phase 4 guards`);
console.log('- maintained V5.6/V5.7 verifiers follow the five active consolidated owners');
