'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const SITE = path.join(ROOT, 'site');
const mapPath = path.join(__dirname, 'tier2-authority-map.json');
const loaderManifestPath = path.join(ROOT, 'tooling', 'phase7b', 'loader-manifest.json');

const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const loaderManifest = JSON.parse(fs.readFileSync(loaderManifestPath, 'utf8'));
const tier2 = loaderManifest.tiers.find(row => row.source === 'site/v40-release.js');

const gitBlob = pathname => execFileSync('git', ['hash-object', pathname], {
  cwd: ROOT,
  encoding: 'utf8'
}).trim();

const normalize = src => String(src || '').replace(/^\.\//, '').split('?')[0];

assert.equal(map.schemaVersion, 1);
assert.equal(map.loaderOwner, 'site/v40-release.js');
assert.equal(map.loaderBlob, 'cca15dc8a181b9bc0d47d174f53dbd689e5a4c80');
assert.equal(gitBlob(map.loaderOwner), map.loaderBlob, 'frozen tier-2 loader owner changed');
assert.ok(tier2, 'Phase 7B loader manifest must retain the tier-2 owner');
assert.equal(tier2.entries.length, 41, 'tier-2 loader must remain exactly 41 entries');
assert.equal(map.entries.length, 41, 'authority map must cover all 41 tier-2 entries');

const allowedClasses = new Set(map.primaryClasses);
const expectedFiles = tier2.entries.map(row => normalize(row.src));
const mappedFiles = map.entries.map(row => row.file);
assert.deepEqual(mappedFiles, expectedFiles, 'authority map order must exactly match the production tier-2 loader');

const byFile = new Map(map.entries.map(row => [row.file, row]));
assert.equal(byFile.size, 41, 'authority map filenames must be unique');

for (let i = 0; i < map.entries.length; i += 1) {
  const row = map.entries[i];
  assert.equal(row.index, i + 1, `${row.file}: index/order drift`);
  assert.ok(allowedClasses.has(row.primaryClass), `${row.file}: unknown primary class`);
  assert.match(row.gitBlob, /^[0-9a-f]{40}$/, `${row.file}: invalid git blob`);
  assert.equal(gitBlob(`site/${row.file}`), row.gitBlob, `${row.file}: source bytes drifted from mapped checkpoint`);
  assert.ok(Array.isArray(row.traits) && row.traits.length > 0, `${row.file}: traits required`);
  assert.ok(Array.isArray(row.requiresEarlier), `${row.file}: requiresEarlier must be an array`);
  assert.ok(Array.isArray(row.externalPredecessors), `${row.file}: externalPredecessors must be an array`);
  assert.ok(String(row.reason || '').length >= 20, `${row.file}: mapping rationale required`);

  for (const predecessor of row.requiresEarlier) {
    const predecessorRow = byFile.get(predecessor);
    assert.ok(predecessorRow, `${row.file}: unknown predecessor ${predecessor}`);
    assert.ok(predecessorRow.index < row.index, `${row.file}: predecessor ${predecessor} must load earlier`);
  }

  const source = fs.readFileSync(path.join(SITE, row.file), 'utf8');
  const directNetwork = /\bcloud\s*\.\s*(?:rpc|from)\s*\(/.test(source);
  const storage = /\b(?:localStorage|sessionStorage)\b/.test(source);
  const wrapperAssignment = /(?:cloud\.rpc\s*=|renderQuestions\s*=|finishPractice\s*=|startPractice\s*=|loadExamSettingsEditor\s*=|saveExamSetting\s*=|refreshStudentAssignmentAccess\s*=|questionValidationErrors\s*=|questionFingerprint\s*=|multipartImportErrors\s*=|gradeAnswer\s*=)/.test(source);

  if (directNetwork) {
    assert.ok(
      row.primaryClass === 'network_data_authority' || row.primaryClass === 'frozen_or_wrapper_authority',
      `${row.file}: direct network/data access must be classified as authority`
    );
    assert.ok(row.traits.some(value => value === 'network-read' || value === 'network-write'), `${row.file}: direct network access must be represented in traits`);
  }

  if (storage) {
    assert.ok(
      row.primaryClass === 'storage_session_authority' || row.primaryClass === 'frozen_or_wrapper_authority',
      `${row.file}: storage/session access must be classified as authority`
    );
  }

  if (row.primaryClass === 'read_only_low_risk_leaf') {
    assert.equal(directNetwork, false, `${row.file}: low-risk leaf must not directly access cloud data`);
    assert.equal(storage, false, `${row.file}: low-risk leaf must not access browser storage/session state`);
    assert.equal(wrapperAssignment, false, `${row.file}: low-risk leaf must not replace authority globals`);
    assert.ok(row.traits.includes('read-only'), `${row.file}: low-risk leaf must be explicitly read-only`);
  }
}

const classCounts = Object.fromEntries([...allowedClasses].map(key => [
  key,
  map.entries.filter(row => row.primaryClass === key).length
]));
assert.deepEqual(classCounts, {
  frozen_or_wrapper_authority: 9,
  network_data_authority: 20,
  storage_session_authority: 1,
  presentation_event_owner: 3,
  read_only_low_risk_leaf: 7,
  compatibility_checkpoint: 1
}, 'Phase 7D-B primary class distribution drift');

const requires = (file, predecessors) => {
  const row = byFile.get(file);
  assert.ok(row, `missing mapped row: ${file}`);
  for (const predecessor of predecessors) {
    assert.ok(row.requiresEarlier.includes(predecessor), `${file}: missing predecessor ${predecessor}`);
  }
};

requires('assignments-student.js', ['assignments-core.js']);
requires('assignments-teacher.js', ['assignments-core.js']);
requires('assignment-interventions.js', ['v42-teacher-action-center.js', 'assignments-teacher.js']);
requires('v45-intervention-queue.js', ['assignment-interventions.js']);
requires('v50-student-progress-overview.js', ['assignment-deadlines.js', 'v49-student-topic-progress.js']);
requires('teacher-launch-operations.js', ['teacher-reporting.js']);
requires('question-bank-selection-qa.js', ['paper-import-management.js']);
requires('question-bank-metadata-review.js', ['question-bank-selection-qa.js']);
requires('v51-exam-publication-ui-polish.js', ['v51-exam-publication-safety.js']);
requires('v50-security-hardening.js', ['student-exam-ui.js']);
requires('v52b1-question-bank-performance.js', [
  'question-bank-selection-qa.js',
  'v52-topical-activation-guard.js',
  'question-bank-metadata-review.js',
  'v52-teacher-topical-library.js',
  'question-bank-audit-multipart.js'
]);
requires('topical-legacy-student-route.js', ['v52-teacher-topical-library.js', 'v52b1-question-bank-performance.js']);
requires('practice-selection-engine.js', ['assignments-core.js']);
requires('practice-ui-resource-clarity.js', ['topical-legacy-student-route.js', 'practice-eligibility-ui.js', 'practice-selection-engine.js']);
requires('resource-bank-ui.js', ['question-bank-selection-qa.js', 'v52b1-question-bank-performance.js', 'practice-ui-resource-clarity.js']);
requires('resource-bank-bulk.js', ['assignments-core.js', 'question-bank-selection-qa.js', 'resource-bank-ui.js']);

for (const file of ['v41-signin-guard.js', 'v51-exam-publication-safety.js', 'v50-security-hardening.js']) {
  const row = byFile.get(file);
  assert.equal(row.primaryClass, 'frozen_or_wrapper_authority');
  assert.ok(row.traits.includes('frozen'), `${file}: frozen boundary must be explicit`);
}

for (const file of ['assignments-core.js', 'practice-selection-engine.js', 'topical-legacy-student-route.js']) {
  const row = byFile.get(file);
  assert.ok(
    row.externalPredecessors.includes('tier1:v581a-practice-cloud-result-reconciliation.js'),
    `${file}: current cross-tier V581A predecessor must be explicit`
  );
}

const shim = byFile.get('v52b1-question-bank-observer-gate.js');
assert.equal(shim.primaryClass, 'compatibility_checkpoint');
const shimSource = fs.readFileSync(path.join(SITE, shim.file), 'utf8');
assert.doesNotMatch(shimSource, /(?:ROOT|window)\.MutationObserver\s*=/, 'retired V52B1 shim must not regain global interception');

console.table(map.entries.map(row => ({
  index: row.index,
  file: row.file,
  class: row.primaryClass,
  predecessors: row.requiresEarlier.length
})));
console.log('PASS: Phase 7D-B maps all 41 tier-2 entries with exact bytes, authority classes and predecessor constraints.');
