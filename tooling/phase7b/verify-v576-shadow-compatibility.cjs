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
} = require('./build-v576-production-bundle.cjs');
const { forbiddenAuthority } = require('./verify-v576-production-bundle.cjs');
const { verify: verifyLoaderManifest } = require('./verify-loader-manifest.cjs');

const classicSources = EXPECTED_INPUTS.map(source => fs.readFileSync(path.join(ROOT, source), 'utf8'));

const fixture = `<!doctype html><html><head></head><body>
  <main id="start"><section class="v40-learning-hub-hero"><div id="student-source-host"><button id="v576-send-feedback">Original student feedback</button></div></section></main>
  <button id="teacher-btn">Teacher</button>
  <section id="teacher"><header class="header"><h2>Teacher Dashboard</h2><div class="toolbar">
    <button id="teacher-mode">Mode</button><button id="refresh-btn">Refresh</button>
    <div id="teacher-source-host"><button id="v576-feedback-inbox">Original Inbox</button></div>
    <button class="back-home">Home</button><button id="change-password-btn">Password</button><button id="signout-btn">Sign out</button>
  </div></header></section>
</body></html>`;

const emptyFixture = '<!doctype html><html><head></head><body></body></html>';

async function installHarness(page) {
  await page.evaluate(() => {
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
      studentSource: 0, teacherSource: 0, studentFallback: 0, teacherFallback: 0,
      fetch: 0, rpc: 0, from: 0, forbiddenAuthority: 0,
    };
    window.__phase7bc = { counters, observerStats, instrumentedObserver: InstrumentedMutationObserver };
    window.fetch = () => { counters.fetch += 1; throw new Error('Unexpected fetch'); };
    window.cloud = Object.freeze({
      rpc() { counters.rpc += 1; throw new Error('Unexpected cloud.rpc'); },
      from() { counters.from += 1; throw new Error('Unexpected cloud.from'); },
    });
    for (const name of ['startPractice', 'finishPractice', 'submitAnswer', 'startExam', 'publishExam', 'createAssignment']) {
      window[name] = () => { counters.forbiddenAuthority += 1; throw new Error(`Unexpected ${name}`); };
    }
    window.V576ClassroomFeedbackSupport = Object.freeze({
      openStudentFeedback() { counters.studentFallback += 1; },
      openTeacherFeedback() { counters.teacherFallback += 1; },
    });
  });
}

async function attachSourceCounters(page) {
  await page.evaluate(() => {
    const state = window.__phase7bc;
    const student = document.getElementById('v576-send-feedback');
    const teacher = document.getElementById('v576-feedback-inbox');
    if (student && !student.dataset.phase7bcCounter) {
      student.dataset.phase7bcCounter = '1';
      student.addEventListener('click', () => { state.counters.studentSource += 1; });
    }
    if (teacher && !teacher.dataset.phase7bcCounter) {
      teacher.dataset.phase7bcCounter = '1';
      teacher.addEventListener('click', () => { state.counters.teacherSource += 1; });
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

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => queueMicrotask(() => setTimeout(resolve, 140))));
}

async function exerciseDelegation(page) {
  return page.evaluate(() => {
    const studentIcon = document.getElementById('v5761-feedback-icon');
    const teacherIcon = document.getElementById('v5763-teacher-feedback-icon');
    studentIcon.click();
    teacherIcon.click();

    const studentSource = document.getElementById('v576-send-feedback');
    const teacherSource = document.getElementById('v576-feedback-inbox');
    const studentParent = studentSource.parentElement;
    const teacherParent = teacherSource.parentElement;
    studentSource.remove();
    studentIcon.click();
    studentParent.appendChild(studentSource);
    teacherSource.remove();
    teacherIcon.click();
    teacherParent.appendChild(teacherSource);

    window.V5761FeedbackTriggerPosition.positionTrigger();
    window.V5763TeacherFeedbackHeaderIcon.positionTeacherTrigger();
    return { ...window.__phase7bc.counters };
  });
}

async function snapshot(page, early = null) {
  return page.evaluate(earlyState => {
    const descriptor = name => {
      const value = Object.getOwnPropertyDescriptor(window, name);
      return value && {
        writable: value.writable, configurable: value.configurable, enumerable: value.enumerable,
        frozen: Object.isFrozen(value.value), functions: Object.keys(value.value).sort(),
      };
    };
    const icon = id => {
      const node = document.getElementById(id);
      return node && {
        count: document.querySelectorAll(`#${id}`).length,
        parent: node.parentElement?.id || node.parentElement?.className || null,
        className: node.className,
        type: node.type,
        text: node.textContent,
        html: node.innerHTML,
        ariaLabel: node.getAttribute('aria-label'),
        title: node.getAttribute('title'),
      };
    };
    const children = id => [...(document.getElementById(id)?.children || [])]
      .map(node => node.id || node.className || node.nodeName);
    const source = id => {
      const node = document.getElementById(id);
      return node && {
        count: document.querySelectorAll(`#${id}`).length,
        parent: node.parentElement?.id || node.parentElement?.className || null,
        className: node.className,
      };
    };
    const state = window.__phase7bc;
    return {
      early: earlyState,
      markers: {
        student: window.__v5761FeedbackTriggerPositionInstalled,
        teacher: window.__v5763TeacherFeedbackHeaderIconInstalled,
      },
      descriptors: {
        student: descriptor('V5761FeedbackTriggerPosition'),
        teacher: descriptor('V5763TeacherFeedbackHeaderIcon'),
      },
      styles: ['v5761-feedback-trigger-position-style', 'v5763-teacher-feedback-header-icon-style'].map(id => ({
        id, count: document.querySelectorAll(`#${id}`).length,
        text: document.getElementById(id)?.textContent || null,
      })),
      hosts: {
        hero: document.querySelector('#start .v40-learning-hub-hero')?.className || null,
        header: document.querySelector('#teacher > .header')?.className || null,
        toolbar: document.querySelector('#teacher > .header > .toolbar')?.className || null,
      },
      sources: {
        student: source('v576-send-feedback'), teacher: source('v576-feedback-inbox'),
      },
      icons: {
        student: icon('v5761-feedback-icon'), teacher: icon('v5763-teacher-feedback-icon'),
      },
      groups: {
        primaryCount: document.querySelectorAll('#v5763-teacher-primary-actions').length,
        accountCount: document.querySelectorAll('#v5763-teacher-account-actions').length,
        primary: children('v5763-teacher-primary-actions'),
        account: children('v5763-teacher-account-actions'),
        toolbar: [...(document.querySelector('#teacher > .header > .toolbar')?.children || [])]
          .map(node => node.id || node.className || node.nodeName),
      },
      counters: { ...state.counters },
      observer: {
        currentIsInstrumented: window.MutationObserver === state.instrumentedObserver,
        constructed: state.observerStats.constructed,
        observations: state.observerStats.observations,
        callbacks: state.observerStats.callbacks,
      },
    };
  }, early);
}

function assertContract(result, scenario) {
  assert.deepEqual(result.markers, { student: true, teacher: true });
  assert.deepEqual(result.descriptors.student, {
    writable: false, configurable: false, enumerable: false, frozen: true, functions: ['positionTrigger'],
  });
  assert.deepEqual(result.descriptors.teacher, {
    writable: false, configurable: false, enumerable: false, frozen: true,
    functions: ['organizeToolbar', 'positionTeacherTrigger'],
  });
  assert.deepEqual(result.styles.map(style => [style.id, style.count]), [
    ['v5761-feedback-trigger-position-style', 1], ['v5763-teacher-feedback-header-icon-style', 1],
  ]);
  assert.equal(result.icons.student.count, 1);
  assert.equal(result.icons.teacher.count, 1);
  assert.equal(result.icons.student.ariaLabel, 'Send feedback');
  assert.equal(result.icons.teacher.ariaLabel, 'Feedback Inbox');
  assert.equal(result.sources.student.parent, 'student-source-host');
  assert.equal(result.sources.teacher.parent, 'teacher-source-host');
  assert.match(result.sources.student.className, /v5761-feedback-source/);
  assert.match(result.sources.teacher.className, /v5763-feedback-source/);
  assert.match(result.hosts.hero, /v5761-feedback-host/);
  assert.match(result.hosts.header, /v5763-teacher-header/);
  assert.match(result.hosts.toolbar, /v5763-teacher-toolbar/);
  assert.deepEqual(result.groups.primary, ['teacher-mode', 'refresh-btn', 'v5763-teacher-feedback-icon', 'back-home']);
  assert.deepEqual(result.groups.account, ['change-password-btn', 'signout-btn']);
  assert.equal(result.groups.primaryCount, 1);
  assert.equal(result.groups.accountCount, 1);
  assert.deepEqual(result.counters, {
    studentSource: 1, teacherSource: 1, studentFallback: 1, teacherFallback: 1,
    fetch: 0, rpc: 0, from: 0, forbiddenAuthority: 0,
  });
  assert.equal(result.observer.currentIsInstrumented, true);
  assert.equal(result.observer.constructed, 2);
  assert.deepEqual(result.observer.observations, [
    { id: 0, target: 'BODY', options: { childList: true, subtree: true } },
    { id: 1, target: 'BODY', options: { childList: true, subtree: true } },
  ]);
  assert(result.observer.callbacks.every(callbacks => callbacks.length > 0), 'Both observers must receive callbacks');
  if (scenario === 'late') {
    assert.deepEqual(result.early, { studentIcons: 0, teacherIcons: 0 });
  }
}

async function runScenario(browser, mode, scenario, bundle) {
  const page = await browser.newPage();
  await page.setContent(scenario === 'late' ? emptyFixture : fixture);
  await installHarness(page);
  if (scenario === 'ready') await attachSourceCounters(page);
  await executeCandidate(page, mode, bundle);
  await settle(page);
  let early = null;
  if (scenario === 'late') {
    early = await page.evaluate(() => ({
      studentIcons: document.querySelectorAll('#v5761-feedback-icon').length,
      teacherIcons: document.querySelectorAll('#v5763-teacher-feedback-icon').length,
    }));
    await page.evaluate(html => {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      document.body.append(...parsed.body.childNodes);
      window.dispatchEvent(new Event('v57c:home-updated'));
      window.dispatchEvent(new Event('pageshow'));
    }, fixture);
    await attachSourceCounters(page);
    await settle(page);
  }
  await exerciseDelegation(page);
  await executeCandidate(page, mode, bundle);
  await page.evaluate(() => {
    window.V5761FeedbackTriggerPosition.positionTrigger();
    window.V5763TeacherFeedbackHeaderIcon.organizeToolbar();
    window.V5763TeacherFeedbackHeaderIcon.positionTeacherTrigger();
    window.dispatchEvent(new Event('v57c:home-updated'));
    window.dispatchEvent(new Event('pageshow'));
  });
  await settle(page);
  const result = await snapshot(page, early);
  await page.close();
  return result;
}

async function main() {
  assert.equal(verifyLoaderManifest().length, 98, 'Phase 7B production loader verification must stay green');
  for (const source of classicSources) {
    assert.doesNotMatch(source, forbiddenAuthority, 'Candidate source contains forbidden runtime authority');
  }
  const bundle = await buildProductionIife();
  assert.equal(fs.readFileSync(path.join(ROOT, EXPECTED_OUTPUT), 'utf8'), bundle,
    'Equivalence harness must execute the exact committed production bundle bytes');
  assert.doesNotMatch(bundle, forbiddenAuthority, 'Shadow bundle contains forbidden runtime authority');
  const browser = await chromium.launch({ headless: true });
  try {
    for (const scenario of ['ready', 'late']) {
      const classic = await runScenario(browser, 'classic', scenario, bundle);
      const production = await runScenario(browser, 'production', scenario, bundle);
      assertContract(classic, scenario);
      assertContract(production, scenario);
      assert.deepEqual(production, classic, `${scenario}: production IIFE diverged from classic sources`);
      console.log(`PASS: ${scenario} DOM — classic sources and committed production IIFE are structurally equivalent`);
    }
  } finally {
    await browser.close();
  }
  console.log('PASS: Phase 7B-D V576 production equivalence contract (10 invariant groups)');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
