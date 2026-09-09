'use strict';

const fs=require('node:fs');
const path=require('node:path');
const SITE=path.resolve(__dirname,'..');

const segments=Object.freeze({
  A1:['paper-import-management.js',0],
  A2_UPLOAD:['paper-import-management.js',1],
  A2_CLEANUP:['paper-import-management.js',2],
  A2_SAFETY:['paper-import-management.js',3],
  A4_PREVIEW:['paper-import-management.js',4],
  A4_STATUS:['paper-import-management.js',5],
  A5:['paper-import-management.js',6],
  A6:['paper-import-management.js',7],
  B1:['question-bank-selection-qa.js',0],
  B2A:['question-bank-selection-qa.js',1],
  B2B:['question-bank-metadata-review.js',0],
  B2C:['question-bank-metadata-review.js',1],
  B2D:['question-bank-audit-multipart.js',0],
  B2E:['question-bank-audit-multipart.js',1],
  C1:['student-exam-ui.js',0],
  C2:['student-exam-ui.js',1]
});

function ownerChunks(owner){
  const source=fs.readFileSync(path.join(SITE,owner),'utf8');
  const starts=[];
  const re=/^\/\* V5\.1/gm;
  let match;
  while((match=re.exec(source))) starts.push(match.index);
  return starts.map((start,index)=>source.slice(start,starts[index+1]??source.length).replace(/\n+$/,'')+'\n');
}

function segment(key){
  const spec=segments[key];
  if(!spec) throw new Error(`Unknown V51 Phase 4 segment: ${key}`);
  const [owner,index]=spec;
  const chunks=ownerChunks(owner);
  if(!chunks[index]) throw new Error(`${owner} does not contain V51 segment ${key} at index ${index}`);
  return chunks[index];
}

module.exports=Object.freeze({segments,segment,ownerChunks});
