'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const {
  ROOT,
  EXPECTED_INPUTS,
  EXPECTED_OUTPUT,
  buildProductionIife,
  verifyProductionContract,
} = require('./build-v58c-production-bundle.cjs');
const { verify: verifyLoaderManifest } = require('./verify-loader-manifest.cjs');

const classicSources = EXPECTED_INPUTS.map(source => fs.readFileSync(path.join(ROOT, source), 'utf8'));
const forbiddenAuthority = /\bcloud\s*\.\s*(?:rpc|from)\b|\bfetch\s*\(|\b(?:localStorage|sessionStorage|XMLHttpRequest)\b|\b(?:startPractice|finishPractice|submitAnswer|startExam|publishExam|createAssignment)\b|grade_practice_response|request_practice_hint|submit_practice_session|finalize_exam_attempt/i;

const readyFixture = `<!doctype html><html><head><title>Math App</title></head><body>
  <button id="focus-before" type="button">Before</button>
  <section id="teacher">
    <button id="analytics-tab" class="tab" data-panel="analytics-panel" type="button">Analytics</button>
    <section id="analytics-panel">
      <div id="learner-profile">
        <button id="v50c2-open-student-report" type="button">Detailed report</button>
        <button id="close-student-insight" type="button">Close learner</button>
      </div>
      <div id="analytics-students-body"><div>Student rows</div></div>
    </section>
    <section id="v58b-teacher-workspace">
      <div id="v58b-teacher-workspace-status"></div>
      <section data-v58b-group="reports-support">
        <div class="v58b-tools">
          <button id="student-reports-tool" data-v58b-tool="student-reports" type="button">Student reports</button>
          <button id="feedback-tool" data-v58b-tool="feedback" type="button">Feedback</button>
        </div>
      </section>
    </section>
  </section>
</body></html>`;

const lateFixture = `<!doctype html><html><head><title>Math App</title></head><body>
  <button id="focus-before" type="button">Before</button>
  <section id="teacher">
    <button id="analytics-tab" class="tab" data-panel="analytics-panel" type="button">Analytics</button>
    <section id="analytics-panel"><div id="analytics-students-body"><div>Student rows</div></div></section>
  </section>
</body></html>`;

const lateInsert = `
  <div id="learner-profile">
    <button id="v50c2-open-student-report" type="button">Detailed report</button>
    <button id="close-student-insight" type="button">Close learner</button>
  </div>
  <section id="v58b-teacher-workspace">
    <div id="v58b-teacher-workspace-status"></div>
    <section data-v58b-group="reports-support">
      <div class="v58b-tools">
        <button id="student-reports-tool" data-v58b-tool="student-reports" type="button">Student reports</button>
        <button id="feedback-tool" data-v58b-tool="feedback" type="button">Feedback</button>
      </div>
    </section>
  </section>`;

const studentSnapshot = Object.freeze({
  studentName: 'Alya',
  className: '6A',
  generatedAt: '2026-09-18T08:00:00.000Z',
  scope: { period: 'Last 30 days', className: '6A', year: '6' },
  records: [
    { record_type: 'metric', metric_name: 'practice_sessions_completed', metric_value: 3, student_year: 6 },
    { record_type: 'metric', metric_name: 'scored_responses', metric_value: 18, student_year: 6 },
    { record_type: 'metric', metric_name: 'topics_with_evidence', metric_value: 3, student_year: 6 },
    { record_type: 'topic', topic: 'Whole Numbers', topic_status: 'Secure', topic_accuracy_percent: 92, student_year: 6 },
    { record_type: 'topic', topic: 'Fractions', topic_status: 'Needs Attention', topic_accuracy_percent: 58, student_year: 6 },
    { record_type: 'topic', topic: 'Measurement', topic_status: 'Developing', topic_accuracy_percent: 67, student_year: 6 },
    { record_type: 'activity', activity_mode: 'practice', activity_name: 'Measurement Practice', activity_completed_at: '2026-09-16T06:00:00.000Z', practice_mastery_percent: 62, student_year: 6 },
    { record_type: 'activity', activity_mode: 'exam', activity_name: 'Exam Paper', activity_completed_at: '2026-09-18T06:00:00.000Z', practice_mastery_percent: 99, student_year: 6 },
    { record_type: 'activity', activity_mode: 'practice', activity_name: 'Fractions Practice', activity_completed_at: '2026-09-17T06:00:00.000Z', practice_mastery_percent: 70, student_year: 6 },
  ],
});

async function installHarness(page) {
  await page.evaluate(snapshot => {
    const NativeMutationObserver = window.MutationObserver;
    const observerStats = { constructed: 0, observations: [], callbacks: [] };
    class InstrumentedMutationObserver {
      constructor(callback) {
        const id = observerStats.constructed++;
        observerStats.callbacks[id] = [];
        this.native = new NativeMutationObserver((records, observer) => {
          observerStats.callbacks[id].push(records.map(record => ({
            type: record.type,
            target: record.target.id || record.target.nodeName,
            added: [...record.addedNodes].map(node => node.id || node.nodeName),
            removed: [...record.removedNodes].map(node => node.id || node.nodeName),
          })));
          callback(records, observer);
        });
        this.id = id;
      }
      observe(target, options) {
        observerStats.observations.push({
          id: this.id,
          target: target.id || target.nodeName,
          options: { childList: Boolean(options.childList), subtree: Boolean(options.subtree) },
        });
        return this.native.observe(target, options);
      }
      disconnect() { return this.native.disconnect(); }
      takeRecords() { return this.native.takeRecords(); }
    }
    Object.defineProperty(window, 'MutationObserver', {
      value: InstrumentedMutationObserver, writable: true, configurable: true,
    });

    const counters = {
      reportingSnapshot: 0,
      analyticsClicks: 0,
      scrolls: 0,
      print: 0,
      fetch: 0,
      rpc: 0,
      from: 0,
      forbiddenAuthority: 0,
    };
    window.__phase7be = { counters, observerStats, instrumentedObserver: InstrumentedMutationObserver };
    window.__phase7beSnapshot = snapshot;
    window.fetch = () => { counters.fetch += 1; throw new Error('Unexpected fetch'); };
    window.cloud = Object.freeze({
      rpc() { counters.rpc += 1; throw new Error('Unexpected cloud.rpc'); },
      from() { counters.from += 1; throw new Error('Unexpected cloud.from'); },
    });
    for (const name of ['startPractice', 'finishPractice', 'submitAnswer', 'startExam', 'publishExam', 'createAssignment']) {
      window[name] = () => { counters.forbiddenAuthority += 1; throw new Error(`Unexpected ${name}`); };
    }
    window.V50ReportingExport = Object.freeze({
      buildStudentSnapshot() {
        counters.reportingSnapshot += 1;
        return snapshot;
      },
    });
    window.print = () => {
      counters.print += 1;
      window.dispatchEvent(new Event('afterprint'));
    };
    Element.prototype.scrollIntoView = function scrollIntoView() {
      counters.scrolls += 1;
    };
    const tab = document.getElementById('analytics-tab');
    tab?.addEventListener('click', () => { counters.analyticsClicks += 1; });
  }, studentSnapshot);
}

async function executeCandidate(page, mode, bundle) {
  const scripts = mode === 'classic' ? classicSources : [bundle];
  await page.evaluate(codes => {
    for (const code of codes) {
      const script = document.createElement('script');
      script.textContent = code;
      document.head.appendChild(script);
      script.remove();
    }
  }, scripts);
}

async function settle(page, milliseconds = 180) {
  await page.evaluate(ms => new Promise(resolve => queueMicrotask(() => setTimeout(resolve, ms))), milliseconds);
}

async function exercise(page) {
  return page.evaluate(async () => {
    const trigger = document.getElementById('v58c-open-parent-summary');
    trigger.focus();
    trigger.click();

    const overlay = document.getElementById('v58c-parent-summary-overlay');
    const summary = {
      title: document.getElementById('v58c-parent-summary-title')?.textContent || null,
      headings: [...overlay.querySelectorAll('.v58c-section h3')].map(node => node.textContent),
      stats: [...overlay.querySelectorAll('.v58c-stats article strong')].map(node => node.textContent),
      strengthTopics: [...overlay.querySelectorAll('.v58c-topic-card.strength strong')].map(node => node.textContent),
      focusTopics: [...overlay.querySelectorAll('.v58c-topic-card.focus strong')].map(node => node.textContent),
      activities: [...overlay.querySelectorAll('.v58c-activity > div > strong')].map(node => node.textContent),
      nextStep: overlay.querySelector('.v58c-next-step p')?.textContent || null,
      practiceOnlyNote: overlay.textContent.includes('It is not an official grade.'),
      visible: !overlay.classList.contains('hidden'),
    };

    document.getElementById('v58c-print').click();
    const printingClassAfterPrint = document.body.classList.contains('v58c-printing');
    const titleAfterPrint = document.title;
    document.getElementById('v58c-close').click();

    const focusRestored = document.activeElement?.id || null;
    const overlayHiddenAfterClose = overlay.classList.contains('hidden');

    document.getElementById('v58c-workspace-parent-summary').click();
    await new Promise(resolve => setTimeout(resolve, 130));
    const status = document.getElementById('v58b-teacher-workspace-status')?.textContent || '';

    return {
      summary,
      printingClassAfterPrint,
      titleAfterPrint,
      focusRestored,
      overlayHiddenAfterClose,
      status,
    };
  });
}

async function snapshot(page, scenario, early, exerciseResult) {
  return page.evaluate(({ scenarioName, earlyState, exercised }) => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'V58CParentFriendlyStudentReport');
    const api = window.V58CParentFriendlyStudentReport;
    const tools = document.querySelector('#v58b-teacher-workspace [data-v58b-group="reports-support"] .v58b-tools');
    const learner = document.getElementById('learner-profile');
    const state = window.__phase7be;
    return {
      scenario: scenarioName,
      early: earlyState,
      markers: {
        report: window.__v58cParentFriendlyStudentReportInstalled,
        shortcut: window.__v58cParentSummaryWorkspaceShortcutInstalled,
      },
      descriptor: descriptor && {
        writable: descriptor.writable,
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        frozen: Object.isFrozen(descriptor.value),
        functions: Object.keys(descriptor.value).sort(),
      },
      counts: {
        style: document.querySelectorAll('#v58c-parent-summary-style').length,
        overlay: document.querySelectorAll('#v58c-parent-summary-overlay').length,
        trigger: document.querySelectorAll('#v58c-open-parent-summary').length,
        shortcut: document.querySelectorAll('#v58c-workspace-parent-summary').length,
      },
      order: {
        learner: [...(learner?.children || [])].map(node => node.id),
        tools: [...(tools?.children || [])].map(node => node.id || node.dataset.v58bTool || node.tagName),
      },
      apiChecks: {
        nextStep: api.nextStep(window.__phase7beSnapshot),
        buildHasStudent: api.buildSummary(window.__phase7beSnapshot).includes('Alya — Maths Progress'),
        buildExcludesExamActivity: !api.buildSummary(window.__phase7beSnapshot).includes('Exam Paper'),
      },
      exercise: exercised,
      counters: { ...state.counters },
      observer: {
        currentIsInstrumented: window.MutationObserver === state.instrumentedObserver,
        constructed: state.observerStats.constructed,
        observations: state.observerStats.observations,
        callbacks: state.observerStats.callbacks,
      },
    };
  }, { scenarioName: scenario, earlyState: early, exercised: exerciseResult });
}

function assertContract(result) {
  assert.deepEqual(result.markers, { report: true, shortcut: true });
  assert.deepEqual(result.descriptor, {
    writable: false,
    configurable: false,
    enumerable: false,
    frozen: true,
    functions: ['buildSummary', 'nextStep', 'open'],
  });
  assert.deepEqual(result.counts, { style: 1, overlay: 1, trigger: 1, shortcut: 1 });
  assert.deepEqual(result.order.learner, [
    'v58c-open-parent-summary',
    'v50c2-open-student-report',
    'close-student-insight',
  ]);
  assert.deepEqual(result.order.tools, [
    'student-reports-tool',
    'v58c-workspace-parent-summary',
    'feedback-tool',
  ]);
  assert.equal(result.apiChecks.nextStep,
    'A useful next step is to continue practising Fractions and review progress again after more completed Practice.');
  assert.equal(result.apiChecks.buildHasStudent, true);
  assert.equal(result.apiChecks.buildExcludesExamActivity, true);

  assert.equal(result.exercise.summary.title, 'Alya — Maths Progress');
  assert.deepEqual(result.exercise.summary.headings, [
    '✅ Current strengths',
    '🎯 Areas to focus on',
    '➡️ Suggested next step',
    '🕘 Recent Practice',
  ]);
  assert.deepEqual(result.exercise.summary.stats.slice(0, 3), ['3', '18', '3']);
  assert.deepEqual(result.exercise.summary.strengthTopics, ['Whole Numbers']);
  assert.deepEqual(result.exercise.summary.focusTopics, ['Fractions', 'Measurement']);
  assert.deepEqual(result.exercise.summary.activities, ['Fractions Practice', 'Measurement Practice']);
  assert.equal(result.exercise.summary.nextStep,
    'A useful next step is to continue practising Fractions and review progress again after more completed Practice.');
  assert.equal(result.exercise.summary.practiceOnlyNote, true);
  assert.equal(result.exercise.summary.visible, true);
  assert.equal(result.exercise.printingClassAfterPrint, false);
  assert.equal(result.exercise.titleAfterPrint, 'Math App');
  assert.equal(result.exercise.focusRestored, 'v58c-open-parent-summary');
  assert.equal(result.exercise.overlayHiddenAfterClose, true);
  assert.equal(result.exercise.status,
    'Choose a student in Analytics, then use 👪 Parent summary in that learner profile.');

  assert.deepEqual(result.counters, {
    reportingSnapshot: 2,
    analyticsClicks: 1,
    scrolls: 1,
    print: 1,
    fetch: 0,
    rpc: 0,
    from: 0,
    forbiddenAuthority: 0,
  });
  assert.equal(result.observer.currentIsInstrumented, true);
  assert.equal(result.observer.constructed, 2);
  assert.deepEqual(result.observer.observations, [
    { id: 0, target: 'teacher', options: { childList: true, subtree: true } },
    { id: 1, target: 'teacher', options: { childList: true, subtree: true } },
  ]);
  assert(result.observer.callbacks.every(callbacks => callbacks.length > 0),
    'Both V58C observers must receive DOM callbacks');

  if (result.scenario === 'late') {
    assert.deepEqual(result.early, { style: 1, overlay: 1, trigger: 0, shortcut: 0 });
  } else {
    assert.equal(result.early, null);
  }
}

async function runScenario(browser, mode, scenario, bundle) {
  const page = await browser.newPage();
  await page.setContent(scenario === 'late' ? lateFixture : readyFixture);
  await installHarness(page);
  await executeCandidate(page, mode, bundle);
  await settle(page);

  let early = null;
  if (scenario === 'late') {
    early = await page.evaluate(() => ({
      style: document.querySelectorAll('#v58c-parent-summary-style').length,
      overlay: document.querySelectorAll('#v58c-parent-summary-overlay').length,
      trigger: document.querySelectorAll('#v58c-open-parent-summary').length,
      shortcut: document.querySelectorAll('#v58c-workspace-parent-summary').length,
    }));
    await page.evaluate(html => {
      document.getElementById('teacher').insertAdjacentHTML('beforeend', html);
    }, lateInsert);
    await settle(page);
  }

  const exerciseResult = await exercise(page);
  await executeCandidate(page, mode, bundle);
  await settle(page);
  const result = await snapshot(page, scenario, early, exerciseResult);
  await page.close();
  return result;
}

async function main() {
  assert.equal(verifyLoaderManifest().length, 87, 'Phase 7B production loader verification must stay green');
  verifyProductionContract();
  for (const source of classicSources) {
    assert.doesNotMatch(source, forbiddenAuthority,
      'V58C canonical source contains forbidden network/storage/learning/Exam/assignment authority');
  }
  const bundle = await buildProductionIife();
  assert.equal(fs.readFileSync(path.join(ROOT, EXPECTED_OUTPUT), 'utf8'), bundle,
    'V58C equivalence harness must execute the exact committed production bundle bytes');
  assert.doesNotMatch(bundle, forbiddenAuthority,
    'V58C production IIFE contains forbidden network/storage/learning/Exam/assignment authority');

  const browser = await chromium.launch({ headless: true });
  try {
    for (const scenario of ['ready', 'late']) {
      const classic = await runScenario(browser, 'classic', scenario, bundle);
      const production = await runScenario(browser, 'production', scenario, bundle);
      assertContract(classic);
      assertContract(production);
      assert.deepEqual(production, classic, `${scenario}: V58C production IIFE diverged from classic scripts`);
      console.log(`PASS: ${scenario} DOM — classic V58C scripts and committed production IIFE are structurally equivalent`);
    }
  } finally {
    await browser.close();
  }
  console.log('PASS: Phase 7B-F V58C production equivalence contract');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
