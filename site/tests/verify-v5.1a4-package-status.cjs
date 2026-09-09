const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname,'..','..');
const sourcePath = path.join(root,'site','paper-import-management.js');
const loaderPath = path.join(root,'site','v40-release.js');
const source = fs.readFileSync(sourcePath,'utf8');
const loader = fs.readFileSync(loaderPath,'utf8');

const sandbox = {window:{},console};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'paper-import-management.js'});
const api = sandbox.window.V51PaperPackagePreviewStatus;
assert(api,'A4 package status API should be exposed');

assert.strictEqual(
  api.statusLabel({ready:true,readyRows:0,invalidRows:0}),
  '✅ Package validated — already fully imported',
  'fully validated packages with no ready rows should be described as already imported'
);
assert.strictEqual(
  api.statusLabel({ready:true,readyRows:13,invalidRows:0}),
  '✅ Package ready for staged import',
  'packages with new ready rows should remain staged-import ready'
);
assert.strictEqual(
  api.statusLabel({ready:false,readyRows:0,invalidRows:1}),
  '⚠ Package needs attention'
);

const fullyImported = api.reportCounts('CSV: 34 rows · 0 ready · 34 duplicates skipped · 0 need attention');
assert.strictEqual(fullyImported.readyRows,0);
assert.strictEqual(fullyImported.invalidRows,0);

const stagedImport = api.reportCounts('CSV: 34 rows · 13 ready · 21 duplicates skipped · 0 need attention');
assert.strictEqual(stagedImport.readyRows,13);
assert.strictEqual(stagedImport.invalidRows,0);

assert(loader.includes('paper-import-management.js'), 'V5 loader must include the A4 status polish');
assert(source.includes('if (headline.textContent !== nextLabel) headline.textContent = nextLabel;'), 'status observer must not rewrite an unchanged headline and trigger itself repeatedly');
assert(!/storage\.from|\.from\(\s*['\"]questions['\"]\s*\)|localStorage|sessionStorage/.test(source), 'status polish must remain presentation-only');

console.log('V5.1A4 package status wording checks passed.');
