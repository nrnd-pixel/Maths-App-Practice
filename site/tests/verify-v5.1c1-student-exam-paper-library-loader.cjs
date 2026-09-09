const fs = require('fs');
const path = require('path');
const assert = require('assert');

const loader = fs.readFileSync(path.join(__dirname,'..','v40-release.js'),'utf8');
const b3Ui = loader.indexOf("v51-exam-publication-ui-polish.js?v=51b3-ui-3");
const c1 = loader.indexOf("student-exam-ui.js");
const security = loader.indexOf("v50-security-hardening.js?v=50rc2-1");

assert(b3Ui >= 0,'B3 UI loader entry missing');
assert(c1 >= 0,'C1 student exam paper library loader entry missing');
assert(security >= 0,'security hardening loader entry missing');
assert(c1 > b3Ui,'C1 must load after the completed B3 publication-safety layer');
assert(c1 < security,'C1 must remain inside the staged V5.1 feature layer before V5.0 overlays');
assert(loader.includes("'data-student-exam-ui'"),'C1 must have a unique load-once key');

console.log('V5.1C1 loader wiring checks passed.');
