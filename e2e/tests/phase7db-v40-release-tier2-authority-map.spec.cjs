'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const SITE = path.join(ROOT, 'site');
const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'tooling', 'phase7d', 'tier2-authority-map.json'), 'utf8'));
const loaderManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'tooling', 'phase7b', 'loader-manifest.json'), 'utf8'));
const tier1 = loaderManifest.tiers.find(row => row.source === 'site/config.js');
const tier2 = loaderManifest.tiers.find(row => row.source === 'site/v40-release.js');
const byFile = new Map(map.entries.map(row => [row.file, row]));
const index = file => byFile.get(file)?.index || 0;
const read = file => fs.readFileSync(path.join(SITE, file), 'utf8');

test.describe('Phase 7D-B — tier-2 authority/dependency boundary', () => {
  test('all 41 tier-2 entries are classified exactly once and the low-risk island stays narrow', async () => {
    expect(map.entries).toHaveLength(41);
    expect(new Set(map.entries.map(row => row.file)).size).toBe(41);
    expect(map.entries.map(row => row.file)).toEqual(
      tier2.entries.map(row => String(row.src).split('?')[0])
    );

    const lowRisk = map.entries
      .filter(row => row.primaryClass === 'read_only_low_risk_leaf')
      .map(row => row.file);

    expect(lowRisk).toEqual([
      'v41-mastery-progress.js',
      'v42-teacher-action-center.js',
      'v45-intervention-queue.js',
      'v49-student-topic-progress.js',
      'v50-student-progress-overview.js',
      'v50-accessibility-polish.js',
      'v52b1-large-import-timeout-recovery.js'
    ]);

    for (const file of lowRisk) {
      const source = read(file);
      expect(source, file).not.toMatch(/\bcloud\s*\.\s*(?:rpc|from)\s*\(/);
      expect(source, file).not.toMatch(/\b(?:localStorage|sessionStorage)\b/);
      expect(source, file).not.toMatch(/(?:cloud\.rpc\s*=|renderQuestions\s*=|finishPractice\s*=|startPractice\s*=|loadExamSettingsEditor\s*=|saveExamSetting\s*=|refreshStudentAssignmentAccess\s*=)/);
    }
  });

  test('assignment, Exam, Question Bank and Resource Bank predecessor chains remain ordered', async () => {
    const orderedChains = [
      ['assignments-core.js','assignments-student.js'],
      ['assignments-core.js','assignments-teacher.js','assignment-interventions.js','v45-intervention-queue.js'],
      ['assignments-teacher.js','assignment-deadlines.js','v50-student-progress-overview.js'],
      ['v43-combined-teacher-improvements.js','v51-exam-publication-safety.js','v51-exam-publication-ui-polish.js'],
      ['student-exam-ui.js','v50-security-hardening.js','release-audit-ui.js'],
      ['paper-import-management.js','question-bank-selection-qa.js','question-bank-metadata-review.js','v52b1-question-bank-performance.js'],
      ['question-bank-selection-qa.js','v52-teacher-topical-library.js','v52b1-question-bank-performance.js','topical-legacy-student-route.js'],
      ['topical-legacy-student-route.js','practice-eligibility-ui.js','practice-selection-engine.js','practice-ui-resource-clarity.js','resource-bank-ui.js','resource-bank-bulk.js']
    ];

    for (const chain of orderedChains) {
      const positions = chain.map(index);
      expect(positions.every(value => value > 0), chain.join(' -> ')).toBe(true);
      expect([...positions].sort((a,b) => a-b), chain.join(' -> ')).toEqual(positions);
    }
  });

  test('wrapper/global authority owners retain the source markers that make reordering high risk', async () => {
    expect(read('assignments-core.js')).toContain('cloud.rpc = function(name,args,options)');
    expect(read('v43-teacher-dashboard-polish.js')).toContain('__v43cWrapped');
    expect(read('v52-topical-exercise-foundation.js')).toContain('window.questionValidationErrors = topicalValidationErrors');
    expect(read('v51-exam-publication-safety.js')).toContain('window.loadExamSettingsEditor = hardenedLoadExamSettingsEditor');
    expect(read('v50-security-hardening.js')).toContain('window.refreshStudentAssignmentAccess = secureExamAccessNote');
    expect(read('v52b1-question-bank-performance.js')).toContain('renderQuestions=function(){ return optimizedRender(previous,arguments); };');
    expect(read('topical-legacy-student-route.js')).toContain('finishPractice=async function(early)');
    expect(read('practice-selection-engine.js')).toContain('cloud.rpc = bridgedRpc');
  });

  test('cross-tier V581A predecessor is explicit for every later wrapper chain that consumes the current rpc/finish owner', async () => {
    const staged = tier1.entries.map(row => row.src);
    const releaseIndex = staged.indexOf('./v40-release.js');
    const v581aIndex = staged.indexOf('./v581a-practice-cloud-result-reconciliation.js');

    expect(releaseIndex).toBeGreaterThanOrEqual(0);
    expect(v581aIndex).toBeGreaterThan(releaseIndex);

    // Phase 7D-A proves the complete 45-entry tier-1 chain executes before tier 2,
    // so V581A is an actual runtime predecessor despite appearing later than
    // v40-release.js in the tier-1 source array.
    for (const file of [
      'assignments-core.js',
      'practice-selection-engine.js',
      'topical-legacy-student-route.js'
    ]) {
      expect(byFile.get(file).externalPredecessors).toContain(
        'tier1:v581a-practice-cloud-result-reconciliation.js'
      );
    }

    expect(read('assignments-core.js')).toContain('const previousRpc = cloud.rpc.bind(cloud)');
    expect(read('practice-selection-engine.js')).toContain('const originalRpc = cloud.rpc.bind(cloud)');
    expect(read('topical-legacy-student-route.js')).toContain("const baseFinish=typeof finishPractice==='function'?finishPractice:null");
  });

  test('Phase 7C compatibility shim is isolated from active wrapper authority', async () => {
    const row = byFile.get('v52b1-question-bank-observer-gate.js');
    expect(row.primaryClass).toBe('compatibility_checkpoint');
    expect(row.traits).toContain('retired-interception');

    const source = read(row.file);
    expect(source).toContain('suppressionActive:false');
    expect(source).not.toMatch(/(?:ROOT|window)\.MutationObserver\s*=/);
  });
});
