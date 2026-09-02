const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(site, 'science-subject-home.js'), 'utf8');
const config = fs.readFileSync(path.join(site, 'config.js'), 'utf8');
const scienceHtml = fs.readFileSync(path.join(site, 'science', 'index.html'), 'utf8');

new vm.Script(source, { filename:'science-subject-home.js' });

for (const phrase of [
  "host.startsWith('deploy-preview-')",
  "host.endsWith('--magical-pixie-a61111.netlify.app')",
  "const STORAGE_KEY = 'mathStudentSessionV40'",
  "name:'Mathematics'",
  "name:'Science'",
  "action:'Continue Practice'",
  "action:'Continue Learning'",
  "location.assign('/science/')",
  'Science is available only in this development preview.'
]) assert(source.includes(phrase), `Subject home is missing: ${phrase}`);

assert.doesNotMatch(source, /position\s*:\s*fixed/i,
  'The old floating Science launcher must not return.');
assert.doesNotMatch(source, /setInterval\s*\(/,
  'The native subject home should react to session state without polling.');
assert.match(config, /\.\/v56c-student-past-paper-progress\.js'[\s\S]*\.\/science-subject-home\.js'/,
  'The preview subject home must load after the complete Maths release stack.');
assert.doesNotMatch(config, /science-preview-launcher/,
  'The temporary floating launcher must not remain wired.');
assert.match(scienceHtml, /class="subject-switcher" href="\/"[^>]*>← All subjects<\/a>/,
  'Science must provide a native same-tab route back to the subject home.');

console.log('Science V0.1 shared subject home checks passed.');
console.log('- preview-host isolation retained');
console.log('- signed-in Mathematics / Science selector present');
console.log('- floating launcher removed and same-tab switching preserved');
