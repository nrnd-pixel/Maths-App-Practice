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

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith('.cjs') ? [full] : [];
  });
}
function escaped(name){ return name.replace(/\./g,'\\.'); }
function explicitReferenceGuard(file){
  const base=path.basename(file);
  return /^verify-phase4-.*(?:integrity|protected-sha)\.cjs$/.test(base);
}

const files=walk(TEST_ROOT);
const offenders=[];
const allowedHits=[];
for(const file of files){
  const source=fs.readFileSync(file,'utf8');
  const hits=retired.filter(name=>source.includes(name)||source.includes(escaped(name)));
  if(!hits.length) continue;
  if(explicitReferenceGuard(file)) allowedHits.push({file:path.relative(ROOT,file),hits});
  else offenders.push({file:path.relative(ROOT,file),hits});
}
assert.deepEqual(offenders,[],`ordinary maintained verifiers must not reference retired V50 source filenames:\n${JSON.stringify(offenders,null,2)}`);
console.log(`Phase 4 V50 dormant-reference scan passed: ${files.length} site/tests .cjs files scanned recursively; ${allowedHits.length} explicit source/reference/protected-SHA guards contain retired V50 filenames.`);
