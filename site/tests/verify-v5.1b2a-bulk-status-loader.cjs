const fs = require('fs');
const path = require('path');
const assert = require('assert');

const loader = fs.readFileSync(path.join(__dirname,'..','v40-release.js'),'utf8');
assert(loader.includes("loadScriptOnce('v51-question-bank-qa.js?v=51b1-1', 'data-v51-question-bank-qa');"),'B1 QA must load before B2A');
assert(loader.includes("loadScriptOnce('v51-question-bank-bulk-status.js?v=51b2a-1', 'data-v51-question-bank-bulk-status');"),'B2A bulk status module must be loaded');
assert(loader.indexOf('v51-question-bank-qa.js') < loader.indexOf('v51-question-bank-bulk-status.js'),'B2A must load after B1 QA');
console.log('V5.1B2A loader wiring checks passed.');
