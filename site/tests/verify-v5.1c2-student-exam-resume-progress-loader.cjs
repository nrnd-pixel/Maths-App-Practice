const fs = require('fs');
const path = require('path');
const assert = require('assert');

const loader = fs.readFileSync(path.join(__dirname,'..','v40-release.js'),'utf8');
const c1 = loader.indexOf("student-exam-ui.js");
const c2 = loader.indexOf("student-exam-ui.js");
const security = loader.indexOf("v50-security-hardening.js?v=50rc2-1");

assert(c1 >= 0,'C1 loader entry missing');
assert(c2 >= 0,'C2 resume/progress loader entry missing');
assert(security >= 0,'security hardening loader entry missing');
assert(c2 > c1,'C2 must load after the C1 paper library it augments');
assert(c2 < security,'C2 must remain inside the staged V5.1 feature layer before V5.0 overlays');
assert(loader.includes("'data-student-exam-ui'"),'C2 must have a unique load-once key');

console.log('V5.1C2 loader wiring checks passed.');
