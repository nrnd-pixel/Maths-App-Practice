const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname,'..','..');
const source = fs.readFileSync(path.join(root,'site','v51-bulk-question-image-cleanup.js'),'utf8');
const loader = fs.readFileSync(path.join(root,'site','v40-release.js'),'utf8');

const sandbox = {window:{},console};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'v51-bulk-question-image-cleanup.js'});
const api = sandbox.window.V51BulkQuestionImageCleanup;
assert(api,'V5.1A2 cleanup API should be exposed');

const paths = api.uncommittedPaths([
  {_v51a2_storage_path:'v51-imports/2026/paper-2/batch-a.png'},
  {_v51a2_storage_path:'v51-imports/2026/paper-2/batch-a.png'},
  {_v51a2_storage_path:'v51-imports/2026/paper-2/batch-b.png'},
  {_v51a2_storage_path:''},
  {}
]);
assert.strictEqual(paths.length,2,'cleanup paths should be unique');
assert(paths.includes('v51-imports/2026/paper-2/batch-a.png'));
assert(paths.includes('v51-imports/2026/paper-2/batch-b.png'));

assert(source.includes("storage.from(ctx.bucket).remove(paths)"),'abandoned batch cleanup must remove only recorded Storage paths');
assert(source.includes("#clear-import"),'cleanup must guard Clear Preview');
assert(source.includes("#preview-csv"),'cleanup must prevent replacing a preview with uncommitted uploaded images');
assert(source.includes('stopImmediatePropagation'),'cleanup guard must intercept unsafe preview actions');
assert(!/\.from\(\s*['\"]questions['\"]\s*\)/.test(source),'cleanup module must not write question rows');
assert(!source.includes('localStorage'));
assert(!source.includes('sessionStorage'));
assert(!source.includes('fetch('));
assert(loader.includes('v51-bulk-question-image-cleanup.js'),'V5 loader must include abandoned-batch cleanup guard');

console.log('V5.1A2 abandoned bulk image cleanup checks passed.');
