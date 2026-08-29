const fs = require('fs');
const path = require('path');
const assert = require('assert');

const loader = fs.readFileSync(path.join(__dirname,'..','v40-release.js'),'utf8');
const b2e = loader.indexOf("v51-multipart-question-management.js?v=51b2e-1");
const b3 = loader.indexOf("v51-exam-publication-safety.js?v=51b3-1");
const security = loader.indexOf("v50-security-hardening.js?v=50rc2-1");
assert(b2e >= 0,'B2E loader entry missing');
assert(b3 >= 0,'B3 loader entry missing');
assert(security >= 0,'security hardening loader entry missing');
assert(b3 > b2e,'B3 must load after B2E');
assert(b3 < security,'B3 must load before V5.0 security/polish overlays');
console.log('V5.1B3 loader wiring checks passed.');
