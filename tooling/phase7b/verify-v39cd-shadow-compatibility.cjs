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
} = require('./build-v39cd-production-bundle.cjs');
const { verify: verifyLoaderManifest } = require('./verify-loader-manifest.cjs');

const classicSources = EXPECTED_INPUTS.map(source => fs.readFileSync(path.join(ROOT, source), 'utf8'));
const forbiddenAuthority = /\bcloud\s*\.\s*(?:rpc|from)\b|\bfetch\s*\(|\b(?:localStorage|sessionStorage|XMLHttpRequest)\b|\b(?:startPractice|finishPractice|submitAnswer|startExam|publishExam|createAssignment)\b|grade_practice_response|request_practice_hint|submit_practice_session|finalize_exam_attempt|set_student_pin/i;

const readyFixture = `<!doctype html><html><head><title>Math App</title></head><body>
  <section id="student-dashboard">
    <div class="header"><h1>My Progress</h1></div>
    <div id="student-dashboard-summary"><div class="stat"><strong>4</strong><span>Sessions</span></div></div>
    <section id="recommended" class="analytics-section">
      <h3>Recommended Practice</h3>
      <div id="dash-empty" class="empty">No recommendation yet.</div>
    </section>
    <section id="dashboard-tail">Tail</section>
  </section>
  <section id="student-assignments">
    <div class="header"><h1>Assignments</h1></div>
    <div id="student-assignments-list"><div id="assignment-empty" class="empty">No assignments.</div></div>
  </section>
</body></html>`;

const emptyFixture = '<!doctype html><html><head><title>Math App</title></head><body></body></html>';

async function installHarness(page) {
  await page.evaluate(() => {
    const NativeMutationObserver = window.MutationObserver;
    const observerStats = { constructed: 0, observations: [], callbackBatches: [] };

    class InstrumentedMutationObserver {
      constructor(callback) {
        const id = observerStats.constructed++;
        observerStats.callbackBatches[id] = 0;
        this.id = id;
        this.native = new NativeMutationObserver((records, observer) => {
          observerStats.callbackBatches[id] += 1;
          callback(records, observer);
        });
      }
      observe(target, options) {
        observerStats.observations.push({
          id: this.id,
          target: target.id || target.nodeName,
          childList: Boolean(options.childList),
          subtree: Boolean(options.subtree),
        });
        return this.native.observe(target, options);
      }
      disconnect() { return this.native.disconnect(); }
      takeRecords() { return this.native.takeRecords(); }
    }

    Object.defineProperty(window, 'MutationObserver', {
      value: InstrumentedMutationObserver,
      writable: true,
      configurable: true,
    });

    const counters = { fetch: 0, rpc: 0, from: 0, forbiddenAuthority: 0 };
    window.fetch = () => { counters.fetch += 1; throw new Error('Unexpected fetch'); };
    window.cloud = Object.freeze({
      rpc() { counters.rpc += 1; throw new Error('Unexpected cloud.rpc'); },
      from() { counters.from += 1; throw new Error('Unexpected cloud.from'); },
    });
    for (const name of ['startPractice', 'finishPractice', 'submitAnswer', 'startExam', 'publishExam', 'createAssignment']) {
      window[name] = () => {
        counters.forbiddenAuthority += 1;
        throw new Error(`Unexpected ${name}`);
      };
    }

    window.__phase7bk = {
      counters,
      observerStats,
      InstrumentedMutationObserver,
      rootRefs: null,
    };
  });
}

async function captureRootRefs(page) {
  await page.evaluate(() => {
    window.__phase7bk.rootRefs = {
      dashboard: document.getElementById('student-dashboard'),
      assignments: document.getElementById('student-assignments'),
      summary: document.getElementById('student-dashboard-summary'),
      list: document.getElementById('student-assignments-list'),
      recommended: document.getElementById('recommended'),
    };
  });
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

async function settle(page, milliseconds = 120) {
  await page.evaluate(ms => new Promise(resolve => queueMicrotask(() => setTimeout(resolve, ms))), milliseconds);
}

async function mutateObservedRoots(page) {
  await page.evaluate(() => {
    const dashboardEmpty = document.createElement('div');
    dashboardEmpty.id = 'dash-empty-late';
    dashboardEmpty.className = 'empty';
    dashboardEmpty.textContent = 'Later dashboard state';
    document.getElementById('student-dashboard')?.appendChild(dashboardEmpty);

    const assignmentEmpty = document.createElement('div');
    assignmentEmpty.id = 'assignment-empty-late';
    assignmentEmpty.className = 'empty';
    assignmentEmpty.textContent = 'Later assignment state';
    document.getElementById('student-assignments-list')?.appendChild(assignmentEmpty);
  });
  await settle(page);
}

async function lateInsertFixture(page) {
  await page.evaluate(html => {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    document.body.append(...parsed.body.childNodes);
  }, readyFixture);
}

async function snapshot(page, scenario, preRecovery) {
  return page.evaluate(({ scenarioName, preRecoveryState }) => {
    const state = window.__phase7bk;
    const dashboard = document.getElementById('student-dashboard');
    const assignments = document.getElementById('student-assignments');
    const summary = document.getElementById('student-dashboard-summary');
    const list = document.getElementById('student-assignments-list');
    const recommended = document.getElementById('recommended');
    const dashboardStyle = document.getElementById('v39-dashboard-polish-style');
    const stateStyle = document.getElementById('v39-state-polish-style');
    const childKey = node => node.id || node.className || node.tagName;

    return {
      scenario: scenarioName,
      preRecovery: preRecoveryState,
      styles: {
        dashboardCount: document.querySelectorAll('#v39-dashboard-polish-style').length,
        stateCount: document.querySelectorAll('#v39-state-polish-style').length,
        dashboardText: dashboardStyle?.textContent || '',
        stateText: stateStyle?.textContent || '',
      },
      counts: {
        dashboardIntro: dashboard?.querySelectorAll('.v39-dashboard-intro').length || 0,
        assignmentsIntro: assignments?.querySelectorAll('.v39-assignments-intro').length || 0,
        dashboardLabels: dashboard?.querySelectorAll('.v39-section-label').length || 0,
        assignmentLabels: assignments?.querySelectorAll('.v39-section-label').length || 0,
      },
      identity: state.rootRefs ? {
        dashboard: state.rootRefs.dashboard === dashboard,
        assignments: state.rootRefs.assignments === assignments,
        summary: state.rootRefs.summary === summary,
        list: state.rootRefs.list === list,
        recommended: state.rootRefs.recommended === recommended,
      } : null,
      dashboardOrder: dashboard ? [...dashboard.children].map(childKey) : [],
      assignmentOrder: assignments ? [...assignments.children].map(childKey) : [],
      recommended: {
        prioritized: recommended?.dataset.v39Prioritized || '',
        afterIntro: Boolean(recommended && recommended.previousElementSibling?.classList.contains('v39-dashboard-intro')),
      },
      labels: {
        dashboardBeforeSummary: Boolean(summary?.previousElementSibling?.classList.contains('v39-section-label')),
        assignmentBeforeList: Boolean(list?.previousElementSibling?.classList.contains('v39-section-label')),
      },
      emptyStates: {
        dashboardInitial: document.getElementById('dash-empty')?.classList.contains('v39-empty-enhanced') ?? null,
        assignmentInitial: document.getElementById('assignment-empty')?.classList.contains('v39-empty-enhanced') ?? null,
        dashboardLate: document.getElementById('dash-empty-late')?.classList.contains('v39-empty-enhanced') ?? null,
        assignmentLate: document.getElementById('assignment-empty-late')?.classList.contains('v39-empty-enhanced') ?? null,
      },
      observer: {
        currentIsInstrumented: window.MutationObserver === state.InstrumentedMutationObserver,
        constructed: state.observerStats.constructed,
        observations: state.observerStats.observations,
        callbackBatches: state.observerStats.callbackBatches,
      },
      counters: { ...state.counters },
    };
  }, { scenarioName: scenario, preRecoveryState: preRecovery });
}

function assertFinalContract(result) {
  assert.equal(result.styles.dashboardCount, 1);
  assert.equal(result.styles.stateCount, 1);
  assert.match(result.styles.dashboardText, /#student-dashboard \.v39-dashboard-intro/);
  assert.match(result.styles.stateText, /#start button:focus-visible/);
  assert.match(result.styles.stateText, /@media\(max-width:520px\)/);

  assert.deepEqual(result.counts, {
    dashboardIntro: 1,
    assignmentsIntro: 1,
    dashboardLabels: 1,
    assignmentLabels: 1,
  });
  assert.deepEqual(result.identity, {
    dashboard: true,
    assignments: true,
    summary: true,
    list: true,
    recommended: true,
  });
  assert.deepEqual(result.dashboardOrder, [
    'header',
    'v39-dashboard-intro',
    'recommended',
    'v39-section-label',
    'student-dashboard-summary',
    'dashboard-tail',
    'dash-empty-late',
  ]);
  assert.deepEqual(result.assignmentOrder, [
    'header',
    'v39-assignments-intro',
    'v39-section-label',
    'student-assignments-list',
  ]);
  assert.deepEqual(result.recommended, { prioritized: 'true', afterIntro: true });
  assert.deepEqual(result.labels, { dashboardBeforeSummary: true, assignmentBeforeList: true });
  assert.deepEqual(result.emptyStates, {
    dashboardInitial: true,
    assignmentInitial: true,
    dashboardLate: true,
    assignmentLate: true,
  });
  assert.deepEqual(result.counters, { fetch: 0, rpc: 0, from: 0, forbiddenAuthority: 0 });
  assert.equal(result.observer.currentIsInstrumented, true);
  assert(result.observer.callbackBatches.some(count => count > 0),
    'Expected V39C MutationObservers to receive callbacks after controlled DOM mutations');

  if (result.scenario === 'ready') {
    assert.equal(result.observer.constructed, 4,
      'Ready-DOM repeated execution should register the same two V39C observers twice');
    assert.deepEqual(result.observer.observations.map(x => x.target), [
      'student-dashboard', 'student-assignments', 'student-dashboard', 'student-assignments',
    ]);
    assert.equal(result.preRecovery, null);
  } else {
    assert.equal(result.observer.constructed, 2,
      'Late-DOM recovery execution should register exactly the two V39C observers once roots exist');
    assert.deepEqual(result.observer.observations.map(x => x.target), [
      'student-dashboard', 'student-assignments',
    ]);
    assert.deepEqual(result.preRecovery, {
      dashboardIntro: 0,
      assignmentsIntro: 0,
      dashboardLabels: 0,
      assignmentLabels: 0,
      dashboardInitialEnhanced: false,
      assignmentInitialEnhanced: false,
      observers: 0,
      dashboardStyle: 1,
      stateStyle: 1,
    });
  }
}

async function runScenario(browser, mode, scenario, bundle) {
  const page = await browser.newPage();
  await page.setContent(scenario === 'ready' ? readyFixture : emptyFixture);
  await installHarness(page);
  if (scenario === 'ready') await captureRootRefs(page);

  await executeCandidate(page, mode, bundle);
  await settle(page);

  let preRecovery = null;
  if (scenario === 'late') {
    await lateInsertFixture(page);
    await captureRootRefs(page);
    await settle(page);
    preRecovery = await page.evaluate(() => ({
      dashboardIntro: document.querySelectorAll('#student-dashboard .v39-dashboard-intro').length,
      assignmentsIntro: document.querySelectorAll('#student-assignments .v39-assignments-intro').length,
      dashboardLabels: document.querySelectorAll('#student-dashboard .v39-section-label').length,
      assignmentLabels: document.querySelectorAll('#student-assignments .v39-section-label').length,
      dashboardInitialEnhanced: document.getElementById('dash-empty')?.classList.contains('v39-empty-enhanced') || false,
      assignmentInitialEnhanced: document.getElementById('assignment-empty')?.classList.contains('v39-empty-enhanced') || false,
      observers: window.__phase7bk.observerStats.constructed,
      dashboardStyle: document.querySelectorAll('#v39-dashboard-polish-style').length,
      stateStyle: document.querySelectorAll('#v39-state-polish-style').length,
    }));

    await executeCandidate(page, mode, bundle);
    await settle(page);
  }

  await mutateObservedRoots(page);

  if (scenario === 'ready') {
    await executeCandidate(page, mode, bundle);
    await settle(page);
  }

  const result = await snapshot(page, scenario, preRecovery);
  await page.close();
  return result;
}

async function main() {
  assert.equal(verifyLoaderManifest().length, 99, 'Phase 7B production loader verification must stay green');
  verifyProductionContract();

  for (const source of classicSources) {
    assert.doesNotMatch(source, forbiddenAuthority,
      'V39C/V39D shadow candidate contains forbidden network/storage/Practice/Exam/assignment authority');
  }

  const bundle = await buildProductionIife();
  assert.equal(fs.readFileSync(path.join(ROOT, EXPECTED_OUTPUT), 'utf8'), bundle,
    'V39CD equivalence harness must execute the exact committed production bundle bytes');
  assert.doesNotMatch(bundle, forbiddenAuthority,
    'V39C/V39D production IIFE contains forbidden network/storage/Practice/Exam/assignment authority');

  const browser = await chromium.launch({ headless: true });
  try {
    for (const scenario of ['ready', 'late']) {
      const classic = await runScenario(browser, 'classic', scenario, bundle);
      const production = await runScenario(browser, 'production', scenario, bundle);
      assertFinalContract(classic);
      assertFinalContract(production);
      assert.deepEqual(production, classic,
        `${scenario}: V39C/V39D production IIFE diverged from classic scripts`);
      console.log(`PASS: ${scenario} DOM — classic V39C/V39D scripts and committed production IIFE are structurally equivalent`);
    }
  } finally {
    await browser.close();
  }

  console.log('PASS: Phase 7B-L V39C/V39D production equivalence contract');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
