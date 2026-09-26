'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const prototype = require('./flat-loader-prototype.cjs');
const loaderManifest = JSON.parse(fs.readFileSync(path.join(ROOT,'tooling','phase7b','loader-manifest.json'),'utf8'));
const authorityMap = JSON.parse(fs.readFileSync(path.join(__dirname,'tier2-authority-map.json'),'utf8'));

const hashObject = pathname => execFileSync('git',['hash-object',pathname],{cwd:ROOT,encoding:'utf8'}).trim();

assert.equal(hashObject('site/config.js'),'6a46cc86d78077903641be42c2bb17f76fd81164','config.js must remain byte-identical');
assert.equal(hashObject('site/v40-release.js'),'cca15dc8a181b9bc0d47d174f53dbd689e5a4c80','v40-release.js must remain byte-identical');

const plan = prototype.buildFlatPlan(loaderManifest,authorityMap);
assert.equal(prototype.validateFlatPlan(plan,loaderManifest,authorityMap),true);
assert.equal(plan.length,99,'prototype must preserve 99 symbolic positions');

const scripts = plan.filter(step => step.kind === 'script');
const boundaries = plan.filter(step => step.kind === 'release-presentation-boundary');
assert.equal(scripts.length,98,'prototype must load 98 scripts because v40-release transport is replaced by one boundary hook');
assert.equal(boundaries.length,1,'exactly one release-presentation boundary is required');

const boundary = boundaries[0];
assert.equal(boundary.file,'v40-release.js');
assert.equal(boundary.position,14,'release-presentation boundary must remain at the current tier-1 symbolic slot');

assert.equal(plan.filter(step => step.tier === 1).length,57);
assert.equal(plan.filter(step => step.tier === 2).length,41);
assert.ok(plan.slice(0,57).every(step => step.tier === 1));
assert.ok(plan.slice(57).every(step => step.tier === 2));

const firstTier2 = plan[57];
assert.equal(firstTier2.file,'v41-signin-guard.js');

const position = file => plan.find(step => step.file === file)?.position || 0;
assert.ok(position('v581a-practice-cloud-result-reconciliation.js') > boundary.position);
assert.ok(position('v581a-practice-cloud-result-reconciliation.js') < firstTier2.position);

for (const file of ['assignments-core.js','practice-selection-engine.js','topical-legacy-student-route.js']){
  const row = authorityMap.entries.find(entry => entry.file === file);
  assert.ok(row.externalPredecessors.includes('tier1:v581a-practice-cloud-result-reconciliation.js'));
  assert.ok(position('v581a-practice-cloud-result-reconciliation.js') < position(file), `${file}: V581A predecessor ordering must be preserved`);
}

const tier2Manifest = loaderManifest.tiers.find(row => row.source === 'site/v40-release.js');
for (const entry of tier2Manifest.entries){
  const file = prototype.fileOf(entry.src);
  const step = plan.find(row => row.file === file);
  assert.equal(step.parent,'head',`${file}: tier-2 parent must remain head`);
  assert.equal(step.async,false,`${file}: tier-2 async=false must remain explicit`);
  assert.equal(step.dataKey,entry.dataKey,`${file}: duplicate-guard key drift`);
}

const source = fs.readFileSync(path.join(__dirname,'flat-loader-prototype.cjs'),'utf8');
assert.doesNotMatch(source,/MATH_APP_STAGED_SCRIPTS\s*=/,'prototype must not replace release-identity staged list');
assert.doesNotMatch(source,/MathAppVersion\s*=/,'prototype must not replace release identity owner');
assert.doesNotMatch(source,/readFileSync\([^)]*v40-release\.js/,'prototype must not read production v40-release source bytes');
assert.doesNotMatch(source,/require\([^)]*v40-release\.js/,'prototype must not require/execute production v40-release source');
assert.match(source,/release-presentation-boundary/,'prototype must make release-presentation separation explicit');
assert.match(source,/status:'skipped-existing'/,'prototype must preserve tier-2 duplicate-guard semantics');
assert.match(source,/status:'error'/,'prototype must record script failures instead of silently swallowing them');

console.log('PASS: Phase 7D-C dormant flat-loader prototype preserves the 57 -> 41 symbolic order, authority predecessors, tier-2 duplicate guards and release-identity boundary without changing production bytes.');
