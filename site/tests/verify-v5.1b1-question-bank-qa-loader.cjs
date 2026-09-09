const fs = require('fs');
const path = require('path');
const assert = require('assert');

const loader = fs.readFileSync(path.join(__dirname,'..','v40-release.js'),'utf8');
assert(loader.includes("question-bank-selection-qa.js"),'V5.1B1 QA module must be loaded by the stable loader');
assert(loader.includes("data-question-bank-selection-qa"),'V5.1B1 loader key must be present');
console.log('V5.1B1 loader check passed.');
