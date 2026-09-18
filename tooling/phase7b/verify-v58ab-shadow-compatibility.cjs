'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const { ROOT, SOURCES, buildShadowIife, verifyCandidateOrder } = require('./build-v58ab-shadow-iife.cjs');
const { verify: verifyLoaderManifest } = require('./verify-loader-manifest.cjs');

const classicSources = SOURCES.map(source => fs.readFileSync(path.join(ROOT, source), 'utf8'));
const forbiddenAuthority = /\bcloud\s*\.\s*(?:rpc|from)\b|\bfetch\s*\(|\b(?:localStorage|sessionStorage|XMLHttpRequest)\b|\b(?:finishPractice|submitAnswer|startExam|publishExam|createAssignment)\b|grade_practice_response|request_practice_hint|submit_practice_session|finalize_exam_attempt|set_student_pin/i;

const readyFixture = `<!doctype html><html><head><title>Math App</title></head><body>
  <main id="start" class="active">
    <section class="v40c-session-panel v40c-authenticated"></section>
    <section class="v40-learning-hub-hero"><h2>Welcome back, Alya.</h2></section>
    <section class="v40c3-home-dashboard">
      <article class="v57c-continue-card" data-v57c-kind=""></article>
    </section>
    <section id="v571b-latest-achievement"><span class="v571b-badge" data-badge-id="first_practice"></span></section>
    <select id="strand-filter"><option value="all">All</option><option value="number">Number</option></select>
    <select id="topic-filter"><option value="all">All</option><option value="fractions">Fractions</option></select>
    <select id="question-count"><option value="5">5</option><option value="10">10</option></select>
    <select id="difficulty-filter"><option value="all">All</option><option value="easy">Easy</option></select>
    <button id="start-btn" type="button">Start Practice</button>
    <button class="v40c-open-learn" type="button">Open Learn</button>
    <section class="v40c-learn-setup"></section>
  </main>
  <button id="teacher-btn" type="button">Teacher</button>
  <section id="teacher">
    <div class="header"><h1>Teacher Dashboard</h1><p id="teacher-subtitle">Results and curriculum question bank</p></div>
    <div class="tabs">
      <button class="tab active" data-panel="analytics-panel" type="button">Analytics</button>
      <button class="tab" data-panel="classes-panel" type="button">Classes</button>
      <button class="tab" data-panel="review-panel" type="button">Review</button>
      <button class="tab" data-panel="access-panel" type="button">Access</button>
      <button class="tab" data-panel="teacher-operations-panel" type="button">Operations</button>
      <button class="tab" data-panel="launch-readiness-panel" type="button">Launch</button>
      <button class="tab" data-panel="questions-panel" type="button">Questions</button>
      <button class="tab" data-panel="import-panel" type="button">Import</button>
      <button class="tab" data-panel="report-archive-panel" type="button">Archive</button>
    </div>
    <section id="analytics-panel"><div id="analytics-students-body">Students</div><div class="v42-action-center">Action</div></section>
    <section id="classes-panel"></section><section id="review-panel"></section><section id="access-panel"></section>
    <section id="teacher-operations-panel"></section><section id="launch-readiness-panel"></section>
    <section id="questions-panel"></section><section id="import-panel"></section><section id="report-archive-panel"></section>
    <button id="v56d-open-past-paper-analytics" type="button">Past Paper Analytics</button>
    <button id="v573-open-class-motivation" type="button">Class Motivation</button>
    <button id="v50c1-open-class-report" type="button">Class Report</button>
    <button id="v5763-teacher-feedback-icon" type="button">Feedback</button>
    <button id="v576-feedback-inbox" type="button">Feedback fallback</button>
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
        this.native = new NativeMutationObserver((records, observer) => {
          observerStats.callbackBatches[id] += 1;
          callback(records, observer);
        });
        this.id = id;
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
      value: InstrumentedMutationObserver, writable: true, configurable: true,
    });

    const counters = {
      selectionPrepare: 0,
      startClicks: 0,
      learnClicks: 0,
      selectChanges: 0,
      analyticsClicks: 0,
      feedbackClicks: 0,
      scrolls: 0,
      fetch: 0,
      rpc: 0,
      from: 0,
      forbiddenAuthority: 0,
    };
    window.__phase7bh = { counters, observerStats, InstrumentedMutationObserver };
    window.activeStudentAccess = { student_name: 'Alya' };
    window.V561PracticeFirstStudentExperience = Object.freeze({
      ensurePracticeSelection() { counters.selectionPrepare += 1; },
    });
    window.fetch = () => { counters.fetch += 1; throw new Error('Unexpected fetch'); };
    window.cloud = Object.freeze({
      rpc() { counters.rpc += 1; throw new Error('Unexpected cloud.rpc'); },
      from() { counters.from += 1; throw new Error('Unexpected cloud.from'); },
    });
    for (const name of ['finishPractice', 'submitAnswer', 'startExam', 'publishExam', 'createAssignment']) {
      window[name] = () => { counters.forbiddenAuthority += 1; throw new Error(`Unexpected ${name}`); };
    }
    Element.prototype.scrollIntoView = function scrollIntoView() { counters.scrolls += 1; };
  });
}

async function attachFixtureCounters(page) {
  await page.evaluate(() => {
    const counters = window.__phase7bh.counters;
    for (const id of ['strand-filter','topic-filter','question-count','difficulty-filter']) {
      const node = document.getElementById(id);
      if (node && !node.dataset.phase7bhCounter) {
        node.dataset.phase7bhCounter = '1';
        node.addEventListener('change', () => { counters.selectChanges += 1; });
      }
    }
    const start = document.getElementById('start-btn');
    if (start && !start.dataset.phase7bhCounter) {
      start.dataset.phase7bhCounter = '1';
      start.addEventListener('click', () => { counters.startClicks += 1; });
    }
    const learn = document.querySelector('.v40c-open-learn');
    if (learn && !learn.dataset.phase7bhCounter) {
      learn.dataset.phase7bhCounter = '1';
      learn.addEventListener('click', () => { counters.learnClicks += 1; });
    }
    const analytics = document.querySelector('#teacher .tab[data-panel="analytics-panel"]');
    if (analytics && !analytics.dataset.phase7bhCounter) {
      analytics.dataset.phase7bhCounter = '1';
      analytics.addEventListener('click', () => { counters.analyticsClicks += 1; });
    }
    const feedback = document.getElementById('v5763-teacher-feedback-icon');
    if (feedback && !feedback.dataset.phase7bhCounter) {
      feedback.dataset.phase7bhCounter = '1';
      feedback.addEventListener('click', () => { counters.feedbackClicks += 1; });
    }
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

async function settle(page, milliseconds = 220) {
  await page.evaluate(ms => new Promise(resolve => queueMicrotask(() => setTimeout(resolve, ms))), milliseconds);
}

async function exercise(page) {
  return page.evaluate(async () => {
    const card = document.getElementById('v58a-first-use-card');
    card.querySelector('.v58a-start').click();
    await new Promise(resolve => setTimeout(resolve, 25));

    const badge = document.querySelector('#v571b-latest-achievement .v571b-badge[data-badge-id="first_practice"]');
    badge.classList.add('earned');
    window.dispatchEvent(new Event('v571b:achievements-updated'));
    await new Promise(resolve => setTimeout(resolve, 90));
    const hiddenAfterEarned = !document.getElementById('v58a-first-use-card');

    badge.classList.remove('earned');
    const anchor = document.querySelector('.v57c-continue-card');
    anchor.dataset.v57cKind = 'assignment';
    window.dispatchEvent(new Event('v57c:home-updated'));
    await new Promise(resolve => setTimeout(resolve, 90));
    const hiddenForAssignment = !document.getElementById('v58a-first-use-card');

    anchor.dataset.v57cKind = '';
    window.V58AStudentFirstUseExperience.render();
    const restoredCard = document.getElementById('v58a-first-use-card');

    const originalStart = document.getElementById('start-btn');
    originalStart.remove();
    restoredCard.querySelector('.v58a-start').click();
    await new Promise(resolve => setTimeout(resolve, 25));
    document.getElementById('start').appendChild(originalStart);

    const workspace = document.getElementById('v58b-teacher-workspace');
    workspace.querySelector('[data-v58b-tool="analytics"]').click();
    workspace.querySelector('[data-v58b-tool="feedback"]').click();
    workspace.querySelector('[data-v58b-tool="student-reports"]').click();
    await new Promise(resolve => setTimeout(resolve, 150));

    return {
      hiddenAfterEarned,
      hiddenForAssignment,
      values: {
        strand: document.getElementById('strand-filter').value,
        topic: document.getElementById('topic-filter').value,
        count: document.getElementById('question-count').value,
        difficulty: document.getElementById('difficulty-filter').value,
      },
      status: document.getElementById('v58b-teacher-workspace-status')?.textContent || '',
    };
  });
}

async function snapshot(page, scenario, early, exercised) {
  return page.evaluate(({ scenarioName, earlyState, exerciseResult }) => {
    function descriptor(name) {
      const d = Object.getOwnPropertyDescriptor(window, name);
      return d && {
        writable: d.writable,
        configurable: d.configurable,
        enumerable: d.enumerable,
        frozen: Object.isFrozen(d.value),
        keys: Object.keys(d.value).sort(),
      };
    }
    const card = document.getElementById('v58a-first-use-card');
    const workspace = document.getElementById('v58b-teacher-workspace');
    const tabs = document.querySelector('#teacher > .tabs');
    const state = window.__phase7bh;
    return {
      scenario: scenarioName,
      early: earlyState,
      markers: {
        v58a: window.__v58aStudentFirstUseExperienceInstalled,
        v58b: window.__v58bTeacherWorkspaceInstalled,
      },
      descriptors: {
        v58a: descriptor('V58AStudentFirstUseExperience'),
        v58b: descriptor('V58BTeacherWorkspaceConsolidation'),
      },
      counts: {
        v58aStyle: document.querySelectorAll('#v58a-first-use-style').length,
        v58aCard: document.querySelectorAll('#v58a-first-use-card').length,
        v58bStyle: document.querySelectorAll('#v58b-teacher-workspace-style').length,
        workspace: document.querySelectorAll('#v58b-teacher-workspace').length,
        allToolsLabel: document.querySelectorAll('#v58b-all-tools-label').length,
        groups: workspace?.querySelectorAll('[data-v58b-group]').length || 0,
        tools: workspace?.querySelectorAll('[data-v58b-tool]').length || 0,
      },
      v58a: {
        cardHidden: card?.classList.contains('hidden') ?? null,
        heading: card?.querySelector('h2')?.textContent || null,
        buttonBound: card?.querySelector('.v58a-start')?.dataset.v58aBound || null,
        eligible: window.V58AStudentFirstUseExperience.eligible(),
        priorityKind: window.V58AStudentFirstUseExperience.priorityKind(),
        firstPracticeState: window.V58AStudentFirstUseExperience.firstPracticeState(),
      },
      v58b: {
        open: workspace?.open ?? null,
        previous: workspace?.previousElementSibling?.className || workspace?.previousElementSibling?.id || null,
        labelNext: document.getElementById('v58b-all-tools-label')?.nextElementSibling === tabs,
        tabsClass: tabs?.className || null,
        subtitle: document.getElementById('teacher-subtitle')?.textContent || null,
        groupKeys: [...(workspace?.querySelectorAll('[data-v58b-group]') || [])].map(node => node.dataset.v58bGroup),
        toolKeys: [...(workspace?.querySelectorAll('[data-v58b-tool]') || [])].map(node => node.dataset.v58bTool),
      },
      exercise: exerciseResult,
      counters: { ...state.counters },
      observer: {
        currentIsInstrumented: window.MutationObserver === state.InstrumentedMutationObserver,
        constructed: state.observerStats.constructed,
        observations: state.observerStats.observations,
        callbackBatches: state.observerStats.callbackBatches,
      },
    };
  }, { scenarioName: scenario, earlyState: early, exerciseResult: exercised });
}

function assertContract(result) {
  assert.deepEqual(result.markers, { v58a: true, v58b: true });
  assert.deepEqual(result.descriptors.v58a, {
    writable: false, configurable: false, enumerable: false, frozen: true,
    keys: ['BADGE_SELECTOR','BLOCKING_PRIORITIES','CARD_ID','configureFirstPractice','eligible','firstPracticeState','priorityKind','render'],
  });
  assert.deepEqual(result.descriptors.v58b, {
    writable: false, configurable: false, enumerable: false, frozen: true,
    keys: ['GROUPS','WORKSPACE_ID','ensureWorkspace','invokeTool','openPanel','refreshAvailability','toolByKey','toolReady'],
  });
  assert.deepEqual(result.counts, {
    v58aStyle: 1, v58aCard: 1, v58bStyle: 1, workspace: 1, allToolsLabel: 1, groups: 5, tools: 15,
  });
  assert.equal(result.v58a.cardHidden, false);
  assert.equal(result.v58a.heading, 'Welcome, Alya! Ready for 5 quick questions?');
  assert.equal(result.v58a.buttonBound, 'true');
  assert.equal(result.v58a.eligible, true);
  assert.equal(result.v58a.priorityKind, '');
  assert.equal(result.v58a.firstPracticeState, 'not_earned');

  assert.equal(result.v58b.open, true);
  assert.equal(result.v58b.previous, 'header');
  assert.equal(result.v58b.labelNext, true);
  assert.match(result.v58b.tabsClass, /v58b-all-tools-tabs/);
  assert.equal(result.v58b.subtitle, 'Plan, monitor, support and manage learning in one workspace.');
  assert.deepEqual(result.v58b.groupKeys, ['monitor','teach','students','content','reports-support']);
  assert.deepEqual(result.v58b.toolKeys, [
    'analytics','action-center','past-paper-analytics',
    'assignments','review','motivation',
    'student-access','operations','launch-readiness',
    'question-bank','bulk-import',
    'class-report','student-reports','report-archive','feedback',
  ]);

  assert.equal(result.exercise.hiddenAfterEarned, true);
  assert.equal(result.exercise.hiddenForAssignment, true);
  assert.deepEqual(result.exercise.values, { strand: 'all', topic: 'all', count: '5', difficulty: 'all' });
  assert.equal(result.exercise.status,
    'Choose a student in Analytics, then open the existing Student report from that learner profile.');

  assert.equal(result.counters.selectionPrepare, 2);
  assert.equal(result.counters.startClicks, 1);
  assert.equal(result.counters.learnClicks, 1);
  assert.equal(result.counters.selectChanges, 8);
  assert.equal(result.counters.analyticsClicks, 2);
  assert.equal(result.counters.feedbackClicks, 1);
  assert(result.counters.scrolls >= 3, 'Expected Analytics/student-report scrolling delegation');
  assert.deepEqual(
    { fetch: result.counters.fetch, rpc: result.counters.rpc, from: result.counters.from, forbiddenAuthority: result.counters.forbiddenAuthority },
    { fetch: 0, rpc: 0, from: 0, forbiddenAuthority: 0 },
  );

  assert.equal(result.observer.currentIsInstrumented, true);
  if (result.scenario === 'ready') {
    assert.equal(result.observer.constructed, 1);
    assert.deepEqual(result.observer.observations, [
      { id: 0, target: 'teacher', childList: true, subtree: true },
    ]);
    assert((result.observer.callbackBatches[0] || 0) > 0, 'V58B observer should receive callbacks in ready-DOM scenario');
    assert.equal(result.early, null);
  } else {
    assert.equal(result.observer.constructed, 0);
    assert.deepEqual(result.observer.observations, []);
    assert.deepEqual(result.early, {
      v58aStyle: 1, v58aCard: 0, v58bStyle: 1, workspace: 0,
    });
  }
}

async function runScenario(browser, mode, scenario, bundle) {
  const page = await browser.newPage();
  await page.setContent(scenario === 'ready' ? readyFixture : emptyFixture);
  await installHarness(page);
  if (scenario === 'ready') await attachFixtureCounters(page);
  await executeCandidate(page, mode, bundle);
  await settle(page);

  let early = null;
  if (scenario === 'late') {
    early = await page.evaluate(() => ({
      v58aStyle: document.querySelectorAll('#v58a-first-use-style').length,
      v58aCard: document.querySelectorAll('#v58a-first-use-card').length,
      v58bStyle: document.querySelectorAll('#v58b-teacher-workspace-style').length,
      workspace: document.querySelectorAll('#v58b-teacher-workspace').length,
    }));
    await page.evaluate(html => {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      document.body.append(...parsed.body.childNodes);
      window.dispatchEvent(new Event('v57c:home-updated'));
      window.dispatchEvent(new Event('pageshow'));
    }, readyFixture);
    await attachFixtureCounters(page);
    await settle(page);
  }

  const exercised = await exercise(page);
  await executeCandidate(page, mode, bundle);
  await page.evaluate(() => {
    window.V58AStudentFirstUseExperience.render();
    window.V58BTeacherWorkspaceConsolidation.ensureWorkspace();
    window.V58BTeacherWorkspaceConsolidation.refreshAvailability();
    window.dispatchEvent(new Event('pageshow'));
  });
  await settle(page);

  const result = await snapshot(page, scenario, early, exercised);
  await page.close();
  return result;
}

async function main() {
  assert.equal(verifyLoaderManifest().length, 88, 'Phase 7B production loader verification must stay green');
  verifyCandidateOrder();
  for (const source of classicSources) {
    assert.doesNotMatch(source, forbiddenAuthority,
      'V58A/V58B shadow candidate contains forbidden network/storage/learning/Exam/assignment authority');
  }
  const bundle = await buildShadowIife();
  assert.doesNotMatch(bundle, forbiddenAuthority,
    'V58A/V58B shadow IIFE contains forbidden network/storage/learning/Exam/assignment authority');

  const browser = await chromium.launch({ headless: true });
  try {
    for (const scenario of ['ready', 'late']) {
      const classic = await runScenario(browser, 'classic', scenario, bundle);
      const shadow = await runScenario(browser, 'shadow', scenario, bundle);
      assertContract(classic);
      assertContract(shadow);
      assert.deepEqual(shadow, classic, `${scenario}: V58A/V58B shadow IIFE diverged from classic scripts`);
      console.log(`PASS: ${scenario} DOM — classic V58A/V58B scripts and shadow IIFE are structurally equivalent`);
    }
  } finally {
    await browser.close();
  }

  console.log('PASS: Phase 7B-H V58A/V58B shadow compatibility contract');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
