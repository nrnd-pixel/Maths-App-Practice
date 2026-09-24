'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const decision = JSON.parse(fs.readFileSync(path.join(__dirname,'successor-decision.json'),'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT,'tooling','phase7b','loader-manifest.json'),'utf8'));
const authorityMap = JSON.parse(fs.readFileSync(path.join(__dirname,'tier2-authority-map.json'),'utf8'));
const prototype = require('./flat-loader-prototype.cjs');

const gitBlob = pathname => execFileSync('git',['hash-object',pathname],{
  cwd:ROOT,
  encoding:'utf8'
}).trim();

const read = pathname => fs.readFileSync(path.join(ROOT,pathname),'utf8');

assert.equal(decision.schemaVersion,1);
assert.equal(decision.phase,'7D-D');
assert.equal(decision.decision,'retain_current_frozen_nested_loader');
assert.equal(decision.productionChangeAuthorized,false,'7D-D must not authorize a production loader edit');

assert.equal(decision.currentContract.configPath,'site/config.js');
assert.equal(decision.currentContract.releasePath,'site/v40-release.js');
assert.equal(gitBlob('site/config.js'),decision.currentContract.configBlob,'config.js drifted from 7D-D rollback reference');
assert.equal(gitBlob('site/v40-release.js'),decision.currentContract.releaseBlob,'v40-release.js drifted from 7D-D rollback reference');

const tier1 = manifest.tiers.find(row => row.source === 'site/config.js');
const tier2 = manifest.tiers.find(row => row.source === 'site/v40-release.js');
assert.ok(tier1 && tier2,'accepted two-tier loader manifest must remain present');
assert.equal(tier1.entries.length,47);
assert.equal(tier2.entries.length,41);
assert.equal(decision.currentContract.tier1Scripts,47);
assert.equal(decision.currentContract.tier2Scripts,41);
assert.equal(decision.currentContract.productionRuntimeScripts,88);
assert.equal(tier1.entries.length + tier2.entries.length,88);

assert.equal(authorityMap.entries.length,41,'7D-B authority map must still cover all tier-2 owners');

const flatPlan = prototype.buildFlatPlan(manifest,authorityMap);
assert.equal(flatPlan.length,88,'7D-C dormant prototype must preserve 88 symbolic positions');
assert.equal(flatPlan.filter(step => step.kind === 'script').length,87,'7D-C dormant prototype must retain its one boundary-hook model');
assert.equal(flatPlan.filter(step => step.kind === 'release-presentation-boundary').length,1);

const selected = decision.alternatives.filter(row => row.disposition === 'selected');
assert.equal(selected.length,1,'exactly one 7D-D alternative must be selected');
assert.equal(selected[0].id,'retain-current');
assert.equal(selected[0].productionRuntimeScripts,88);
assert.equal(selected[0].directRequestReduction,0);
assert.equal(selected[0].productionSiteChanges,0);
assert.equal(selected[0].protectedBoundaryChanges,0);

const rejected = decision.alternatives.filter(row => row.disposition === 'rejected');
assert.equal(rejected.length,3,'all production successor variants must remain rejected at this checkpoint');
assert.ok(rejected.every(row => Number(row.directRequestReduction) <= 1),
  '7D-D stop condition assumes no proposed successor saves more than one direct runtime script request');

const modifyRelease = rejected.find(row => row.id === 'modify-v40-release-as-flat-coordinator');
const replaceRelease = rejected.find(row => row.id === 'replace-release-entry-with-successor');
const inlineConfig = rejected.find(row => row.id === 'inline-flat-transport-in-config');
assert.equal(modifyRelease.productionRuntimeScripts,88);
assert.equal(replaceRelease.productionRuntimeScripts,88);
assert.equal(inlineConfig.productionRuntimeScripts,87);
assert.equal(inlineConfig.directRequestReduction,1);

const config = read('site/config.js');
const release = read('site/v40-release.js');
const version = read('site/version.js');
assert.match(config,/const MATH_APP_STAGED_SCRIPTS = Object\.freeze\(\[/);
assert.match(config,/\.\/v40-release\.js/);
assert.match(config,/script\.async = false/);
assert.match(config,/document\.body\.appendChild\(script\)/);
assert.match(release,/function loadScriptOnce\(src, dataKey\)/);
assert.match(release,/document\.head\.appendChild\(script\)/);
assert.match(release,/window\.MathAppVersion\?\.applyIdentity\?\.\(\)/);
assert.match(version,/const stagedScripts = Array\.isArray\(ROOT\.MATH_APP_STAGED_SCRIPTS\)/);
assert.match(version,/deriveCurrentVersion\(stagedScripts\)/);

const option2a = read('e2e/tests/v40-static-student-signin-shell-option2a.spec.cjs');
const option2b = read('e2e/tests/v40-static-authenticated-home-option2b.spec.cjs');
const option2c = read('e2e/tests/v40-static-v40-shell-option2c.spec.cjs');

for (const [name,source] of [['Option 2A',option2a],['Option 2B',option2b],['Option 2C',option2c]]){
  assert.match(source,/'site\/v40-release\.js': 'a308df11b601bf563b56d555e9f434652e524d77'/,
    `${name}: v40-release exact frozen blob must remain pinned`);
}
assert.match(option2c,/'site\/config\.js': '7307eae1b864bf05778f6daacc7a099b7b563e90'/,
  'Option 2C: config exact successor must remain pinned');

assert.equal(decision.dormantFallback.path,'tooling/phase7d/flat-loader-prototype.cjs');
assert.equal(decision.dormantFallback.status,'retain as non-production evidence');
assert.ok(Array.isArray(decision.reopenOnlyIf) && decision.reopenOnlyIf.length >= 4,
  'reopen criteria must stay explicit and restrictive');
assert.match(decision.rollback,/current exact config\.js\/v40-release\.js blobs remain the rollback reference/);

console.log('PASS: Phase 7D-D retains the frozen nested loader because the proven production successor variants save zero to one direct runtime script requests while crossing protected loader/seal boundaries.');
