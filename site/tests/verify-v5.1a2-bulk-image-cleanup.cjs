const {section}=require('./v51-owner-section-helper.cjs');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname,'..','..');
const source = section('paper-import-management.js','/* V5.1A2 — cleanup guard for uncommitted bulk image uploads.','/* V5.1A2 — persistent image-reference and stale-selection safety guard.');
const loader = fs.readFileSync(path.join(root,'site','v40-release.js'),'utf8');

const sandbox = {window:{},console};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'paper-import-management.js'});
const api = sandbox.window.V51BulkQuestionImageCleanup;
assert(api,'V5.1A2 cleanup API should be exposed');

const rows = [
  {_v51a2_storage_path:'v51-imports/2026/paper-2/batch-a.png',image_url:'https://cdn.example.com/batch-a.png'},
  {_v51a2_storage_path:'v51-imports/2026/paper-2/batch-a.png',image_url:'https://cdn.example.com/batch-a.png'},
  {_v51a2_storage_path:'v51-imports/2026/paper-2/batch-b.png',image_url:'https://cdn.example.com/batch-b.png'},
  {_v51a2_storage_path:'',image_url:'https://cdn.example.com/blank.png'},
  {}
];

let paths = api.uncommittedPaths(rows,[]);
assert.strictEqual(paths.length,2,'cleanup paths should be unique');
assert(paths.includes('v51-imports/2026/paper-2/batch-a.png'));
assert(paths.includes('v51-imports/2026/paper-2/batch-b.png'));

// If an earlier import batch committed a row before a later batch failed,
// never delete the Storage object now referenced by that committed question.
paths = Array.from(api.uncommittedPaths(rows,[{image_url:'https://cdn.example.com/batch-a.png'}]));
assert.deepStrictEqual(paths,['v51-imports/2026/paper-2/batch-b.png'],
  'cleanup must preserve uploaded files already referenced by committed question rows');

// Shared/multipart image paths are protected as a whole when any committed row references the URL.
const sharedRows = [
  {_v51a2_storage_path:'v51-imports/2026/paper-2/shared.png',image_url:'https://cdn.example.com/shared.png'},
  {_v51a2_storage_path:'v51-imports/2026/paper-2/shared.png',image_url:'https://cdn.example.com/shared.png'}
];
assert.deepStrictEqual(Array.from(api.uncommittedPaths(sharedRows,[{image_url:'https://cdn.example.com/shared.png'}])),[]);

assert(source.includes('committedImageUrls'),'cleanup must distinguish committed image references from abandoned uploads');
assert(source.includes("storage.from(ctx.bucket).remove(paths)"),'abandoned batch cleanup must remove only recorded Storage paths');
assert(source.includes("#clear-import"),'cleanup must guard Clear Preview');
assert(source.includes("#preview-csv"),'cleanup must prevent replacing a preview with uncommitted uploaded images');
assert(source.includes('stopImmediatePropagation'),'cleanup guard must intercept unsafe preview actions');
assert(!/\.from\(\s*['\"]questions['\"]\s*\)/.test(source),'cleanup module must not write question rows');
assert(!source.includes('localStorage'));
assert(!source.includes('sessionStorage'));
assert(!source.includes('fetch('));
assert(loader.includes('paper-import-management.js'),'V5 loader must include abandoned-batch cleanup guard');

console.log('V5.1A2 abandoned bulk image cleanup checks passed.');
console.log('- duplicate uploaded paths are deduplicated');
console.log('- files already referenced by committed questions are protected');
console.log('- shared/multipart image paths are preserved after partial import success');
