const fs=require('fs');
const path=require('path');
const assert=require('assert');
const loader=fs.readFileSync(path.resolve(__dirname,'../v40-release.js'),'utf8');
const b2d="loadScriptOnce('v51-question-change-history.js?v=51b2d-1', 'data-v51-question-change-history');";
const b2e="loadScriptOnce('v51-multipart-question-management.js?v=51b2e-1', 'data-v51-multipart-question-management');";
assert(loader.includes(b2e),'V5.1B2E loader line must be present');
assert(loader.indexOf(b2d)>=0 && loader.indexOf(b2e)>loader.indexOf(b2d),'B2E must load after B2D audit history');
console.log('V5.1B2E loader wiring — PASS');
