'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const ROOT = path.resolve(__dirname, '../..');
const normalize = source => source.replace(/\r\n/g, '\n');

const EXPECTED_STANDALONE = Object.freeze([
  // Registered directly by index.html; intentionally outside MATH_APP_STAGED_SCRIPTS
  // and the nested v40-release loader chain.
  'site/sw.js',
]);

const EXPECTED_SOURCE_ONLY = Object.freeze([
  'site/v5761-feedback-trigger-position.js',
  'site/v5763-teacher-feedback-header-icon.js',
  'site/v58a-student-first-use-experience.js',
  'site/v58b-teacher-workspace-consolidation.js',
  'site/v58c-parent-friendly-student-report.js',
  'site/v58c-parent-summary-workspace-shortcut.js',
  'site/v39-dashboard-polish.js',
  'site/v39-state-polish.js',
]);

const EXPECTED_BUNDLES = Object.freeze([
  {
    path: 'site/v576-feedback-presentation-bundle.js',
    inputs: [
      'site/v5761-feedback-trigger-position.js',
      'site/v5763-teacher-feedback-header-icon.js',
    ],
  },
  {
    path: 'site/v58ab-first-use-workspace-bundle.js',
    inputs: [
      'site/v58a-student-first-use-experience.js',
      'site/v58b-teacher-workspace-consolidation.js',
    ],
  },
  {
    path: 'site/v58c-parent-summary-presentation-bundle.js',
    inputs: [
      'site/v58c-parent-friendly-student-report.js',
      'site/v58c-parent-summary-workspace-shortcut.js',
    ],
  },
  {
    path: 'site/v39cd-dashboard-state-bundle.js',
    inputs: [
      'site/v39-dashboard-polish.js',
      'site/v39-state-polish.js',
    ],
  },
]);

function verify(root = ROOT) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'tooling/phase7b/loader-manifest.json'), 'utf8'));
  assert.equal(manifest.schemaVersion, 2, 'Unsupported manifest schema');
  assert.equal(manifest.tiers.length, 2, 'Expected exactly two loader tiers');
  const owners = ['site/config.js', 'site/v40-release.js'];
  const counts = [49, 41];
  const targets = new Set();
  const dataKeys = new Set();
  const entries = [];

  manifest.tiers.forEach((tier, index) => {
    assert.equal(tier.source, owners[index], 'Loader owner/order drift');
    const source = normalize(fs.readFileSync(path.join(root, tier.source), 'utf8'));
    assert.equal(createHash('sha256').update(source).digest('hex'), tier.sourceSha256,
      `${tier.source}: loader source drift; review before updating the manifest`);
    let actual;
    if (index === 0) {
      const arrays = [...source.matchAll(/const MATH_APP_STAGED_SCRIPTS = Object\.freeze\(\[([\s\S]*?)\]\);/g)];
      assert.equal(arrays.length, 1, 'Expected one frozen staged array');
      const body = arrays[0][1];
      assert.match(body, /^\s*'[^'\\\n]+'(?:\s*,\s*'[^'\\\n]+')*\s*,?\s*$/, 'Staged array must contain only literal URLs');
      actual = [...body.matchAll(/'([^']+)'/g)].map(match => ({ src: match[1] }));
    } else {
      actual = [...source.matchAll(/^\s+loadScriptOnce\('([^'\\\n]+)', '([^'\\\n]+)'\);$/gm)]
        .map(match => ({ src: match[1], dataKey: match[2] }));
    }
    assert.equal(actual.length, counts[index], `${tier.source}: unexpected entry count`);
    assert.deepEqual(tier.entries, actual, `${tier.source}: missing, extra, reordered or changed manifest entries`);
    for (const entry of actual) {
      assert.match(entry.src, /^(?:\.\/)?[A-Za-z0-9_-]+\.js(?:\?[A-Za-z0-9_=&.-]+)?$/, 'Expected a local root-level script URL');
      const target = entry.src.replace(/^\.\//, '').split('?')[0];
      assert(!targets.has(target), `Duplicate script target: ${target}`);
      targets.add(target);
      assert(fs.statSync(path.join(root, 'site', target)).isFile(), `Missing target: ${target}`);
      if (entry.dataKey) {
        assert(!dataKeys.has(entry.dataKey), `Duplicate loader data key: ${entry.dataKey}`);
        dataKeys.add(entry.dataKey);
      }
      entries.push({ ...entry, target, owner: tier.source });
    }
  });

  assert(Array.isArray(manifest.sourceOnly), 'Expected a sourceOnly manifest array');
  assert.deepEqual(manifest.sourceOnly.map(entry => entry.path), EXPECTED_SOURCE_ONLY,
    'sourceOnly must contain exactly the eight reviewed canonical inputs in build order');
  const sourceOnlyTargets = new Set();
  for (const entry of manifest.sourceOnly) {
    assert.match(entry.path, /^site\/[A-Za-z0-9_-]+\.js$/, 'Expected a root-level site source-only path');
    assert.match(entry.sha256, /^[a-f0-9]{64}$/, `${entry.path}: invalid exact-byte SHA-256`);
    const target = path.basename(entry.path);
    assert(!targets.has(target), `${entry.path}: source-only input must not appear in the loaded chain`);
    assert(!sourceOnlyTargets.has(target), `Duplicate source-only target: ${target}`);
    sourceOnlyTargets.add(target);
    const bytes = fs.readFileSync(path.join(root, entry.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256,
      `${entry.path}: source-only exact bytes drifted`);
  }

  assert(Array.isArray(manifest.generatedBundles), 'Expected generatedBundles manifest array');
  assert.equal(manifest.generatedBundles.length, EXPECTED_BUNDLES.length,
    'Expected exactly four reviewed production bundles');
  for (let index = 0; index < EXPECTED_BUNDLES.length; index += 1) {
    const expected = EXPECTED_BUNDLES[index];
    const contract = manifest.generatedBundles[index];
    assert.equal(contract.path, expected.path, 'Generated bundle path/order drift');
    assert.deepEqual(contract.inputs, expected.inputs, `${expected.path}: input order drift`);
    assert.equal(contract.tool, 'esbuild', `${expected.path}: tool drift`);
    assert.equal(contract.toolVersion, '0.28.2', `${expected.path}: esbuild version drift`);
    assert.equal(contract.options?.format, 'iife', `${expected.path}: format drift`);
    assert.equal(contract.options?.platform, 'browser', `${expected.path}: platform drift`);
    assert.equal(contract.options?.target, 'es2020', `${expected.path}: target drift`);
    assert.match(contract.sha256, /^[a-f0-9]{64}$/, `${expected.path}: invalid bundle SHA-256`);
    assert.equal(targets.has(path.basename(contract.path)), true,
      `${expected.path}: production bundle must be loaded exactly once`);
    for (const input of contract.inputs) {
      assert(EXPECTED_SOURCE_ONLY.includes(input), `${expected.path}: unreviewed source-only input ${input}`);
      const sourceOnly = manifest.sourceOnly.find(entry => entry.path === input);
      assert(sourceOnly?.reason?.includes(path.basename(contract.path)),
        `${input}: source-only reason must name its generated successor`);
    }
  }

  const standaloneTargets = new Set();
  for (const pathname of EXPECTED_STANDALONE) {
    assert.match(pathname, /^site\/[A-Za-z0-9_-]+\.js$/, 'Expected a root-level standalone site script path');
    const target = path.basename(pathname);
    assert(!targets.has(target), `${pathname}: standalone script must not appear in the staged loader chain`);
    assert(!sourceOnlyTargets.has(target), `${pathname}: standalone script must not be a bundle source-only input`);
    assert(!standaloneTargets.has(target), `Duplicate standalone target: ${target}`);
    standaloneTargets.add(target);
    assert(fs.statSync(path.join(root, pathname)).isFile(), `Missing standalone target: ${target}`);
  }

  const inventory = fs.readdirSync(path.join(root, 'site')).filter(name => name.endsWith('.js')).sort();
  assert.deepEqual(inventory, ['config.js', ...targets, ...sourceOnlyTargets, ...standaloneTargets].sort(),
    'Unexpected or missing root-level site JavaScript outside loaded + sourceOnly + standalone ownership');
  return entries;
}

if (require.main === module) {
  try {
    console.log(`PASS: loader manifest matches 49 + 41 loaded entries (${verify().length} total), 8 source-only inputs, 1 standalone script, 4 generated bundles and site inventory`);
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { EXPECTED_BUNDLES, EXPECTED_SOURCE_ONLY, EXPECTED_STANDALONE, verify };
