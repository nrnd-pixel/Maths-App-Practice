const fs = require('fs');
const path = require('path');
const assert = require('assert');

const loader = fs.readFileSync(path.join(__dirname,'..','v40-release.js'),'utf8');
const b2a = loader.indexOf("question-bank-selection-qa.js");
const b2b = loader.indexOf("question-bank-metadata-review.js");
const b2c = loader.indexOf("question-bank-metadata-review.js");
assert(b2a >= 0,'B2A loader missing');
assert(b2b > b2a,'B2B must load after B2A');
assert(b2c > b2b,'B2C review workflow must load after B2B');
assert(loader.includes("data-question-bank-metadata-review"),'B2C loader data key missing');
console.log('V5.1B2C loader check passed.');
