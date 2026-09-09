const fs = require('fs');
const path = require('path');
const assert = require('assert');

const loader = fs.readFileSync(path.join(__dirname,'..','v40-release.js'),'utf8');
assert(loader.includes("loadScriptOnce('question-bank-selection-qa.js', 'data-question-bank-selection-qa');"),'B1 QA must load before B2A');
assert(loader.includes("loadScriptOnce('question-bank-selection-qa.js', 'data-question-bank-selection-qa');"),'B2A bulk status module must be loaded');
assert(loader.indexOf('question-bank-selection-qa.js') < loader.indexOf('question-bank-selection-qa.js'),'B2A must load after B1 QA');
console.log('V5.1B2A loader wiring checks passed.');
