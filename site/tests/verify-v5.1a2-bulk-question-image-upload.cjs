const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname,'..','..');
const sourcePath = path.join(root,'site','v51-bulk-question-image-upload.js');
const loaderPath = path.join(root,'site','v40-release.js');
const source = fs.readFileSync(sourcePath,'utf8');
const loader = fs.readFileSync(loaderPath,'utf8');

const sandbox = {window:{},console};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'v51-bulk-question-image-upload.js'});
const api = sandbox.window.V51BulkQuestionImageUpload;
assert(api,'V51 bulk image upload API should be exposed');

assert.strictEqual(api.isRemoteImageRef('https://example.com/x.png'),true);
assert.strictEqual(api.isRemoteImageRef('//cdn.example.com/x.png'),true);
assert.strictEqual(api.isRemoteImageRef('data:image/png;base64,abc'),true);
assert.strictEqual(api.isRemoteImageRef('images/x.png'),false);
assert.strictEqual(api.isRemoteImageRef('/images/x.png'),false);
assert.strictEqual(api.fileNameFromRef('images/foo%20bar.png?v=1#part'),'foo bar.png');

const rows = [
  {_valid:true,_duplicate:false,image_url:'images/2026_P2_Q14.png',exam_year:2026,paper:'Paper 2'},
  {_valid:true,_duplicate:false,image_url:'images/2026_P2_Q14.png',exam_year:2026,paper:'Paper 2'},
  {_valid:true,_duplicate:false,image_url:'https://cdn.example.com/ready.png',exam_year:2026,paper:'Paper 2'},
  {_valid:false,_duplicate:false,image_url:'images/invalid-row.png'},
  {_valid:true,_duplicate:true,image_url:'images/duplicate-row.png'}
];
const files = [
  {name:'2026_p2_q14.PNG',type:'image/png',size:1024},
  {name:'orphan.webp',type:'image/webp',size:2048}
];
const report = api.buildMatchReport(rows,files);
assert.strictEqual(report.requiredCount,1,'multipart/shared refs should require one unique image');
assert.strictEqual(report.remoteReferences,1,'hosted URLs should not require upload');
assert.strictEqual(report.matchedCount,1,'case-insensitive filename match should work');
assert.strictEqual(report.missing.length,0);
assert.strictEqual(report.orphanFiles.length,1);
assert.strictEqual(report.orphanFiles[0],'orphan.webp');
assert.strictEqual(report.readyToUpload,true,'orphan files should be advisory, not blocking');

const missing = api.buildMatchReport([
  {_valid:true,_duplicate:false,image_url:'images/a.png'},
  {_valid:true,_duplicate:false,image_url:'images/b.png'}
],[{name:'a.png',type:'image/png',size:100}]);
assert.strictEqual(missing.requiredCount,2);
assert.strictEqual(missing.missing.length,1);
assert.strictEqual(missing.missing[0],'b.png');
assert.strictEqual(missing.readyToUpload,false);

const duplicateSelection = api.buildMatchReport([
  {_valid:true,_duplicate:false,image_url:'images/a.png'}
],[
  {name:'a.png',type:'image/png',size:100},
  {name:'A.PNG',type:'image/png',size:100}
]);
assert.strictEqual(duplicateSelection.duplicateFileNames.length,1,'duplicate selected names must be blocked');
assert.strictEqual(duplicateSelection.readyToUpload,false);

const invalidFiles = api.buildMatchReport([
  {_valid:true,_duplicate:false,image_url:'images/a.png'},
  {_valid:true,_duplicate:false,image_url:'images/b.png'}
],[
  {name:'a.png',type:'image/gif',size:100},
  {name:'b.png',type:'image/png',size:api.MAX_IMAGE_BYTES+1}
]);
assert.strictEqual(invalidFiles.invalidMatches.length,2,'unsupported and oversized matched files must be flagged');
assert.strictEqual(invalidFiles.readyToUpload,false);

const hostedOnly = api.buildMatchReport([
  {_valid:true,_duplicate:false,image_url:'https://example.com/a.png'},
  {_valid:true,_duplicate:false,image_url:''}
],[]);
assert.strictEqual(hostedOnly.requiredCount,0);
assert.strictEqual(hostedOnly.requiresUpload,false);

assert(source.includes('multiple accept="image/png,image/jpeg,image/webp'), 'UI must allow multiple supported image files');
assert(source.includes("storage.from(ctx.bucket).upload"), 'A2 must upload through existing Supabase Storage client');
assert(source.includes('getPublicUrl'), 'A2 must rewrite ready rows to public Storage URLs');
assert(source.includes('stopImmediatePropagation'), 'A2 must guard the normal import action while local images remain');
assert(source.includes('readyImportRows(rows)'), 'A2 must scope required images to ready import rows');
assert(!/\.from\(\s*['\"]questions['\"]\s*\)/.test(source), 'A2 module must not write question rows directly');
assert(!source.includes('localStorage'), 'A2 must not persist import/image state in localStorage');
assert(!source.includes('sessionStorage'), 'A2 must not persist import/image state in sessionStorage');
assert(!source.includes('fetch('), 'A2 must use the established Supabase client rather than direct fetch');
assert(loader.includes('v51-bulk-question-image-upload.js'), 'V5 loader must include the A2 module');

console.log('V5.1A2 bulk question image upload checks passed.');
