const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const repoRoot = path.join(__dirname, '..', '..');
const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
const changelog = fs.readFileSync(changelogPath, 'utf8');

const indexStart = changelog.indexOf('## Consolidated source-file index');
assert.notStrictEqual(indexStart, -1, 'CHANGELOG.md must contain the consolidated source-file index');
const indexEnd = changelog.indexOf('\n---', indexStart);
assert.notStrictEqual(indexEnd, -1, 'CHANGELOG.md source-file index must end before the archival note');

const indexSection = changelog.slice(indexStart, indexEnd);
const deletedPaths = [...indexSection.matchAll(/^- `([^`]+)`/gm)].map(match => match[1]);
assert.strictEqual(deletedPaths.length, 41, 'Phase 3 changelog must enumerate exactly 41 consolidated/deleted records');

function listCjsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listCjsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.cjs')) files.push(full);
  }
  return files;
}

const verifierFiles = listCjsFiles(__dirname);
const stale = [];
for (const file of verifierFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const deletedPath of deletedPaths) {
    const basename = path.basename(deletedPath);
    if (source.includes(deletedPath) || source.includes(basename)) {
      stale.push({
        verifier: path.relative(repoRoot, file).split(path.sep).join('/'),
        deletedPath,
      });
    }
  }
}

if (stale.length) {
  for (const hit of stale) {
    console.error(`Stale Phase 3 document reference: ${hit.verifier} -> ${hit.deletedPath}`);
  }
  assert.fail(`${stale.length} stale reference(s) to Phase 3 deleted documents remain in site/tests/*.cjs`);
}

console.log('Phase 3 deleted-document reference integrity checks passed.');
console.log(`- ${deletedPaths.length} consolidated/deleted document paths checked`);
console.log(`- ${verifierFiles.length} site/tests .cjs files scanned recursively`);
console.log('- no verifier directly references a deleted Phase 3 document filename');
