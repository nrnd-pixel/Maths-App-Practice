const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const testsRoot=__dirname;
const dormantBrowserFiles=Object.freeze([
  'v42-practice-assignments.js',
  'v43-individual-practice-assignments.js',
  'v43-multi-recipient-practice-assignments.js',
  'v53d1-teacher-practice-pool-alignment.js'
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
  'verify-phase4-teacher-assignments-checkpoint1-integrity.cjs',
  'verify-phase4-teacher-assignments-dormant-reference-integrity.cjs'
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
    console.error(`Unexpected dormant assignment browser-file reference: ${hit.name} -> ${hit.dormant}`);
  }
  assert.fail(`${unexpected.length} verifier reference(s) still treat a retired V42/V43A/V43B/V53D1 browser file as current.`);
}

const actualReferenceFiles=[...new Set(hits.map(hit=>hit.name))].sort();
assert.deepEqual(actualReferenceFiles,[...allowedReferenceFiles].sort(),
  'Retired assignment browser filenames must be confined to the two Phase 4 negative/reference guards.');

const read=name=>fs.readFileSync(path.join(testsRoot,name),'utf8');
const integrity=read('verify-phase4-teacher-assignments-checkpoint1-integrity.cjs');
assert.match(integrity,/assert\.equal\(pos\(retired\),-1/,
  'Checkpoint integrity must assert every old assignment browser loader is dormant.');

// Known downstream verifiers discovered during the exhaustive pre-PR audit must
// follow active consolidated ownership, not the dormant source filenames.
const v51=read('verify-v5.1.cjs');
assert.match(v51,/assignments-teacher\.js/);
const d1=read('verify-v5.3d1-teacher-practice-pool-alignment.cjs');
assert.match(d1,/assignments-core\.js/);
assert.match(d1,/assignments-teacher\.js/);
const d2=read('verify-v5.3d2-practice-recommendation-alignment.cjs');
assert.match(d2,/assignments-core\.js/);
const d3=read('verify-v5.3d3-practice-selection-quality.cjs');
assert.match(d3,/assignments-core\.js/);
const d4=read('verify-v5.3d4-student-recommendation-alignment.cjs');
assert.match(d4,/assignments-core\.js/);

console.log('Phase 4 teacher assignments dormant-reference integrity checks passed.');
console.log(`- ${verifierFiles.length} site/tests .cjs verifier files scanned recursively`);
console.log(`- ${hits.length} retired filename reference(s) found, confined to ${actualReferenceFiles.length} negative/reference guards`);
console.log('- V5.1 and V5.3D1-D4 verification follows active assignments core/teacher ownership');