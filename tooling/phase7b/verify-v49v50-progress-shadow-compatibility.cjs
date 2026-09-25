'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const { ROOT, SOURCES, buildShadowIife, verifyCandidateOrder } = require('./build-v49v50-progress-shadow-iife.cjs');
const { verify: verifyLoaderManifest } = require('./verify-loader-manifest.cjs');

const classicSources = SOURCES.map(source => fs.readFileSync(path.join(ROOT, source), 'utf8'));
const forbiddenAuthority = /\bcloud\s*\.\s*(?:rpc|from)\b|\bfetch\s*\(|\b(?:localStorage|sessionStorage|XMLHttpRequest)\b|\b(?:startPractice|finishPractice|submitAnswer|startExam|publishExam|createAssignment)\b|grade_practice_response|request_practice_hint|submit_practice_session|finalize_exam_attempt|set_student_pin/i;

const progressSources = `
  <div id="student-dashboard-summary">
    <span id="student-progress-practice">4</span>
    <span id="student-progress-exams">1</span>
    <span id="student-progress-topics">3</span>
    <span id="student-progress-last">Today</span>
  </div>
  <section id="v49a-progress-snapshot">Legacy progress snapshot</section>
  <section id="v49c-student-next-steps">Legacy next steps</section>
  <section id="student-progress-strengths">
    <article class="insight-card" data-card="strength">
      <div class="row"><strong>Fractions</strong></div>
      <span class="tag">Secure</span>
      <strong>82%</strong>
      <div class="help">8 scored responses</div>
    </article>
  </section>
  <section id="student-progress-focus">
    <article class="insight-card" data-card="focus">
      <div class="row"><strong>Decimals</strong></div>
      <span class="tag">Needs attention</span>
      <strong class="percent">45%</strong>
      <div class="help evidence">6 scored responses</div>
    </article>
  </section>
  <section id="student-progress-recent">
    <div class="student-insight-activity">
      <strong>Decimals</strong><strong>60%</strong>
      <div class="help">Practice · Mixed</div>
    </div>
    <div class="student-insight-activity">
      <strong>Fractions</strong><strong>80%</strong>
      <div class="help">Practice · Topic</div>
    </div>
  </section>
  <div id="student-motivation-milestone">Decimals improved from 35% to 45%</div>
`;

const readyFixture = `<!doctype html><html><head><title>Math App</title></head><body>
  <button id="my-progress-btn" type="button">My Progress</button>
  <button id="my-assignments-btn" type="button">Assignments</button>
  <section id="student-dashboard">
    <div class="header"><h1>My Progress</h1></div>
    ${progressSources}
  </section>
</body></html>`;

const lateFixture = `<!doctype html><html><head><title>Math App</title></head><body>
  <button id="my-progress-btn" type="button">My Progress</button>
  <button id="my-assignments-btn" type="button">Assignments</button>
  <section id="student-dashboard"><div class="header"><h1>My Progress</h1></div></section>
</body></html>`;

async function installHarness(page) {
  await page.evaluate(() => {
    const NativeMutationObserver = window.MutationObserver;
    const observerStats = { observations: [], callbacks: [] };

    class InstrumentedMutationObserver {
      constructor(callback) {
        const id = observerStats.callbacks.length;
        observerStats.callbacks.push(0);
        this.id = id;
        this.native = new NativeMutationObserver((records, observer) => {
          observerStats.callbacks[id] += 1;
          callback(records, observer);
        });
      }
      observe(target, options) {
        observerStats.observations.push({
          id: this.id,
          target: target.id || target.nodeName,
          childList: Boolean(options.childList),
          subtree: Boolean(options.subtree),
          characterData: Boolean(options.characterData),
          attributes: Boolean(options.attributes),
          attributeFilter: options.attributeFilter ? [...options.attributeFilter] : [],
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

    const counters = {
      fetch: 0,
      rpc: 0,
      from: 0,
      forbiddenAuthority: 0,
      topicDelegation: 0,
      assignmentDelegation: 0,
    };
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

    window.__phase7bn = {
      counters,
      observerStats,
      InstrumentedMutationObserver,
      rootRefs: null,
    };
  });
}

async function captureRootRefs(page) {
  await page.evaluate(() => {
    const ids = [
      'student-dashboard',
      'student-dashboard-summary',
      'v49a-progress-snapshot',
      'v49c-student-next-steps',
      'student-progress-strengths',
      'student-progress-focus',
      'student-progress-recent',
      'student-motivation-milestone',
    ];
    window.__phase7bn.rootRefs = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
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

async function settle(page, milliseconds = 180) {
  await page.evaluate(ms => new Promise(resolve => setTimeout(resolve, ms)), milliseconds);
}

async function installDelegationCounters(page) {
  await page.evaluate(() => {
    const focusButton = document.querySelector('#student-progress-focus .v49b-topic-open');
    if (focusButton && !focusButton.dataset.phase7bnCounted) {
      focusButton.dataset.phase7bnCounted = '1';
      focusButton.addEventListener('click', () => { window.__phase7bn.counters.topicDelegation += 1; });
    }
    const assignments = document.getElementById('my-assignments-btn');
    if (assignments && !assignments.dataset.phase7bnCounted) {
      assignments.dataset.phase7bnCounted = '1';
      assignments.addEventListener('click', () => { window.__phase7bn.counters.assignmentDelegation += 1; });
    }
  });
}

async function exerciseInteractions(page) {
  await installDelegationCounters(page);

  await page.locator('#v50-primary-action').click();
  await page.locator('#v50-check-assignments').click();
  await settle(page);

  await page.evaluate(() => {
    document.querySelector('#student-progress-focus .tag').textContent = 'Developing';
    document.querySelector('#student-progress-focus .percent').textContent = '55%';
    document.querySelector('#student-progress-focus .evidence').textContent = '7 scored responses';
    document.getElementById('student-motivation-milestone').textContent = 'Decimals improved from 35% to 55%';
  });
  await settle(page);

  await page.evaluate(() => {
    const deadline = document.createElement('section');
    deadline.id = 'v48b-student-deadline-summary';
    deadline.innerHTML = '<span class="tag">1 outstanding</span><span class="tag">1 overdue</span><span class="tag">0 due today</span><span class="tag">0 due soon</span>';
    document.getElementById('student-dashboard').appendChild(deadline);
    window.dispatchEvent(new Event('math-practice-assignments-changed'));
  });
  await settle(page);

  await page.locator('#v50-primary-action').click();
  await settle(page);
}

async function lateInsertSourcesAndRecover(page) {
  await page.evaluate(html => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const dashboard = document.getElementById('student-dashboard');
    while (wrapper.firstChild) dashboard.appendChild(wrapper.firstChild);
  }, progressSources);
  await captureRootRefs(page);
  await page.locator('#my-progress-btn').click();
  await settle(page, 520);
}

async function repeatCandidate(page, mode, bundle) {
  await executeCandidate(page, mode, bundle);
  await settle(page);
}

async function snapshot(page, scenario, preRecovery) {
  return page.evaluate(({ scenarioName, preRecoveryState }) => {
    const state = window.__phase7bn;
    const refs = state.rootRefs;
    const same = id => refs ? refs[id] === document.getElementById(id) : null;
    const overview = document.getElementById('v50-student-progress-overview');
    const panel = document.getElementById('v49b-topic-progress-panel');
    const focusCard = document.querySelector('#student-progress-focus .insight-card');
    const strengthCard = document.querySelector('#student-progress-strengths .insight-card');

    return {
      scenario: scenarioName,
      preRecovery: preRecoveryState,
      styles: {
        v49Count: document.querySelectorAll('#v49b-topic-progress-style').length,
        v50Count: document.querySelectorAll('#v50-student-progress-overview-style').length,
        v49Text: document.getElementById('v49b-topic-progress-style')?.textContent || '',
        v50Text: document.getElementById('v50-student-progress-overview-style')?.textContent || '',
      },
      counts: {
        panel: document.querySelectorAll('#v49b-topic-progress-panel').length,
        overview: document.querySelectorAll('#v50-student-progress-overview').length,
        topicActions: document.querySelectorAll('.v49b-topic-open').length,
        focusTopicActions: focusCard?.querySelectorAll('.v49b-topic-open').length || 0,
        strengthTopicActions: strengthCard?.querySelectorAll('.v49b-topic-open').length || 0,
      },
      identity: refs ? {
        dashboard: same('student-dashboard'),
        summary: same('student-dashboard-summary'),
        snapshot: same('v49a-progress-snapshot'),
        nextSteps: same('v49c-student-next-steps'),
        strengths: same('student-progress-strengths'),
        focus: same('student-progress-focus'),
        recent: same('student-progress-recent'),
        milestone: same('student-motivation-milestone'),
      } : null,
      watch: {
        v49Strengths: document.getElementById('student-progress-strengths')?.dataset.v49bTopicWatch || '',
        v49Focus: document.getElementById('student-progress-focus')?.dataset.v49bTopicWatch || '',
        v49Recent: document.getElementById('student-progress-recent')?.dataset.v49bTopicWatch || '',
        v49Milestone: document.getElementById('student-motivation-milestone')?.dataset.v49bTopicWatch || '',
        v50Summary: document.getElementById('student-dashboard-summary')?.dataset.v50OverviewWatch || '',
        v50Strengths: document.getElementById('student-progress-strengths')?.dataset.v50OverviewWatch || '',
        v50Focus: document.getElementById('student-progress-focus')?.dataset.v50OverviewWatch || '',
        v50Recent: document.getElementById('student-progress-recent')?.dataset.v50OverviewWatch || '',
        v50Deadline: document.getElementById('v48b-student-deadline-summary')?.dataset.v50OverviewWatch || '',
      },
      retired: {
        summary: document.getElementById('student-dashboard-summary')?.classList.contains('v50-retired-progress-source') || false,
        snapshot: document.getElementById('v49a-progress-snapshot')?.classList.contains('v50-retired-progress-source') || false,
        nextSteps: document.getElementById('v49c-student-next-steps')?.classList.contains('v50-retired-progress-source') || false,
      },
      overview: {
        afterHeader: overview?.previousElementSibling?.classList.contains('header') || false,
        priorityKind: overview?.querySelector('.v50-primary')?.dataset.kind || '',
        priorityTitle: overview?.querySelector('.v50-primary strong')?.textContent?.trim() || '',
        focusText: overview?.querySelectorAll('.v50-card strong')?.[0]?.textContent?.trim() || '',
        focusDetail: overview?.querySelectorAll('.v50-card .v50-detail')?.[0]?.textContent?.trim() || '',
        strengthText: overview?.querySelectorAll('.v50-card strong')?.[1]?.textContent?.trim() || '',
        practiceText: overview?.querySelectorAll('.v50-card strong')?.[2]?.textContent?.trim() || '',
      },
      panel: {
        visible: Boolean(panel && !panel.classList.contains('hidden')),
        title: panel?.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim() || '',
        state: panel?.querySelectorAll('.v49b-stat strong')?.[0]?.textContent?.trim() || '',
        mastery: panel?.querySelectorAll('.v49b-stat strong')?.[1]?.textContent?.trim() || '',
        evidence: panel?.querySelectorAll('.v49b-stat strong')?.[2]?.textContent?.trim() || '',
        improvement: panel?.querySelector('.v49b-improvement')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      },
      observer: {
        currentIsInstrumented: window.MutationObserver === state.InstrumentedMutationObserver,
        constructed: state.observerStats.callbacks.length,
        observations: state.observerStats.observations,
        callbackObserved: state.observerStats.callbacks.map(count => count > 0),
      },
      counters: { ...state.counters },
    };
  }, { scenarioName: scenario, preRecoveryState: preRecovery });
}

function assertFinalContract(result) {
  assert.equal(result.styles.v49Count, 1);
  assert.equal(result.styles.v50Count, 1);
  assert.match(result.styles.v49Text, /v49b-topic-open/);
  assert.match(result.styles.v50Text, /v50-primary/);

  assert.deepEqual(result.counts, {
    panel: 1,
    overview: 1,
    topicActions: 2,
    focusTopicActions: 1,
    strengthTopicActions: 1,
  });
  assert.deepEqual(result.identity, {
    dashboard: true,
    summary: true,
    snapshot: true,
    nextSteps: true,
    strengths: true,
    focus: true,
    recent: true,
    milestone: true,
  });
  assert.deepEqual(result.watch, {
    v49Strengths: '1',
    v49Focus: '1',
    v49Recent: '1',
    v49Milestone: '1',
    v50Summary: '1',
    v50Strengths: '1',
    v50Focus: '1',
    v50Recent: '1',
    v50Deadline: '1',
  });
  assert.deepEqual(result.retired, { summary: true, snapshot: true, nextSteps: true });

  assert.equal(result.overview.afterHeader, true);
  assert.equal(result.overview.priorityKind, 'urgent');
  assert.equal(result.overview.priorityTitle, 'Finish overdue Practice');
  assert.equal(result.overview.focusText, 'Decimals');
  assert.match(result.overview.focusDetail, /Developing/);
  assert.match(result.overview.focusDetail, /55%/);
  assert.equal(result.overview.strengthText, 'Fractions');
  assert.equal(result.overview.practiceText, '4');

  assert.equal(result.panel.visible, true);
  assert.match(result.panel.title, /Decimals/);
  assert.equal(result.panel.state, 'Developing');
  assert.equal(result.panel.mastery, '55%');
  assert.equal(result.panel.evidence, '7 scored responses');
  assert.match(result.panel.improvement, /35% to 55%/);
  assert.match(result.panel.improvement, /\+20 percentage points/);

  assert.deepEqual(result.counters, {
    fetch: 0,
    rpc: 0,
    from: 0,
    forbiddenAuthority: 0,
    topicDelegation: 1,
    assignmentDelegation: 2,
  });
  assert.equal(result.observer.currentIsInstrumented, true);
  assert.equal(result.observer.constructed, 9,
    'V49/V50 should retain exactly nine guarded observers after deadline discovery and repeated execution');
  assert.deepEqual(
    result.observer.observations.map(row => row.target).sort(),
    [
      'student-dashboard-summary',
      'student-motivation-milestone',
      'student-progress-focus',
      'student-progress-focus',
      'student-progress-recent',
      'student-progress-recent',
      'student-progress-strengths',
      'student-progress-strengths',
      'v48b-student-deadline-summary',
    ].sort(),
  );
  assert(result.observer.callbackObserved.some(Boolean),
    'Expected controlled source mutations to reach V49/V50 observers');

  if (result.scenario === 'ready') {
    assert.equal(result.preRecovery, null);
  } else {
    assert.deepEqual(result.preRecovery, {
      v49Style: 1,
      v50Style: 1,
      panel: 0,
      overview: 1,
      topicActions: 0,
      observers: 0,
    });
  }
}

async function runScenario(browser, mode, scenario, bundle) {
  const page = await browser.newPage();
  await page.setContent(scenario === 'ready' ? readyFixture : lateFixture);
  await installHarness(page);

  if (scenario === 'ready') await captureRootRefs(page);
  await executeCandidate(page, mode, bundle);
  await settle(page);

  let preRecovery = null;
  if (scenario === 'late') {
    preRecovery = await page.evaluate(() => ({
      v49Style: document.querySelectorAll('#v49b-topic-progress-style').length,
      v50Style: document.querySelectorAll('#v50-student-progress-overview-style').length,
      panel: document.querySelectorAll('#v49b-topic-progress-panel').length,
      overview: document.querySelectorAll('#v50-student-progress-overview').length,
      topicActions: document.querySelectorAll('.v49b-topic-open').length,
      observers: window.__phase7bn.observerStats.callbacks.length,
    }));
    await lateInsertSourcesAndRecover(page);
  }

  await exerciseInteractions(page);
  await repeatCandidate(page, mode, bundle);

  const result = await snapshot(page, scenario, preRecovery);
  await page.close();
  return result;
}

async function main() {
  assert.equal(verifyLoaderManifest().length, 98, 'Phase 7B production loader verification must stay green');
  verifyCandidateOrder();

  for (const source of classicSources) {
    assert.doesNotMatch(source, forbiddenAuthority,
      'V49/V50 shadow candidate contains forbidden network/storage/Practice/Exam/assignment authority');
  }

  const bundle = await buildShadowIife();
  assert.doesNotMatch(bundle, forbiddenAuthority,
    'V49/V50 shadow IIFE contains forbidden network/storage/Practice/Exam/assignment authority');

  const browser = await chromium.launch({ headless: true });
  try {
    for (const scenario of ['ready', 'late']) {
      const classic = await runScenario(browser, 'classic', scenario, bundle);
      const shadow = await runScenario(browser, 'shadow', scenario, bundle);
      assertFinalContract(classic);
      assertFinalContract(shadow);
      assert.deepEqual(shadow, classic,
        `${scenario}: V49/V50 shadow IIFE diverged from classic-script behavior`);
      console.log(`PASS: ${scenario} DOM — classic V49/V50 scripts and shadow IIFE are structurally equivalent`);
    }
  } finally {
    await browser.close();
  }

  console.log('PASS: Phase 7B-N V49/V50 progress shadow compatibility contract');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
