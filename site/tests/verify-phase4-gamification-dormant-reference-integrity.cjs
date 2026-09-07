const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const testsRoot=__dirname;

const dormantBrowserFiles=Object.freeze([
  'v573-class-challenges-teacher-gamification.js',
  'v574-gamification-polish-teacher-controls.js'
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

const verifierFiles=listCjsFiles(testsRoot);
const readVerifier=name=>fs.readFileSync(path.join(testsRoot,name),'utf8');

// Scan every verifier, not only the gamification-named files. After Checkpoint 2,
// references to the retired browser filenames are allowed only in the small set of
// guards that explicitly prove those files are dormant or compare against their
// historical source as rollback/reference material.
const allowedReferenceFiles=new Set([
  'verify-phase4-gamification-dormant-reference-integrity.cjs',
  'verify-phase4-gamification-checkpoint2-integrity.cjs',
  'verify-v5.7.3-class-challenges-teacher-gamification.cjs',
  'verify-v5.7.4-gamification-polish-teacher-controls.cjs',
  'verify-v5.7.5-gamification-stable-checkpoint.cjs'
]);

const hits=[];
const unexpected=[];
for(const file of verifierFiles){
  const source=fs.readFileSync(file,'utf8');
  const name=path.basename(file);
  for(const dormant of dormantBrowserFiles){
    if(!source.includes(dormant)) continue;
    hits.push({name,dormant});
    if(!allowedReferenceFiles.has(name)) unexpected.push({name,dormant});
  }
}

if(unexpected.length){
  for(const hit of unexpected){
    console.error(`Unexpected dormant gamification browser-file reference: ${hit.name} -> ${hit.dormant}`);
  }
  assert.fail(`${unexpected.length} verifier reference(s) still mention a dormant V573/V574 browser file outside the approved integrity guards.`);
}

const actualReferenceFiles=[...new Set(hits.map(hit=>hit.name))].sort();
assert.deepEqual(
  actualReferenceFiles,
  [...allowedReferenceFiles].sort(),
  'Dormant V573/V574 browser filename references must be confined to the audited negative/reference-only verifier set.'
);

// Check the semantics of every allowed reference holder, so a future edit cannot
// silently turn one of these historical/negative references back into a positive
// active-loader assumption.
const checkpoint2=readVerifier('verify-phase4-gamification-checkpoint2-integrity.cjs');
assert.match(checkpoint2,/position\(retired\),-1/,
  'Checkpoint 2 integrity must assert retired gamification files are absent from the staged list.');
assert.match(checkpoint2,/Dormant originals stay available as rollback\/reference files/,
  'Checkpoint 2 may read dormant V573/V574 source only as rollback/reference material.');

const v573=readVerifier('verify-v5.7.3-class-challenges-teacher-gamification.cjs');
assert.match(v573,/assert\.doesNotMatch\(config/,
  'V5.7.3 verifier must assert the old V573 browser file is not staged.');
assert.match(v573,/dormant V573 browser file is no longer staged/,
  'V5.7.3 verifier must describe the old browser source as dormant.');
assert.doesNotMatch(v573,/read\(['"]v573-class-challenges-teacher-gamification\.js['"]\)|readFileSync\([^\n]*v573-class-challenges-teacher-gamification\.js/,
  'V5.7.3 behavior must be verified from the consolidated modules, not the dormant browser source.');

const v574=readVerifier('verify-v5.7.4-gamification-polish-teacher-controls.cjs');
assert.match(v574,/V573 browser patch file must be dormant/,
  'V5.7.4 verifier must assert V573 is dormant.');
assert.match(v574,/V574 browser patch file must be dormant/,
  'V5.7.4 verifier must assert V574 is dormant.');
assert.match(v574,/assert\(!config\.includes/,
  'V5.7.4 verifier must use negative loader checks for the dormant browser files.');
assert.doesNotMatch(v574,/readFileSync\([^\n]*(?:v573-class-challenges-teacher-gamification|v574-gamification-polish-teacher-controls)\.js/,
  'V5.7.4 behavior must be verified from the consolidated modules, not dormant browser sources.');

const v575=readVerifier('verify-v5.7.5-gamification-stable-checkpoint.cjs');
assert.match(v575,/for \(const retiredLoader of \[/);
assert.match(v575,/assert\(!config\.includes\(retiredLoader\)/,
  'V5.7.5 verifier may name V573/V574 only inside its retired-loader absence guard.');
assert.doesNotMatch(v575,/read\(['"](?:v573-class-challenges-teacher-gamification|v574-gamification-polish-teacher-controls)\.js['"]\)/,
  'V5.7.5 must validate the consolidated modules rather than reading dormant V573/V574 browser files.');

// The exhaustive source review found one later verifier that still treated dormant
// V573 as the owner of the Class Motivation trigger. Keep a direct regression guard
// so ownership remains on the consolidated core/teacher modules.
const v58b=readVerifier('verify-v5.8b-teacher-workspace-consolidation.cjs');
for(const dormant of dormantBrowserFiles){
  assert.ok(!v58b.includes(dormant),`V5.8B verifier must not read dormant browser owner: ${dormant}`);
}
assert.match(v58b,/gamification-core\.js/);
assert.match(v58b,/gamification-teacher\.js/);
assert.match(v58b,/teacherTrigger:'v573-open-class-motivation'/);
assert.match(v58b,/button\.id=IDS\.teacherTrigger/);

console.log('Phase 4 gamification dormant-reference integrity checks passed.');
console.log(`- ${verifierFiles.length} site/tests .cjs verifier files scanned recursively`);
console.log(`- ${hits.length} exact dormant V573/V574 filename reference(s) found, all confined to ${actualReferenceFiles.length} negative/reference-only guards`);
console.log('- V5.8B Class Motivation verification now follows gamification-core.js + gamification-teacher.js ownership');