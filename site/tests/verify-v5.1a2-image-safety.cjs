const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname,'..','..');
const source = fs.readFileSync(path.join(root,'site','paper-import-management.js'),'utf8');
const loader = fs.readFileSync(path.join(root,'site','v40-release.js'),'utf8');

const sandbox = {window:{},console};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'paper-import-management.js'});
const api = sandbox.window.V51BulkQuestionImageSafety;
assert(api,'V5.1A2 image safety API should be exposed');

assert.strictEqual(api.isPersistentHttpsRef('https://cdn.example.com/q.png'),true);
assert.strictEqual(api.isPersistentHttpsRef('HTTP://cdn.example.com/q.png'),false);
assert.strictEqual(api.isPersistentHttpsRef('//cdn.example.com/q.png'),false);
assert.strictEqual(api.isPersistentHttpsRef('data:image/png;base64,abc'),false);
assert.strictEqual(api.isPersistentHttpsRef('blob:https://example.com/id'),false);
assert.strictEqual(api.isPersistentHttpsRef('images/q.png'),false);

for (const ref of [
  'http://cdn.example.com/q.png',
  '//cdn.example.com/q.png',
  'data:image/png;base64,abc',
  'blob:https://example.com/id',
  'ftp://example.com/q.png'
]) assert.strictEqual(api.isNonPersistentRemoteRef(ref),true,`${ref} must be rejected as a persisted question image URL`);

for (const ref of ['https://cdn.example.com/q.png','images/q.png','/images/q.png',''])
  assert.strictEqual(api.isNonPersistentRemoteRef(ref),false,`${ref || 'blank'} should not be flagged by the persistent-URL guard`);

const rows = [
  {_valid:true,_duplicate:false,image_url:'https://cdn.example.com/ok.png'},
  {_valid:true,_duplicate:false,image_url:'images/upload-me.png'},
  {_valid:true,_duplicate:false,image_url:'blob:https://example.com/temp'},
  {_valid:true,_duplicate:false,image_url:'http://cdn.example.com/insecure.png'},
  {_valid:false,_duplicate:false,image_url:'data:image/png;base64,invalid-row'},
  {_valid:true,_duplicate:true,image_url:'//cdn.example.com/duplicate-row.png'}
];
const unsafe = Array.from(api.unsafePersistentRows(rows));
assert.strictEqual(unsafe.length,2,'only ready non-duplicate rows with temporary/non-HTTPS remote refs should be blocked');
assert.strictEqual(unsafe[0].image_url,'blob:https://example.com/temp');
assert.strictEqual(unsafe[1].image_url,'http://cdn.example.com/insecure.png');

assert(source.includes('clearStaleImageSelection'),'preview replacement must clear the previous local file selection');
assert(source.includes("#v51a2-image-files"),'safety guard must track the bulk image file input');
assert(source.includes("#import-btn"),'safety guard must intercept unsafe imports');
assert(source.includes('stopImmediatePropagation'),'unsafe image refs must be blocked before the normal importer runs');
assert(source.includes('MutationObserver'),'guard must stay synchronized when importer UI state changes');
assert(!source.includes('localStorage'));
assert(!source.includes('sessionStorage'));
assert(!/\.from\(\s*['\"]questions['\"]\s*\)/.test(source),'safety module must not write question rows');
assert(loader.includes("paper-import-management.js"),'V5 loader must include the V5.1A2 image safety guard');

console.log('V5.1A2 image safety checks passed.');
console.log('- only permanent HTTPS remote image URLs are accepted for persistence');
console.log('- data/blob/http/protocol-relative remote refs are blocked');
console.log('- relative image filenames remain available for bulk upload');
console.log('- stale local file selections are cleared when preview rows are replaced');
