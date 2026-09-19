'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const SITE = path.join(ROOT, 'site');
const read = name => fs.readFileSync(path.join(SITE, name), 'utf8');

const sources = Object.freeze({
  gate: read('v52b1-question-bank-observer-gate.js'),
  selection: read('question-bank-selection-qa.js'),
  topicalGuard: read('v52-topical-activation-guard.js'),
  metadataReview: read('question-bank-metadata-review.js'),
  topicalLibrary: read('v52-teacher-topical-library.js'),
  auditMultipart: read('question-bank-audit-multipart.js'),
  performance: read('v52b1-question-bank-performance.js'),
});

const add = (page, key) => page.addScriptTag({ content: sources[key] });

function questionBankShell() {
  return `<!doctype html><html><head><style>.hidden{display:none!important}</style></head><body>
    <section id="teacher" class="active">
      <div class="tabs">
        <button class="tab" data-panel="import-panel">Import</button>
        <button class="tab active" data-panel="questions-panel">Questions</button>
      </div>
      <section id="import-panel" class="panel"></section>
      <section id="questions-panel" class="panel active">
        <div class="filtergrid">
          <input id="question-search">
          <select id="question-year"><option value="all">All</option><option value="6">6</option></select>
          <select id="question-strand"><option value="all">All</option><option value="number">number</option></select>
          <input id="question-exam-year"><input id="question-paper">
          <select id="question-status"><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </div>
        <div id="question-bank-count"></div>
        <div id="questions-cards"></div>
      </section>
    </section>
  </body></html>`;
}

async function installGlobals(page, count = 8, { topical = false, splitTopicalSets = false } = {}) {
  await page.evaluate(({ count, topical, splitTopicalSets }) => {
    window.__baseRenderCount = 0;
    window.teacherQuestions = Array.from({ length: count }, (_, i) => {
      const multipart = i < 2;
      return {
        id: `q${i + 1}`,
        year_level: 6,
        strand: 'number',
        topic: 'Number',
        subtopic: '',
        skill: 'Counting',
        difficulty: 'standard',
        question_text: `Question ${i + 1}`,
        marks: 1,
        answer: String(i + 1),
        response_type: 'text',
        exam_year: null,
        paper: '',
        question_number: multipart ? `1(${i === 0 ? 'a' : 'b'})` : String(i + 1),
        source_type: topical ? 'topical_exercise' : 'practice',
        source: topical ? (splitTopicalSets && i >= Math.ceil(count / 2) ? 'Set B' : 'Set A') : 'Bank',
        active: topical ? false : i % 3 !== 1,
        review_status: i === 2 ? 'reviewed' : 'none',
        review_note: i === 2 ? 'Checked' : '',
        parent_question_number: multipart ? '1' : '',
        part_label: multipart ? (i === 0 ? 'a' : 'b') : '',
        part_order: multipart ? i + 1 : null,
        group_prompt: multipart ? 'Shared prompt' : '',
        image_url: '',
        practice_eligible: i % 2 === 0,
      };
    });

    window.renderQuestions = function baseRenderQuestions() {
      window.__baseRenderCount += 1;
      const root = document.getElementById('questions-cards');
      if (!root) return null;
      root.innerHTML = window.teacherQuestions.map(q => `
        <article class="qcard">
          <div class="qcard-head"></div>
          <div class="qcard-main">
            <div class="qcard-meta"></div>
            <div class="qcard-detail"></div>
            <div class="qcard-actions">
              <button class="edit-q" data-id="${q.id}">Edit</button>
              <button class="toggle-q" data-id="${q.id}" data-active="${q.active !== false ? 'true' : 'false'}">Toggle</button>
            </div>
          </div>
        </article>`).join('');
      return { base: true, count: window.teacherQuestions.length };
    };

    window.__phase7cbBaseRender = window.renderQuestions;
    window.loadTeacher = async () => true;
    window.cloudReady = true;
    window.teacherUser = { id: 't1' };
    window.alert = () => {};
    window.confirm = () => true;
    window.prompt = (_message, value) => value;
    window.cloud = {
      from() { return { update() { return { in: async () => ({ error: null }) }; } }; },
      rpc: async () => ({ data: {}, error: null }),
    };
  }, { count, topical, splitTopicalSets });
}

async function installFullStack(page, { performance = true } = {}) {
  await add(page, 'gate');
  await add(page, 'selection');
  await add(page, 'topicalGuard');
  await add(page, 'metadataReview');
  await add(page, 'topicalLibrary');
  await add(page, 'auditMultipart');
  if (performance) await add(page, 'performance');
}

async function qaSnapshot(page) {
  return page.evaluate(() => ({
    summary: document.getElementById('v51b1-qa-summary')?.textContent || '',
    profiles: document.getElementById('v51b1-paper-profiles')?.textContent || '',
    cards: [...document.querySelectorAll('#questions-cards .qcard')].map(card => ({
      id: card.querySelector('.edit-q')?.dataset?.id || '',
      hidden: card.classList.contains('hidden'),
      chips: [...card.querySelectorAll('.v51b1-qa-chips .tag')].map(node => node.textContent || ''),
      chipRootHidden: card.querySelector('.v51b1-qa-chips')?.classList.contains('hidden') ?? null,
    })),
  }));
}

async function focusedSnapshot(page) {
  return page.evaluate(() => ({
    visibleIds: [...document.querySelectorAll('#questions-cards .qcard')]
      .filter(card => !card.classList.contains('hidden'))
      .map(card => card.querySelector('.edit-q')?.dataset?.id || ''),
    countText: document.getElementById('question-bank-count')?.textContent || '',
    focusText: document.getElementById('v52b-focus')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    focusHidden: document.getElementById('v52b-focus')?.classList.contains('hidden') ?? true,
    clearButtons: document.querySelectorAll('#v52b-clear-focus').length,
  }));
}

test.describe('Phase 7C-B — explicit refresh and lifecycle contracts', () => {
  test('QA public render reaches the same settled QA DOM as the current wrapper path while the real QA RAF remains unclassified', async ({ page }) => {
    await page.setContent(questionBankShell());
    await installGlobals(page, 6, { topical: false });

    await add(page, 'gate');
    await add(page, 'selection');

    await page.evaluate(() => {
      window.__phase7cbCapturedRaf = [];
      const nativeRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = callback => {
        window.__phase7cbCapturedRaf.push(callback);
        return window.__phase7cbCapturedRaf.length;
      };
      try { window.renderQuestions(); } finally { window.requestAnimationFrame = nativeRaf; }
    });

    await add(page, 'performance');

    const qaClassifier = await page.evaluate(() => {
      const callback = window.__phase7cbCapturedRaf.find(fn => {
        const source = Function.prototype.toString.call(fn);
        return (fn.name || '') === '' && /=>\s*render\(\)/.test(source) && !source.includes('applyFocusedCards');
      });
      return {
        found: !!callback,
        kind: callback ? window.V52B1QuestionBankPerformance.refreshCallbackKind(callback) : null,
        publicRender: typeof window.V51QuestionBankQA?.render,
      };
    });
    expect(qaClassifier).toEqual({ found: true, kind: '', publicRender: 'function' });

    await page.evaluate(() => window.renderQuestions());
    await page.waitForTimeout(140);
    const wrapperPath = await qaSnapshot(page);

    await page.evaluate(() => {
      window.__phase7cbBaseRender();
      const summary = document.getElementById('v51b1-qa-summary');
      if (summary) summary.textContent = '';
      const profiles = document.getElementById('v51b1-paper-profiles');
      if (profiles) profiles.textContent = '';
      window.V51QuestionBankQA.render();
    });
    await page.waitForTimeout(60);
    const directPath = await qaSnapshot(page);

    expect(directPath).toEqual(wrapperPath);
    expect(directPath.cards).toHaveLength(6);
    expect(directPath.cards.some(card => card.chips.some(text => text.includes('Inactive')))).toBe(true);
  });

  test('Topical Library public render alone restores the same settled focused-set DOM', async ({ page }) => {
    await page.setContent(questionBankShell());
    await installGlobals(page, 8, { topical: true, splitTopicalSets: true });
    await installFullStack(page, { performance: true });

    await page.evaluate(() => window.renderQuestions());
    await page.waitForTimeout(240);
    await page.evaluate(() => window.V52TeacherTopicalLibrary.render());

    const focusKey = await page.evaluate(() => window.V52TeacherTopicalLibrary.buildSetSummaries()[0]?.key || '');
    expect(focusKey).not.toBe('');

    await page.evaluate(key => window.V52TeacherTopicalLibrary.viewSet(key), focusKey);
    await page.waitForTimeout(240);
    const wrapperPath = await focusedSnapshot(page);

    expect(wrapperPath.focusHidden).toBe(false);
    expect(wrapperPath.clearButtons).toBe(1);
    expect(wrapperPath.visibleIds.length).toBeGreaterThan(0);
    expect(wrapperPath.visibleIds.length).toBeLessThan(8);

    await page.evaluate(() => {
      document.querySelectorAll('#questions-cards .qcard').forEach(card => card.classList.remove('hidden'));
      const count = document.getElementById('question-bank-count');
      if (count) count.textContent = 'stale count';
      const focus = document.getElementById('v52b-focus');
      if (focus) {
        focus.classList.add('hidden');
        focus.innerHTML = '';
      }
      window.V52TeacherTopicalLibrary.render();
    });
    await page.waitForTimeout(120);
    const publicRenderPath = await focusedSnapshot(page);

    expect(publicRenderPath).toEqual(wrapperPath);
  });

  test('the already-strong explicit refresh APIs restore their owned Question Bank presentation without suppressed card/panel observers', async ({ page }) => {
    await page.setContent(questionBankShell());
    await installGlobals(page, 6, { topical: true });
    await installFullStack(page, { performance: true });

    await page.evaluate(() => window.renderQuestions());
    await page.waitForTimeout(220);

    const contracts = await page.evaluate(() => ({
      bulk: typeof window.V51QuestionBankBulkStatus?.renderSummary,
      topical: typeof window.V52TopicalActivationGuard?.decorate,
      review: typeof window.V51QuestionReviewWorkflow?.renderAll,
      multipart: typeof window.V51MultipartQuestionManagement?.renderGroup,
    }));
    expect(contracts).toEqual({
      bulk: 'function',
      topical: 'function',
      review: 'function',
      multipart: 'function',
    });

    await page.evaluate(() => {
      document.querySelectorAll('#questions-cards [data-v52-topical-locked]').forEach(node => {
        delete node.dataset.v52TopicalLocked;
      });
      document.querySelectorAll('#questions-cards .v51b2c-review-badge').forEach(node => node.remove());
      document.querySelectorAll('#questions-cards .v51b2e-multipart-badge').forEach(node => node.remove());
      const bulk = document.getElementById('v51b2a-summary');
      if (bulk) bulk.textContent = 'stale bulk';
      window.V51QuestionBankBulkStatus.renderSummary();
      window.V52TopicalActivationGuard.decorate();
      window.V51QuestionReviewWorkflow.renderAll();
      window.V51MultipartQuestionManagement.renderGroup();
    });
    await page.waitForTimeout(80);

    await expect(page.locator('#v51b2a-summary')).not.toHaveText('stale bulk');
    await expect(page.locator('#questions-cards [data-v52-topical-locked="1"]').first()).toHaveCount(1);
    await expect(page.locator('#questions-cards .v51b2c-review-badge')).toHaveCount(1);
    await expect(page.locator('#questions-cards .v51b2e-multipart-badge')).toHaveCount(2);
  });

  test('Correction History pins the current explicit-lifecycle gap for manual selection, live Select all/Clear controls and late panel recreation', async ({ page }) => {
    await page.setContent(questionBankShell());
    await installGlobals(page, 4, { topical: false });
    await installFullStack(page, { performance: true });

    await page.evaluate(() => window.renderQuestions());
    await page.waitForTimeout(220);

    await expect(page.locator('#v51b2d-question-history')).toHaveCount(1);
    await expect(page.locator('#v51b2d-selection')).toHaveText('Select one question to view its history.');

    await page.locator('#questions-cards .v51b2a-select').first().check();
    await expect.poll(() => page.evaluate(() =>
      window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions, undefined, false).selected.length
    )).toBe(1);
    await expect.poll(() => page.locator('#v51b2d-selection').textContent()).toContain('Selected:');

    const manualText = await page.locator('#v51b2d-selection').textContent();
    expect(manualText).toBeTruthy();

    await page.locator('#v51b2a-clear-selection').click();
    await expect.poll(() => page.evaluate(() =>
      window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions, undefined, false).selected.length
    )).toBe(0);
    await page.waitForTimeout(180);

    const afterClear = await page.locator('#v51b2d-selection').textContent();
    expect(afterClear).toBe(manualText);

    await page.locator('#v51b2a-select-visible').click();
    await expect.poll(() => page.evaluate(() =>
      window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions, undefined, false).selected.length
    )).toBe(4);
    await page.waitForTimeout(180);

    const afterSelectAll = await page.locator('#v51b2d-selection').textContent();
    expect(afterSelectAll).toBe(manualText);

    const sourceContract = await page.evaluate(() => ({
      historyApiKeys: Object.keys(window.V51QuestionChangeHistory || {}).sort(),
      liveSelectVisible: !!document.getElementById('v51b2a-select-visible'),
      liveClearSelection: !!document.getElementById('v51b2a-clear-selection'),
      staleSelectAll: !!document.getElementById('v51b2a-select-all'),
      staleClear: !!document.getElementById('v51b2a-clear'),
    }));

    expect(sourceContract.liveSelectVisible).toBe(true);
    expect(sourceContract.liveClearSelection).toBe(true);
    expect(sourceContract.staleSelectAll).toBe(false);
    expect(sourceContract.staleClear).toBe(false);
    expect(sourceContract.historyApiKeys).not.toContain('bind');
    expect(sourceContract.historyApiKeys).not.toContain('renderSelectionState');

    await page.locator('#v51b2d-question-history').evaluate(node => node.remove());
    await page.evaluate(() => window.renderQuestions());
    await page.waitForTimeout(220);
    await expect(page.locator('#v51b2d-question-history')).toHaveCount(0);

    expect(sources.auditMultipart).toContain("#v51b2a-select-all,#v51b2a-clear");
    expect(sources.auditMultipart).not.toContain("#v51b2a-select-visible,#v51b2a-clear-selection");
  });

  test('native negative controls stay outside the future coordinator boundary', async ({ page }) => {
    await page.setContent(questionBankShell() + '<div id="v52b-cards"></div><div id="ordinary"></div>');
    await add(page, 'gate');

    const result = await page.evaluate(async () => {
      const counts = { topicalCards: 0, ordinary: 0 };
      const topicalCards = document.getElementById('v52b-cards');
      const ordinary = document.getElementById('ordinary');
      new MutationObserver(() => { counts.topicalCards += 1; }).observe(topicalCards, { childList: true });
      new MutationObserver(() => { counts.ordinary += 1; }).observe(ordinary, { childList: true });
      topicalCards.appendChild(document.createElement('span'));
      ordinary.appendChild(document.createElement('span'));
      await new Promise(resolve => setTimeout(resolve, 60));
      return {
        counts,
        reasons: {
          topicalCards: window.V52B1QuestionBankObserverGate.suppressionReason(topicalCards, () => {}),
          ordinary: window.V52B1QuestionBankObserverGate.suppressionReason(ordinary, () => {}),
        },
      };
    });

    expect(result.counts.topicalCards).toBeGreaterThan(0);
    expect(result.counts.ordinary).toBeGreaterThan(0);
    expect(result.reasons).toEqual({ topicalCards: '', ordinary: '' });
  });
});
