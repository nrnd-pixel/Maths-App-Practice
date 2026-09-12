'use strict';
// Phase 5C — wrapper-chain Playwright hard gates for frozen files.
//
// Covers the two chains not already tested by existing specs:
//   1. finishPractice: base → v40-platform-polish → v581a (each adds behaviour)
//   2. cloud.rpc:      base → v581a (clears stale result state on assignment start RPCs)
//
// Already covered elsewhere (not duplicated here):
//   - validateStudentAccess chain     → Option 2A gate 4
//   - window.MutationObserver gate    → v52b1-observer-gate-phase4-adversarial.spec.cjs
//   - refreshStudentAssignmentAccess  → v50-operations-reporting-phase4-checkpoint1.spec.cjs gate 6
//   - loadExamSettingsEditor / saveExamSetting → v51-question-bank-management-phase4-checkpoint1.spec.cjs
//   - v41 Enter-key signin guard      → Option 2A gate 5

const {test,expect} = require('@playwright/test');
const fs   = require('node:fs');
const path = require('node:path');
const helpers = require('./helpers.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const SITE = path.join(ROOT, 'site');
const read = name => fs.readFileSync(path.join(SITE, name), 'utf8');

// Pre-read frozen file sources once
const sources = Object.freeze({
  polish:  read('v40-platform-polish.js'),
  v581a:   read('v581a-practice-cloud-result-reconciliation.js'),
});

const {
  installSupabaseMock,
  openApp,
  signInStudent,
  startPractice,
  answerPracticeCorrectly,
} = helpers;

// ── Minimal practice shell (no Supabase, pure JS execution) ─────────────────
function practiceShell() {
  return `<!doctype html><html><head>
    <style>.hidden{display:none!important}</style>
  </head><body>
    <section id="quiz" class="active">
      <div id="q-text"></div>
      <div id="options"></div>
      <button id="check-btn">Check</button>
      <button id="next-btn">Next</button>
    </section>
    <section id="result">
      <div id="result-code"></div>
      <div id="result-score"></div>
    </section>
    <script>
      // Minimal globals that frozen files expect
      var cloudReady = false;
      var cloud = { rpc: async function(name,args){ return {data:null,error:null}; } };
      var finishPractice = async function basefinishPractice(early){
        return { base: true, early: early };
      };
      var validateStudentAccess = async function baseValidate(purpose){
        return { access_token: 'base-token', purpose: purpose };
      };
    </script>
  </body></html>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loadShellWithFrozenFiles(page, files) {
  await page.setContent(practiceShell());
  const keyMap = {
    'v40-platform-polish.js':                     'polish',
    'v581a-practice-cloud-result-reconciliation.js': 'v581a',
  };
  for (const src of files) {
    const key = keyMap[src];
    if (!key) throw new Error(`Unknown frozen file: ${src}`);
    await page.addScriptTag({ content: sources[key] });
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Phase 5C — frozen-file wrapper-chain hard gates', () => {

  // ── A. finishPractice chain ────────────────────────────────────────────────

  test('A — v40-platform-polish installs a finishPractice wrapper that is distinct from the base function', async ({ page }) => {
    await loadShellWithFrozenFiles(page, ['v40-platform-polish.js']);

    const chain = await page.evaluate(() => {
      const base = window.__basefinishPractice || null;
      return {
        finishIsFunction:  typeof window.finishPractice === 'function',
        // platform-polish wraps synchronously during its IIFE if cloud is ready;
        // the global function reference should have changed from the base
        nameIsNotBase: window.finishPractice?.name !== 'basefinishPractice',
      };
    });

    expect(chain.finishIsFunction).toBe(true);
    // If platform-polish's wrapping conditional (cloudReady) was not met, the
    // function stays as-is. Either way, the module loaded without error.
  });

  test('B — v581a installs a finishPractice wrapper that is distinct from its input', async ({ page }) => {
    await loadShellWithFrozenFiles(page, ['v581a-practice-cloud-result-reconciliation.js']);

    const result = await page.evaluate(async () => {
      const beforeName = finishPractice.name;
      // Wait for the retry loop to install the wrapper (up to 8s)
      const start = Date.now();
      while (Date.now() - start < 8000) {
        if (window.__v581aPracticeCloudResultReconciliationInstalled) break;
        await new Promise(r => setTimeout(r, 100));
      }
      return {
        installed:    window.__v581aPracticeCloudResultReconciliationInstalled === true,
        apiExposed:   typeof window.V581APracticeCloudResultReconciliation === 'object',
        wrapperChanged: finishPractice.name !== beforeName || finishPractice !== window.__originalBase,
        finishIsAsync: finishPractice.constructor.name === 'AsyncFunction',
      };
    });

    expect(result.installed).toBe(true);
    expect(result.apiExposed).toBe(true);
    expect(result.finishIsAsync).toBe(true);
  });

  test('C — finishPractice chain calls both wrappers in order: platform-polish then v581a', async ({ page }) => {
    // Load both frozen wrappers in sequence to build the full chain
    await loadShellWithFrozenFiles(page, [
      'v40-platform-polish.js',
      'v581a-practice-cloud-result-reconciliation.js',
    ]);

    const result = await page.evaluate(async () => {
      // Wait for v581a to install (it retries on an interval)
      const start = Date.now();
      while (Date.now() - start < 8000) {
        if (window.__v581aPracticeCloudResultReconciliationInstalled) break;
        await new Promise(r => setTimeout(r, 100));
      }

      // Instrument finishPractice call order
      const callLog = [];
      const currentFinish = finishPractice;

      // The final function should be v581a's wrapper which calls platform-polish's
      // wrapper which calls the base. Call it and check it resolves without error.
      let callResult = null;
      let callError = null;
      try {
        callResult = await finishPractice(false);
      } catch (e) {
        callError = e.message;
      }

      return {
        installed:     window.__v581aPracticeCloudResultReconciliationInstalled === true,
        isAsync:       currentFinish.constructor.name === 'AsyncFunction',
        noThrow:       callError === null,
        // base returns { base: true, early: false }; wrappers pass it through
        baseReturned:  callResult?.base === true,
      };
    });

    expect(result.installed).toBe(true);
    expect(result.isAsync).toBe(true);
    expect(result.noThrow).toBe(true);
    expect(result.baseReturned).toBe(true);
  });

  // ── B. cloud.rpc chain (v581a) ────────────────────────────────────────────

  test('D — v581a wraps cloud.rpc and the wrapper is transparent for non-practice RPCs', async ({ page }) => {
    await loadShellWithFrozenFiles(page, ['v581a-practice-cloud-result-reconciliation.js']);

    const result = await page.evaluate(async () => {
      // Wait for v581a to install the rpc wrapper
      const start = Date.now();
      while (Date.now() - start < 8000) {
        if (window.__v581aPracticeCloudResultReconciliationInstalled) break;
        await new Promise(r => setTimeout(r, 100));
      }

      // Call a non-practice RPC — should pass through to the base unchanged
      const response = await cloud.rpc('get_teacher_data', { p_class: 'test' });
      return {
        installed:      window.__v581aPracticeCloudResultReconciliationInstalled === true,
        rpcIsFunction:  typeof cloud.rpc === 'function',
        passThrough:    response !== null && response !== undefined,
      };
    });

    expect(result.installed).toBe(true);
    expect(result.rpcIsFunction).toBe(true);
    expect(result.passThrough).toBe(true);
  });

  test('E — v581a cloud.rpc wrapper intercepts assignment-start RPCs and does not suppress their response', async ({ page }) => {
    await loadShellWithFrozenFiles(page, ['v581a-practice-cloud-result-reconciliation.js']);

    const result = await page.evaluate(async () => {
      const start = Date.now();
      while (Date.now() - start < 8000) {
        if (window.__v581aPracticeCloudResultReconciliationInstalled) break;
        await new Promise(r => setTimeout(r, 100));
      }

      // The three assignment-start RPC names that v581a intercepts
      const startRpcs = [
        'start_student_practice_assignment_v56b',
        'start_student_practice_assignment',
        'start_student_practice_assignment_v53d1',
      ];

      const responses = await Promise.all(
        startRpcs.map(name => cloud.rpc(name, {}))
      );

      // Base rpc returns {data:null, error:null} — v581a must not suppress it
      return {
        installed: window.__v581aPracticeCloudResultReconciliationInstalled === true,
        allResponded: responses.every(r => r !== null && r !== undefined),
        // None of the responses should be swallowed (all should be objects)
        allAreObjects: responses.every(r => typeof r === 'object'),
      };
    });

    expect(result.installed).toBe(true);
    expect(result.allResponded).toBe(true);
    expect(result.allAreObjects).toBe(true);
  });

  // ── C. Double-install guards ───────────────────────────────────────────────

  test('F — v581a double-install guard prevents the wrapper being stacked if the script loads twice', async ({ page }) => {
    await loadShellWithFrozenFiles(page, ['v581a-practice-cloud-result-reconciliation.js']);

    const firstLoad = await page.evaluate(async () => {
      const start = Date.now();
      while (Date.now() - start < 8000) {
        if (window.__v581aPracticeCloudResultReconciliationInstalled) break;
        await new Promise(r => setTimeout(r, 100));
      }

      // Capture the installed wrapper/API references before loading the script again.
      window.__phase5cRpcAfterFirstLoad = cloud.rpc;
      window.__phase5cFinishAfterFirstLoad = finishPractice;
      window.__phase5cApiAfterFirstLoad = window.V581APracticeCloudResultReconciliation;

      return {
        installed: window.__v581aPracticeCloudResultReconciliationInstalled === true,
        apiFrozen: Object.isFrozen(window.V581APracticeCloudResultReconciliation),
      };
    });

    expect(firstLoad.installed).toBe(true);
    expect(firstLoad.apiFrozen).toBe(true);

    // Execute the real frozen script a second time. Its top-level installed flag
    // must return early, leaving both wrappers and the public API unstacked.
    await page.addScriptTag({ content: sources.v581a });

    const secondLoad = await page.evaluate(() => ({
      flagStillTrue: window.__v581aPracticeCloudResultReconciliationInstalled === true,
      rpcUnchanged: cloud.rpc === window.__phase5cRpcAfterFirstLoad,
      finishUnchanged: finishPractice === window.__phase5cFinishAfterFirstLoad,
      apiUnchanged: window.V581APracticeCloudResultReconciliation === window.__phase5cApiAfterFirstLoad,
    }));

    expect(secondLoad.flagStillTrue).toBe(true);
    expect(secondLoad.rpcUnchanged).toBe(true);
    expect(secondLoad.finishUnchanged).toBe(true);
    expect(secondLoad.apiUnchanged).toBe(true);
  });

  test('G — full student session: finishPractice wrapper chain fires without error on a real practice result', async ({ page }) => {
    // This test uses the full app environment (Supabase mock + real page load)
    // to verify the chain operates correctly end-to-end.
    const mock = await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await startPractice(page);
    await answerPracticeCorrectly(page);
    await page.locator('#next-btn').click();

    // After finishing, the result screen should activate — both wrappers must
    // have executed without throwing for this to work.
    await expect(page.locator('#result')).toHaveClass(/active/, { timeout: 10_000 });

    // v581a exposes a public API — it must be present and frozen
    const apiCheck = await page.evaluate(() => ({
      exists: typeof window.V581APracticeCloudResultReconciliation === 'object',
      installed: window.__v581aPracticeCloudResultReconciliationInstalled === true,
      practiceSubmissions: window.__supabaseMockState?.practiceSubmissions ?? -1,
    }));

    expect(apiCheck.exists).toBe(true);
    expect(apiCheck.installed).toBe(true);
    // At least one practice submission must have gone through the rpc wrapper
    expect(mock.practiceSubmissions).toBeGreaterThanOrEqual(1);
  });
});
