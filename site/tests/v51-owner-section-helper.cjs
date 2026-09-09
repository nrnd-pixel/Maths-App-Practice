'use strict';

const fs=require('node:fs');
const path=require('node:path');
const SITE=path.resolve(__dirname,'..');

function section(owner,startMarker,endMarker=null){
  const source=fs.readFileSync(path.join(SITE,owner),'utf8');
  const start=source.indexOf(startMarker);
  if(start<0) throw new Error(`Missing V51 section start marker in ${owner}: ${startMarker}`);
  if(!endMarker) return source.slice(start).replace(/\n+$/,'')+'\n';
  const end=source.indexOf(endMarker,start+startMarker.length);
  if(end<0) throw new Error(`Missing V51 section end marker in ${owner}: ${endMarker}`);
  return source.slice(start,end).replace(/\n+$/,'')+'\n';
}

module.exports=Object.freeze({section});
