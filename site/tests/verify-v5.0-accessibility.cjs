const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(siteRoot, name), 'utf8');

const html = read('index.html');
const release = read('v40-release.js');
const polish = read('v50-accessibility-polish.js');

new vm.Script(polish, { filename: 'v50-accessibility-polish.js' });

assert.match(html, /id="question-preview-modal"[^>]*role="dialog"[^>]*aria-modal="true"/);
assert.match(html, /aria-labelledby="preview-title"/);
assert.match(html, /id="close-preview"/);

assert.match(release, /v50-accessibility-polish\.js\?v=50b4a-1/);
assert.match(polish, /event\.key === 'Escape'/);
assert.match(polish, /event\.key !== 'Tab'/);
assert.match(polish, /previousFocus/);
assert.match(polish, /target\.focus\?\./);
assert.match(polish, /document\.body\.style\.overflow = 'hidden'/);
assert.match(polish, /aria-describedby/);
assert.match(polish, /Press Escape to close/);
assert.match(polish, /MutationObserver/);
assert.doesNotMatch(polish, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/);

console.log('V5 accessibility verification passed.');
console.log('- Question Preview keeps dialog semantics');
console.log('- Escape close, Tab trapping and focus restoration are protected');
console.log('- Accessibility polish remains presentation/interaction only');
