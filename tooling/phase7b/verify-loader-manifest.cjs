'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const ROOT = path.resolve(__dirname, '../..');
const normalize = source => source.replace(/\r\n/g, '\n');

function verify(root = ROOT) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'tooling/phase7b/loader-manifest.json'), 'utf8'));
  assert.equal(manifest.schemaVersion, 1, 'Unsupported manifest schema');
  assert.equal(manifest.tiers.length, 2, 'Expected exactly two loader tiers');
  const owners = ['site/config.js', 'site/v40-release.js'];
  const counts = [49, 41];
  const targets = new Set();
  const dataKeys = new Set();
  const entries = [];

  manifest.tiers.forEach((tier, index) => {
    assert.equal(tier.source, owners[index], 'Loader owner/order drift');
    const source = normalize(fs.readFileSync(path.join(root, tier.source), 'utf8'));
    // Pin the complete source, including loader control flow. Regex extraction alone
    // cannot safely recognize arbitrary JavaScript. Only CRLF/LF is normalized.
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
  const inventory = fs.readdirSync(path.join(root, 'site')).filter(name => name.endsWith('.js')).sort();
  assert.deepEqual(inventory, ['config.js', ...targets].sort(), 'Unexpected or missing root-level site JavaScript');
  return entries;
}

if (require.main === module) {
  try {
    console.log(`PASS: loader manifest matches 49 + 41 entries (${verify().length} total), sources and site inventory`);
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { verify };
