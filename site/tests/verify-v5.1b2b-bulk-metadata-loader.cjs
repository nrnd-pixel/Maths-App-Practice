const fs = require('fs');
const path = require('path');
const assert = require('assert');

const loader = fs.readFileSync(path.join(__dirname,'..','v40-release.js'),'utf8');
const b2a = loader.indexOf("question-bank-selection-qa.js");
const b2b = loader.indexOf("question-bank-metadata-review.js");
assert(b2a >= 0,'B2A loader reference must remain present');
assert(b2b >= 0,'B2B loader reference must be present');
assert(b2b > b2a,'B2B must load after B2A so it can reuse the selection controls');
assert(loader.includes("data-question-bank-metadata-review"),'B2B loader data key must be stable');
console.log('V5.1B2B loader check passed.');
