const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const readSite = name => fs.readFileSync(path.join(siteRoot, name), 'utf8');

const config = readSite('config.js');
const versionSource = readSite('version.js');
const indexHtml = readSite('index.html');
const releaseLoader = readSite('v40-release.js');

function normalizeScriptRef(value) {
  return String(value || '').replace(/^\.\//, '').split(/[?#]/, 1)[0];
}

function parseStagedScripts(source) {
  const block = source.match(/const\s+MATH_APP_STAGED_SCRIPTS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(block, 'config.js must define MATH_APP_STAGED_SCRIPTS as the authoritative staged runtime list.');
  return [...block[1].matchAll(/['"](\.\/[^'"]+\.js(?:\?[^'"]*)?)['"]/g)].map(match => match[1]);
}

function parseNestedReleaseScripts(source) {
  return [...source.matchAll(/loadScriptOnce\(\s*['"]([^'"]+\.js)(?:\?[^'"]*)?['"]/g)].map(match => match[1]);
}

function independentVersionFromScripts(sources) {
  let winner = null;
  for (const source of sources) {
    const file = normalizeScriptRef(source).split('/').pop() || '';
    const match = file.match(/^v(\d+)/i);
    if (!match) continue;
    const parts = [...match[1]].map(Number);
    if (!winner) {
      winner = parts;
      continue;
    }
    const length = Math.max(parts.length, winner.length);
    let comparison = 0;
    for (let index = 0; index < length; index += 1) {
      const left = parts[index] ?? 0;
      const right = winner[index] ?? 0;
      if (left !== right) {
        comparison = left - right;
        break;
      }
    }
    if (comparison > 0) winner = parts;
  }
  return winner ? winner.join('.') : '';
}

const stagedScripts = parseStagedScripts(config);
assert.ok(stagedScripts.length >= 40, 'Expected the established staged runtime script list.');
assert.equal(stagedScripts[0], './version.js', 'version.js must load first so later presentation layers share the same identity source.');
assert.match(config, /MATH_APP_STAGED_SCRIPTS\.forEach\(src\s*=>/, 'config.js must execute the same staged list used to derive the release identity.');

const independentlyDerivedVersion = independentVersionFromScripts(stagedScripts);
assert.ok(independentlyDerivedVersion, 'Could not derive a current release from MATH_APP_STAGED_SCRIPTS.');

const sandbox = {
  MATH_APP_STAGED_SCRIPTS: Object.freeze([...stagedScripts]),
  module: { exports: {} },
};
vm.createContext(sandbox);
new vm.Script(versionSource, { filename: 'version.js' }).runInContext(sandbox);
const versionApi = sandbox.module.exports;
assert.ok(versionApi?.CURRENT_RELEASE, 'version.js must export CURRENT_RELEASE for verifier/runtime parity.');
assert.equal(
  versionApi.CURRENT_RELEASE.version,
  independentlyDerivedVersion,
  'version.js CURRENT_RELEASE must agree with an independent derivation from config.js staged scripts.'
);
assert.equal(versionApi.CURRENT_RELEASE.label, `V${independentlyDerivedVersion}`);
assert.equal(versionApi.CURRENT_RELEASE.title, `Math Practice V${independentlyDerivedVersion}`);
assert.equal(versionApi.CURRENT_RELEASE.badge, `Version ${independentlyDerivedVersion} • Stable Release`);
assert.doesNotMatch(
  versionSource,
  /(?:Math Practice\s+V|Version\s+|\blabel:\s*['"`]V)5(?:\.|['"`])/,
  'version.js must derive the numeric V5.x release from config.js rather than hardcoding a second current-version value.'
);

// There must be exactly one authoritative CURRENT_RELEASE definition in the browser codebase.
const topLevelJs = fs.readdirSync(siteRoot).filter(name => name.endsWith('.js')).sort();
const currentReleaseDefinitions = [];
for (const name of topLevelJs) {
  const source = readSite(name);
  const matches = [...source.matchAll(/\bconst\s+CURRENT_RELEASE\s*=/g)];
  for (const match of matches) currentReleaseDefinitions.push({ name, index: match.index });
}
assert.deepEqual(
  currentReleaseDefinitions.map(entry => entry.name),
  ['version.js'],
  'Exactly one authoritative CURRENT_RELEASE definition must exist, and it must live in site/version.js.'
);
assert.equal(
  (versionSource.match(/Object\.defineProperty\(window,'MathAppVersion'/g) || []).length,
  1,
  'version.js must expose exactly one immutable MathAppVersion runtime API.'
);

// Build the active browser runtime set from config.js plus v40-release.js nested loaders.
const activeRuntimeNames = new Set(stagedScripts.map(normalizeScriptRef));
for (const nested of parseNestedReleaseScripts(releaseLoader)) activeRuntimeNames.add(normalizeScriptRef(nested));
activeRuntimeNames.add('config.js');

const identityWriters = [];
const forbiddenLiteralAssignments = [];
for (const name of [...activeRuntimeNames].sort()) {
  const full = path.join(siteRoot, name);
  assert.ok(fs.existsSync(full), `Active runtime script is missing: ${name}`);
  const source = fs.readFileSync(full, 'utf8');

  // A document title can legitimately be changed temporarily for printing/reporting.
  // Count only title writes that are clearly using the shared release identity; hardcoded
  // versioned title writes are rejected separately below.
  const writesSharedReleaseTitle = /document\.title\s*=\s*(?:CURRENT_RELEASE|currentRelease\(\)|release)\.title/.test(source);
  const startBadgeVariables = [...source.matchAll(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.querySelector\(\s*['"]#start \.brand \.badge['"]\s*\)/g
  )].map(match => match[1]);
  const writesReleaseBadge = startBadgeVariables.some(variable =>
    new RegExp(`\\b${variable}\\.textContent\\s*=`).test(source)
  );
  if (writesSharedReleaseTitle || writesReleaseBadge) identityWriters.push(name);

  for (const pattern of [
    /document\.title\s*=\s*['"`]\s*Math Practice\s+V\d/,
    /\.textContent\s*=\s*['"`]\s*Version\s+\d/,
    /\bconst\s+(?:TITLE|BADGE)\s*=\s*['"`]\s*(?:Math Practice\s+V|Version\s+)\d/,
  ]) {
    if (pattern.test(source)) forbiddenLiteralAssignments.push({ name, pattern: String(pattern) });
  }

  if (writesReleaseBadge && name !== 'version.js') {
    assert.match(
      source,
      /MathAppVersion/,
      `${name} writes the start-screen release badge but does not delegate to the shared MathAppVersion source.`
    );
  }
}

if (forbiddenLiteralAssignments.length) {
  for (const hit of forbiddenLiteralAssignments) {
    console.error(`Hardcoded active release identity: ${hit.name} matched ${hit.pattern}`);
  }
  assert.fail(`${forbiddenLiteralAssignments.length} hardcoded active release identity assignment(s) remain.`);
}
assert.ok(identityWriters.includes('version.js'), 'version.js must be an active identity writer.');

// The three static bootstrap strings in index.html must agree with the independently derived version.
const titleMatches = [...indexHtml.matchAll(/<title>\s*Math Practice V([0-9.]+)\s*<\/title>/gi)];
const badgeMatches = [...indexHtml.matchAll(/<span\s+class="badge local">\s*Version\s+([0-9.]+)\s*•[^<]*<\/span>/gi)];
const introMatches = [...indexHtml.matchAll(/<strong>\s*V([0-9.]+):\s*<\/strong>/gi)];

assert.equal(titleMatches.length, 1, 'index.html must contain exactly one versioned bootstrap <title>.');
assert.equal(badgeMatches.length, 1, 'index.html must contain exactly one versioned start-screen bootstrap badge.');
assert.equal(introMatches.length, 1, 'index.html must contain exactly one versioned start-screen introduction label.');
for (const [surface, matches] of [
  ['title', titleMatches],
  ['badge', badgeMatches],
  ['intro', introMatches],
]) {
  assert.equal(
    matches[0][1],
    independentlyDerivedVersion,
    `index.html bootstrap ${surface} must match the release independently derived from config.js.`
  );
}

console.log('Phase 2 version-source integrity checks passed.');
console.log(`- config-derived current release: ${independentlyDerivedVersion}`);
console.log(`- ${stagedScripts.length} staged config scripts inspected`);
console.log(`- ${activeRuntimeNames.size} active runtime scripts scanned for hardcoded release title/badge identity`);
console.log(`- shared release identity writers: ${identityWriters.sort().join(', ')}`);
console.log('- exactly one CURRENT_RELEASE definition exists in site/version.js');
console.log('- version.js contains no hardcoded numeric V5.x current-version value');
console.log('- index.html title, badge and introduction bootstrap versions match config.js');
