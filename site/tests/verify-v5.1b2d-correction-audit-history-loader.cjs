'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const loader = fs.readFileSync(path.resolve(__dirname,'..','v40-release.js'),'utf8');
const review = "loadScriptOnce('question-bank-metadata-review.js', 'data-question-bank-metadata-review');";
const history = "loadScriptOnce('question-bank-audit-multipart.js', 'data-question-bank-audit-multipart');";

assert(loader.includes(history),'V5.1B2D history module must be loaded');
assert(loader.indexOf(review) >= 0,'V5.1B2C review module must remain loaded');
assert(loader.indexOf(history) > loader.indexOf(review),'B2D history must load after B2C review workflow');

console.log('V5.1B2D correction audit history loader — PASS');
