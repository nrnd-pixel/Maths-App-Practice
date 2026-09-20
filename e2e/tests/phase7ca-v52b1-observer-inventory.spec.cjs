'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const SITE = path.join(ROOT, 'site');
const read = name => fs.readFileSync(path.join(SITE, name), 'utf8');

const gateSource = read('v52b1-question-bank-observer-gate.js');
const loaderSource = read('v40-release.js');
const performanceSource = read('v52b1-question-bank-performance.js');

const EXPECTED_SUPPRESSED_OWNERS = Object.freeze([]);

function indexOfLoader(name) {
  const index = loaderSource.indexOf(name);
  expect(index, `${name} must remain in the tier-2 production loader`).toBeGreaterThanOrEqual(0);
  return index;
}

function occurrences(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

test.describe('Phase 7C-A — frozen V52B1 suppressed-observer inventory', () => {
  test('inventory ownership and production order remain exact', async () => {
    const gateIndex = indexOfLoader('v52b1-question-bank-observer-gate.js?v=52b1-2');
    const performanceIndex = indexOfLoader('v52b1-question-bank-performance.js?v=52b1-3');

    expect(indexOfLoader('v52-topical-exercise-foundation.js?v=52a-1')).toBeLessThan(gateIndex);

    for (const owner of EXPECTED_SUPPRESSED_OWNERS) {
      const ownerIndex = indexOfLoader(owner.file);
      expect(ownerIndex, `${owner.file} must load after the gate`).toBeGreaterThan(gateIndex);
      expect(ownerIndex, `${owner.file} must load before the performance coordinator`).toBeLessThan(performanceIndex);
    }

    const selection = read('question-bank-selection-qa.js');
    expect(selection).toContain('__v51QuestionBankQaRenderWrapped');
    expect(selection).toContain('__v51QuestionBankBulkStatusRenderWrapped');
    expect(occurrences(selection, /MutationObserver/g)).toBe(0);
    expect(selection).not.toContain('observer.observe(cards,{childList:true})');

    const topicalGuard = read('v52-topical-activation-guard.js');
    expect(occurrences(topicalGuard, /MutationObserver/g)).toBe(0);
    expect(topicalGuard).toContain('function scheduleDecorate()');
    expect(topicalGuard).toContain('window.requestAnimationFrame(decorate)');
    expect(topicalGuard).toContain("event.target?.matches?.('.v51b2a-select')");
    expect(topicalGuard).toContain('V52TopicalActivationGuard');

    const metadataReview = read('question-bank-metadata-review.js');
    expect(metadataReview).toContain('__v51QuestionReviewRenderWrapped');
    expect(occurrences(metadataReview, /new MutationObserver/g)).toBe(1);
    expect(metadataReview).not.toContain("const cards = document.getElementById('questions-cards')");
    expect(metadataReview).not.toContain('observer.observe(cards,{childList:true})');
    expect(metadataReview).toContain("if (b2aSummary && typeof MutationObserver !== 'undefined')");
    expect(metadataReview).toContain('observe(b2aSummary,{childList:true,characterData:true,subtree:true})');
    expect(metadataReview).toContain('V51QuestionReviewWorkflow');

    const topicalLibrary = read('v52-teacher-topical-library.js');
    expect(topicalLibrary).toContain('__v52bTopicalLibraryRenderWrapped');
    expect(occurrences(topicalLibrary, /MutationObserver/g)).toBe(0);
    expect(topicalLibrary).toContain('ROOT.requestAnimationFrame?.(()=>{render();applyFocusedCards();})');
    expect(topicalLibrary).toContain('V52TeacherTopicalLibrary');

    const multipart = read('question-bank-audit-multipart.js');
    expect(multipart).toContain('function renderSelectionState()');
    expect(multipart).toContain('function bind()');
    expect(multipart).toContain('function refreshLifecycle()');
    expect(occurrences(multipart, /new MutationObserver/g)).toBe(0);
    expect(multipart).not.toContain('function installObserver()');
    expect(multipart).not.toContain('observer.observe(document.body');
    expect(multipart).not.toContain("const cards=document.getElementById('questions-cards')");
    expect(multipart).not.toContain('new MutationObserver(()=>window.requestAnimationFrame(renderGroup))');
    expect(multipart).toContain("if (event.target?.classList?.contains('v51b2a-select')) { promptDirty=false; clearFeedback(); window.requestAnimationFrame(renderGroup); }");
    expect(multipart).toContain('V51MultipartQuestionManagement');
    expect(multipart).toContain('V51QuestionChangeHistory');

    const topicalRoute = read('topical-legacy-student-route.js');
    expect(indexOfLoader('topical-legacy-student-route.js')).toBeGreaterThan(performanceIndex);
    expect(topicalRoute).toContain("const cards=document.getElementById('v52b-cards')");
    expect(topicalRoute).toContain('new MutationObserver(()=>{ decorate(); if (!state.byKey.size) scheduleLoad(false); }).observe(cards,{childList:true})');

    const eligibility = read('practice-eligibility-ui.js');
    expect(indexOfLoader('practice-eligibility-ui.js')).toBeGreaterThan(performanceIndex);
    expect(eligibility).toContain("const cards=document.getElementById('v52b-cards')");
    expect(eligibility).toContain('new MutationObserver(()=>{decorate();if(!state.byKey.size)scheduleLoad(false);}).observe(cards,{childList:true})');

    expect(gateSource).toContain("id === 'questions-cards'");
    expect(gateSource).toContain("id === 'questions-panel'");
    expect(gateSource).toContain('target === document.body');
    expect(gateSource).toContain("source.includes('renderSelectionState')");
    expect(gateSource).toContain("source.includes('bind')");
    expect(gateSource).toContain('__v52b1QuestionBankObserverGateRetired = true');
    expect(gateSource).toContain('suppressionActive:false');
    expect(gateSource).not.toContain('WrappedMutationObserver');
    expect(gateSource).not.toContain('ROOT.MutationObserver =');
    expect(gateSource).not.toContain('nativeObserve');
    expect(gateSource).not.toContain('data-v52b1-observer-gated');

    expect(performanceSource).toContain('captureLegacyRefreshes');
    expect(performanceSource).toContain("name === 'renderSummary'");
    expect(performanceSource).toContain("name === 'renderAll'");
    expect(performanceSource).toContain("source.includes('buildQaContext')");
    expect(performanceSource).toContain("source.includes('buildSetSummaries')");
    expect(performanceSource).toContain('V52TopicalActivationGuard?.decorate?.()');
    expect(performanceSource).toContain('V51MultipartQuestionManagement?.renderGroup?.()');
  });

  test('historical classifications remain observable while every MutationObserver stays native', async ({ page }) => {
    await page.setContent(`<!doctype html><html><body>
      <section id="questions-panel"><div id="questions-cards"></div></section>
      <section id="v52b-cards"></section>
      <section id="unrelated-root"></section>
    </body></html>`);

    await page.evaluate(() => {
      window.__phase7ca = {
        NativeMutationObserver: window.MutationObserver,
        counts: {
          earlyCards: 0,
          gatedCards: 0,
          gatedPanel: 0,
          gatedHistoryBody: 0,
          nativeBody: 0,
          nativeV52bCards: 0,
          nativeUnrelated: 0,
        },
      };

      new window.MutationObserver(() => {
        window.__phase7ca.counts.earlyCards += 1;
      }).observe(document.getElementById('questions-cards'), { childList: true });
    });

    await page.addScriptTag({ content: gateSource });

    const install = await page.evaluate(() => {
      const state = window.__phase7ca;
      const Current = window.MutationObserver;
      const Native = state.NativeMutationObserver;
      const api = window.V52B1QuestionBankObserverGate;
      return {
        nativeIdentity: Current === Native,
        instancePrototype: Current.prototype === Native.prototype,
        installed: window.__v52b1QuestionBankObserverGateInstalled === true,
        retired: window.__v52b1QuestionBankObserverGateRetired === true,
        apiFrozen: Object.isFrozen(api),
        apiRetired: api?.retired === true,
        suppressionActive: api?.suppressionActive === false,
      };
    });

    expect(install).toEqual({
      nativeIdentity: true,
      instancePrototype: true,
      installed: true,
      retired: true,
      apiFrozen: true,
      apiRetired: true,
      suppressionActive: true,
    });

    await page.evaluate(() => {
      const counts = window.__phase7ca.counts;
      const cards = document.getElementById('questions-cards');
      const panel = document.getElementById('questions-panel');
      const v52bCards = document.getElementById('v52b-cards');
      const unrelated = document.getElementById('unrelated-root');

      const bind = () => {};
      const renderSelectionState = () => {};

      new MutationObserver(() => {
        counts.gatedCards += 1;
      }).observe(cards, { childList: true, subtree: true });

      new MutationObserver(() => {
        counts.gatedPanel += 1;
      }).observe(panel, { childList: true, subtree: true });

      function historyCallback() {
        bind();
        renderSelectionState();
        counts.gatedHistoryBody += 1;
      }
      new MutationObserver(historyCallback).observe(document.body, { childList: true, subtree: true });

      new MutationObserver(() => {
        counts.nativeBody += 1;
      }).observe(document.body, { attributes: true, attributeFilter: ['data-phase7ca-native'] });

      new MutationObserver(() => {
        counts.nativeV52bCards += 1;
      }).observe(v52bCards, { childList: true });

      new MutationObserver(() => {
        counts.nativeUnrelated += 1;
      }).observe(unrelated, { childList: true });

      cards.appendChild(document.createElement('span'));
      panel.appendChild(document.createElement('aside'));
      v52bCards.appendChild(document.createElement('i'));
      unrelated.appendChild(document.createElement('em'));
      document.body.dataset.phase7caNative = '1';
    });

    await page.waitForTimeout(80);

    const result = await page.evaluate(() => {
      const api = window.V52B1QuestionBankObserverGate;
      const cards = document.getElementById('questions-cards');
      const panel = document.getElementById('questions-panel');
      const v52bCards = document.getElementById('v52b-cards');
      const bind = () => {};
      const renderSelectionState = () => {};
      function historyCallback() { bind(); renderSelectionState(); }
      function unrelatedBodyCallback() {}

      const beforeSecondInstall = window.MutationObserver;
      return {
        counts: { ...window.__phase7ca.counts },
        markers: {
          cards: cards.dataset.v52b1ObserverGated || '',
          panel: panel.dataset.v52b1ObserverGated || '',
          body: document.body.dataset.v52b1ObserverGated || '',
          v52bCards: v52bCards.dataset.v52b1ObserverGated || '',
        },
        reasons: {
          cards: api.suppressionReason(cards, () => {}),
          panel: api.suppressionReason(panel, () => {}),
          historyBody: api.suppressionReason(document.body, historyCallback),
          unrelatedBody: api.suppressionReason(document.body, unrelatedBodyCallback),
          v52bCards: api.suppressionReason(v52bCards, () => {}),
          unrelatedRoot: api.suppressionReason(document.getElementById('unrelated-root'), () => {}),
        },
      };
    });

    expect(result.counts.earlyCards).toBeGreaterThan(0);
    expect(result.counts.gatedCards).toBeGreaterThan(0);
    expect(result.counts.gatedPanel).toBeGreaterThan(0);
    expect(result.counts.gatedHistoryBody).toBeGreaterThan(0);
    expect(result.counts.nativeBody).toBeGreaterThan(0);
    expect(result.counts.nativeV52bCards).toBeGreaterThan(0);
    expect(result.counts.nativeUnrelated).toBeGreaterThan(0);

    expect(result.markers).toEqual({ cards: '', panel: '', body: '', v52bCards: '' });
    expect(result.reasons).toEqual({
      cards: 'question-card-observer',
      panel: 'question-panel-observer',
      historyBody: 'question-history-body-observer',
      unrelatedBody: '',
      v52bCards: '',
      unrelatedRoot: '',
    });

    await page.evaluate(() => {
      window.__phase7ca.constructorAfterFirstInstall = window.MutationObserver;
    });
    await page.addScriptTag({ content: gateSource });
    const secondInstall = await page.evaluate(() => ({
      sameConstructor: window.MutationObserver === window.__phase7ca.constructorAfterFirstInstall,
      installed: window.__v52b1QuestionBankObserverGateInstalled === true,
      retired: window.__v52b1QuestionBankObserverGateRetired === true,
    }));
    expect(secondInstall).toEqual({ sameConstructor: true, installed: true, retired: true });
  });

  test('gate remains authority-free and the inventory excludes unrelated observers', async () => {
    const forbiddenAuthority = /\bcloud\s*\.\s*(?:rpc|from)\b|\bfetch\s*\(|\b(?:localStorage|sessionStorage|XMLHttpRequest)\b|\b(?:startPractice|finishPractice|submitAnswer|startExam|publishExam|createAssignment)\b|grade_practice_response|request_practice_hint|submit_practice_session|finalize_exam_attempt|set_student_pin/i;
    expect(gateSource).not.toMatch(forbiddenAuthority);

    const unaffected = [
      'v52-topical-exercise-foundation.js',
      'v51-exam-publication-ui-polish.js',
      'student-exam-ui.js',
      'release-audit-ui.js',
      'v52b1-large-import-timeout-recovery.js',
      'topical-legacy-student-route.js',
      'practice-eligibility-ui.js',
    ];

    for (const file of unaffected) {
      const source = read(file);
      expect(source, `${file} should still own unrelated native observer paths`).toContain('MutationObserver');
    }

    expect(EXPECTED_SUPPRESSED_OWNERS.map(row => row.file)).toEqual([]);
  });
});
