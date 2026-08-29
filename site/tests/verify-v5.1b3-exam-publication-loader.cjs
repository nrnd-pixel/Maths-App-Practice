const fs = require('fs');
const path = require('path');
const assert = require('assert');

const loader = fs.readFileSync(path.join(__dirname,'..','v40-release.js'),'utf8');
const b2e = "loadScriptOnce('v51-multipart-question-management.js?v=51b2e-1', 'data-v51-multipart-question-management');";
const b3 = "loadScriptOnce('v51-exam-publication-safety.js?v=51b3-1', 'data-v51-exam-publication-safety');";

assert(loader.includes(b2e),'B2E loader line must remain present');
assert(loader.includes(b3),'B3 publication safety loader line must be present');
assert(loader.indexOf(b3) > loader.indexOf(b2e),'B3 must load after B2E');

console.log('V5.1B3 loader wiring checks passed.');
