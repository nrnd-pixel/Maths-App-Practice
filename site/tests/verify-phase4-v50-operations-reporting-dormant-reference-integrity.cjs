'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
const TEST_ROOT=path.join(ROOT,'site','tests');

const retired=Object.freeze([
  'v50-teacher-class-report.js',
  'v50-teacher-student-report.js',
  'v50-reporting-export.js',
  'v50-report-archive.js',
  'v50-student-launch-readiness.js',
  'v50-teacher-operations.js',
  'v50-roster-edit.js',
  'v50-production-polish.js',
  'v50-release-audit.js',
  'v50-rc2-empty-result-code-polish.js',
  'v50-release-audit-rc3.js'
]);

// Only these checkpoint guards may name the dormant historical sources. Ordinary
// maintained verifiers must target the new active owners instead. This is an
// explicit allowlist so adding another phase4 verifier cannot silently bypass the scan.
const explicitReferenceGuards=new Set([
  'verify-phase4-v50-operations-reporting-dormant-reference-integrity.cjs',
  'verify-phase4-v50-operations-reporting-integrity.cjs',
  'verify-phase4-v50-operations-reporting-protected-sha.cjs'
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

assert.deepEqual(offenders,[],`ordinary maintained verifiers must not reference retired V50 source filenames:\n${JSON.stringify(offenders,null,2)}`);
for(const required of explicitReferenceGuards){
  assert.ok(allowedHits.some(row=>path.basename(row.file)===required),`${required} must remain an explicit historical-source/reference guard`);
}
console.log(`Phase 4 V50 dormant-reference scan passed: ${files.length} site/tests .cjs files scanned recursively; ${allowedHits.length} explicit source/reference/protected-SHA guards contain retired V50 filenames.`);
