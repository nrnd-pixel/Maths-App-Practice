const fs=require('fs');
const path=require('path');
const vm=require('vm');

const ownerPath=path.join(__dirname,'..','topical-legacy-student-route.js');
const ownerSource=fs.readFileSync(ownerPath,'utf8');

const MARKERS=Object.freeze({
  publication:'/* V5.2C — Teacher Topical Exercise publication controls.',
  student:'/* V5.2C — Student Topical Practice Library.',
  mount:'/* V5.2C.1 — Student Topical Library mount hotfix.',
  hint:'/* V5.2C — Topical Practice hint bridge.',
  result:'/* V5.2C.2 — Topical Practice result UX polish.'
});

const ORDER=Object.freeze(['publication','student','mount','hint','result']);

function section(name){
  const index=ORDER.indexOf(name);
  if(index<0) throw new Error(`Unknown V52C section: ${name}`);
  const start=ownerSource.indexOf(MARKERS[name]);
  if(start<0) throw new Error(`Missing V52C section marker: ${name}`);
  const nextName=ORDER[index+1];
  const end=nextName ? ownerSource.indexOf(MARKERS[nextName],start+MARKERS[name].length) : ownerSource.length;
  if(end<0) throw new Error(`Missing next V52C section marker after: ${name}`);
  return `${ownerSource.slice(start,end).trimEnd()}\n`;
}

function loadApi(source){
  const sandbox={module:{exports:{}},exports:{},console};
  sandbox.globalThis=sandbox;
  vm.runInNewContext(source,sandbox,{filename:'topical-legacy-student-route-section.js'});
  return sandbox.module.exports;
}

module.exports=Object.freeze({ownerPath,ownerSource,MARKERS,ORDER,section,loadApi});
