const { test, expect } = require('@playwright/test');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const {
  installSupabaseMock,
  openApp,
  signInStudent,
  startPractice,
} = require('./helpers.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BASE_SHA = '6d1cc994e479411e6af266de1ebdfa91bb57f8d1';
const EXPECTED_FROZEN_SITE_SHA256 = '1a29b397d8777aa956c742e7807a18b78255558a2139812df71dfc7b45a49374';
const EXPECTED_SUPABASE_SHA256 = '58fbaa5f6ebcf1fa4214429e0e9a76284897775680a93f704fb2a0455a273389';
const EXPECTED_SUPABASE_TREE = '204bba144a9ebe47dcbcc1bb1331c484acd0ea33';

const RUNTIME_SUCCESSORS = Object.freeze({
  'site/tests/verify-v5.8.1b-checkpoint-attribution.cjs': '5d88433c990bf6dfba2513113004117ef5f8c947',
});

const FROZEN_HIGH_RISK_BLOBS = Object.freeze({
  'site/config.js': '2c684d511315a4cd1f76e0ec833e614928e33180',
  'site/v39-student-polish.js': '4daea69a282d99f7e8a07bd4aeaa26dcaaaf86ad',
  'site/v40-student-platform.js': 'c200fd22365d54178696b5f12e6866c8b4edbfed',
  'site/v40-student-session.js': '52150813ff7eeeff72cbc98ab1cafff180d32c96',
  'site/v40-learning-priorities.js': 'bfec5b47eaf266486d21c96acdb4e1cfd677b328',
  'site/v40-platform-polish.js': '5ebdcb4c8d6a8a4c5fad19fa14dfaea2561d102b',
  'site/v40-release.js': 'a308df11b601bf563b56d555e9f434652e524d77',
  'site/v40-start-shell.js': '26280684b65275ea13656b3e423a8a3ce81cd9e9',
  'site/v41-signin-guard.js': '5794576f4c41e32ae8bb081e380ff892ef5f4a6c',
  'site/v52b1-question-bank-observer-gate.js': '82a87ffed9091b76c9008a3949c3bd432c2d06ce',
  'site/gamification-core.js': '87d6175270284e4b40c3a1fbcd196622179d0402',
  'site/gamification-student.js': 'd9c4dc0e25cbed50346937db887a703800be5a59',
  'site/v57c-student-continue-learning-home.js': '196225cf94035363869b8051bc33cdd3c03993f9',
  'site/v58a-student-first-use-experience.js': '8e0279e86b1ece862586238f99c760129c13465f',
});

const SCREEN_CONFIG = Object.freeze({
  start: 'home',
  quiz: 'learn',
  result: 'learn',
  'exam-result': 'learn',
  'student-assignments': 'assignments',
  'student-dashboard': 'progress',
  'student-review': 'reviewed',
});
const NAV_KEYS = Object.freeze(['home', 'learn', 'assignments', 'progress', 'reviewed']);

function git(args) {
  return execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function gitBlob(pathname) {
  return git(['hash-object', pathname]);
}

function workingManifestHash(root, excluded = new Set()) {
  const output = git(['ls-files', '-co', '--exclude-standard', root]);
  const paths = output
    ? [...new Set(output.split(/\r?\n/).filter(Boolean))].sort()
    : [];
  const records = paths
    .filter(pathname => !excluded.has(pathname))
    .map(pathname => `${gitBlob(pathname)}  ${pathname}`);
  return crypto.createHash('sha256')
    .update(records.length ? `${records.join('\n')}\n` : '')
    .digest('hex');
}

async function installLifecycleCapture(page) {
  await page.addInitScript(({ screenConfig, navKeys }) => {
    window.__option2cCapture = {
      navs: {},
      buttons: {},
      learn: {},
      baseValidate: null,
      sessionValidate: null,
      platformValidate: null,
      v52c2Validate: null,
      validateOrder: [],
    };

    const captureStatic = () => {
      const capture = window.__option2cCapture;
      for (const screenId of Object.keys(screenConfig)) {
        const screen = document.getElementById(screenId);
        const nav = screen?.querySelector(':scope > .v40-student-nav') || null;
        capture.navs[screenId] = nav;
        capture.buttons[screenId] = {};
        for (const key of navKeys) {
          capture.buttons[screenId][key] = nav?.querySelector(`[data-v40-nav="${key}"]`) || null;
        }
      }

      const setup = document.querySelector('#start .v40c-learn-setup');
      capture.learn = {
        setup,
        modeSwitch: setup?.querySelector('.mode-switch') || null,
        modeNote: setup?.querySelector('#mode-note') || null,
        startButton: setup?.querySelector('#start-btn') || null,
        strand: document.getElementById('practice-strand-wrap'),
        topic: document.getElementById('practice-topic-wrap'),
        count: document.getElementById('practice-count-wrap'),
        difficulty: document.getElementById('practice-difficulty-wrap'),
        examYear: document.getElementById('exam-year-wrap'),
        examPaper: document.getElementById('exam-paper-wrap'),
        examNote: document.getElementById('exam-paper-note'),
        examInstructions: document.getElementById('exam-instructions'),
        openLearn: document.querySelector('#start [data-action-for="start-btn"] .v40c-open-learn'),
      };
      capture.baseValidate = window.validateStudentAccess;
      capture.validateOrder.push('base');

      const observer = new MutationObserver(records => {
        records.forEach(record => {
          record.addedNodes.forEach(node => {
            if (!(node instanceof HTMLScriptElement)) return;
            const src = String(node.getAttribute('src') || '');
            if (src.includes('v40-student-session.js')) {
              node.addEventListener('load', () => {
                capture.sessionValidate = window.validateStudentAccess;
                capture.validateOrder.push('session');
              }, { once: true });
            }
            if (src.includes('v40-platform-polish.js')) {
              node.addEventListener('load', () => {
                capture.platformValidate = window.validateStudentAccess;
                capture.validateOrder.push('platform-polish');
              }, { once: true });
            }
            if (src.includes('topical-legacy-student-route.js')) {
              node.addEventListener('load', () => {
                capture.v52c2Validate = window.validateStudentAccess;
                capture.validateOrder.push('v52c2');
              }, { once: true });
            }
          });
        });
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', captureStatic, { once: true });
    } else {
      captureStatic();
    }
  }, { screenConfig: SCREEN_CONFIG, navKeys: NAV_KEYS });
}

async function signInAndWait(page) {
  await signInStudent(page);
  await expect(page.locator('#start')).toHaveClass(/v40-shell-authenticated/);
  await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'home');
}

test.describe('Option 2C static V40 nav + Learn shell hard gates', () => {
  test('gate 1 — true pre-JS flash suppression keeps only the logged-out shell visible', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
      const baseURL = String(test.info().project.use.baseURL || 'http://127.0.0.1:4173');
      await page.goto(baseURL);
      await expect(page.locator('#start')).toBeVisible();
      await expect(page.locator('#start .header')).toBeVisible();
      await expect(page.locator('#start .v40c-session-panel')).toBeVisible();
      await expect(page.locator('#v40c-student-signin')).toBeVisible();
      await expect(page.locator('#start .v40c-session-identity')).toBeHidden();
      await expect(page.locator('#start > .v40-student-nav')).toBeHidden();
      await expect(page.locator('#start .v40c-learn-setup')).toBeHidden();
      await expect(page.locator('#start .mode-switch')).toBeHidden();
      await expect(page.locator('#start .v40-learning-hub-hero')).toBeHidden();
      await expect(page.locator('#start .v40c3-home-dashboard')).toBeHidden();
    } finally {
      await context.close();
    }
  });

  test('gate 2 — all seven static navs and every tab button keep exact DOM identity after enhancement', async ({ page }) => {
    await installLifecycleCapture(page);
    await installSupabaseMock(page);
    await openApp(page);

    const identity = await page.evaluate(({ screenConfig, navKeys }) => {
      const capture = window.__option2cCapture;
      return Object.keys(screenConfig).map(screenId => {
        const screen = document.getElementById(screenId);
        const nav = screen?.querySelector(':scope > .v40-student-nav') || null;
        return {
          screenId,
          navSame: capture.navs[screenId] === nav,
          navCount: screen?.querySelectorAll(':scope > .v40-student-nav').length || 0,
          staticMarker: nav?.dataset.v40StaticNav || '',
          enhanced: nav?.dataset.v40NavEnhanced || '',
          buttonsSame: navKeys.every(key => capture.buttons[screenId][key] === nav?.querySelector(`[data-v40-nav="${key}"]`)),
          buttonCount: nav?.querySelectorAll('[data-v40-nav]').length || 0,
        };
      });
    }, { screenConfig: SCREEN_CONFIG, navKeys: NAV_KEYS });

    for (const row of identity) {
      expect(row.navSame, `${row.screenId} nav was replaced`).toBe(true);
      expect(row.navCount, `${row.screenId} duplicate nav`).toBe(1);
      expect(row.staticMarker, `${row.screenId} is not source HTML`).toBe('true');
      expect(row.enhanced, `${row.screenId} not enhanced`).toBe('true');
      expect(row.buttonsSame, `${row.screenId} nav buttons were replaced`).toBe(true);
      expect(row.buttonCount, `${row.screenId} tab count`).toBe(5);
    }
  });

  test('gate 3 — static Learn shell and legacy controls keep exact DOM identity and final positions', async ({ page }) => {
    await installLifecycleCapture(page);
    await installSupabaseMock(page);
    await openApp(page);

    const result = await page.evaluate(() => {
      const capture = window.__option2cCapture.learn;
      const setup = document.querySelector('#start .v40c-learn-setup');
      const practiceGrid = setup?.querySelector('.v40c-settings-grid');
      const examGrid = setup?.querySelector('.v40c-exam-grid');
      const actions = setup?.querySelector('.v40c-learn-actions');
      const current = {
        setup,
        modeSwitch: setup?.querySelector('.mode-switch'),
        modeNote: setup?.querySelector('#mode-note'),
        startButton: setup?.querySelector('#start-btn'),
        strand: document.getElementById('practice-strand-wrap'),
        topic: document.getElementById('practice-topic-wrap'),
        count: document.getElementById('practice-count-wrap'),
        difficulty: document.getElementById('practice-difficulty-wrap'),
        examYear: document.getElementById('exam-year-wrap'),
        examPaper: document.getElementById('exam-paper-wrap'),
        examNote: document.getElementById('exam-paper-note'),
        examInstructions: document.getElementById('exam-instructions'),
        openLearn: document.querySelector('#start [data-action-for="start-btn"] .v40c-open-learn'),
      };
      return {
        allSame: Object.keys(capture).every(key => capture[key] === current[key]),
        setupCount: document.querySelectorAll('#start .v40c-learn-setup').length,
        startButtonCount: document.querySelectorAll('#start #start-btn').length,
        modeSwitchParent: current.modeSwitch?.parentElement === setup,
        modeNoteParent: current.modeNote?.parentElement === setup,
        startButtonParent: current.startButton?.parentElement === actions,
        practiceParents: [current.strand,current.topic,current.count,current.difficulty].every(node => node?.parentElement === practiceGrid),
        examParents: [current.examYear,current.examPaper,current.examNote,current.examInstructions].every(node => node?.parentElement === examGrid),
        navPosition: document.querySelector('#start .v40c-session-panel')?.nextElementSibling === document.querySelector('#start > .v40-student-nav'),
        enhanced: setup?.dataset.v40LearnEnhanced || '',
        fallback: setup?.dataset.v40Fallback || '',
      };
    });

    expect(result).toEqual({
      allSame: true,
      setupCount: 1,
      startButtonCount: 1,
      modeSwitchParent: true,
      modeNoteParent: true,
      startButtonParent: true,
      practiceParents: true,
      examParents: true,
      navPosition: true,
      enhanced: 'true',
      fallback: '',
    });
  });

  test('gate 4 — Home and Learn tabs switch the authenticated start shell without reconstruction', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInAndWait(page);

    const startNav = page.locator('#start > .v40-student-nav');
    await expect(startNav.locator('[data-v40-nav="home"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#start .v40c-learn-setup')).toBeHidden();
    await expect(page.locator('#start .v39-home-hub')).toBeVisible();

    await startNav.locator('[data-v40-nav="learn"]').click();
    await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'learn');
    await expect(startNav.locator('[data-v40-nav="learn"]')).toHaveAttribute('aria-current', 'page');
    await expect(startNav.locator('[data-v40-nav="home"]')).not.toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#start .v40c-learn-setup')).toBeVisible();
    await expect(page.locator('#start .v39-home-hub')).toBeHidden();

    await startNav.locator('[data-v40-nav="home"]').click();
    await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'home');
    await expect(startNav.locator('[data-v40-nav="home"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#start .v40c-learn-setup')).toBeHidden();
    await expect(page.locator('#start .v39-home-hub')).toBeVisible();
  });

  test('gate 5 — Assignments, Progress and Reviewed tabs still delegate to the existing destinations', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInAndWait(page);

    const startNav = page.locator('#start > .v40-student-nav');
    for (const [key, selector] of [
      ['assignments', '#student-assignments'],
      ['progress', '#student-dashboard'],
      ['reviewed', '#student-review'],
    ]) {
      await expect(startNav.locator(`[data-v40-nav="${key}"]`)).toBeVisible();
      await startNav.locator(`[data-v40-nav="${key}"]`).click();
      await expect(page.locator(selector)).toHaveClass(/active/);
      await page.locator(`${selector} .back-home`).first().click();
      await expect(page.locator('#start')).toHaveClass(/active/);
      await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'home');
    }
  });

  test('gate 6 — non-Home transitions use the existing back-home and delegated source-button path', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInAndWait(page);

    await page.evaluate(() => {
      window.__option2cDelegation = {
        assignmentsBackHome: 0,
        progressSource: 0,
        dashboardBackHome: 0,
      };
      document.querySelector('#student-assignments .back-home')?.addEventListener('click', () => {
        window.__option2cDelegation.assignmentsBackHome += 1;
      });
      document.getElementById('my-progress-btn')?.addEventListener('click', () => {
        window.__option2cDelegation.progressSource += 1;
      });
      document.querySelector('#student-dashboard .back-home')?.addEventListener('click', () => {
        window.__option2cDelegation.dashboardBackHome += 1;
      });
    });

    await page.locator('#start [data-v40-nav="assignments"]').click();
    await expect(page.locator('#student-assignments')).toHaveClass(/active/);

    await page.locator('#student-assignments [data-v40-nav="progress"]').click();
    await expect(page.locator('#student-dashboard')).toHaveClass(/active/);
    expect(await page.evaluate(() => window.__option2cDelegation)).toMatchObject({
      assignmentsBackHome: 1,
      progressSource: 1,
    });

    await page.locator('#student-dashboard [data-v40-nav="learn"]').click();
    await expect(page.locator('#start')).toHaveClass(/active/);
    await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'home');
    await expect(page.locator('#start [data-v40-nav="home"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#start .v40c-learn-setup')).toBeHidden();
    await expect(page.locator('#start .v39-home-hub')).toBeVisible();
    expect(await page.evaluate(() => window.__option2cDelegation.dashboardBackHome)).toBe(1);
  });

  test('gate 7 — active Practice keeps every non-Learn navigation tab disabled', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInAndWait(page);
    await startPractice(page);

    const quizNav = page.locator('#quiz > .v40-student-nav');
    await expect(quizNav).toBeVisible();
    await expect(quizNav.locator('[data-v40-nav="learn"]')).toHaveAttribute('aria-current', 'page');
    for (const key of ['home','assignments','progress','reviewed']) {
      await expect(quizNav.locator(`[data-v40-nav="${key}"]`)).toBeDisabled();
    }
    await quizNav.locator('[data-v40-nav="home"]').click({ force: true });
    await expect(page.locator('#quiz')).toHaveClass(/active/);
  });

  test('gate 8 — authenticated → logged-out → authenticated cycling preserves one static shell and resets Home', async ({ page }) => {
    await installLifecycleCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await signInAndWait(page);

    await page.locator('#start [data-v40-nav="learn"]').click();
    await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'learn');
    await expect(page.locator('.v40c-nav-identity')).toHaveCount(7);

    await page.locator('#v40c-student-logout').click();
    await expect(page.locator('#start')).toHaveClass(/v40-shell-logged-out/);
    await expect(page.locator('#start')).not.toHaveAttribute('data-v40-start-view', /.+/);
    await expect(page.locator('#start > .v40-student-nav')).toBeHidden();
    await expect(page.locator('#start .v40c-learn-setup')).toBeHidden();
    await expect(page.locator('.v40c-nav-identity')).toHaveCount(0);

    await signInAndWait(page);
    await expect(page.locator('#start [data-v40-nav="home"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.v40c-nav-identity')).toHaveCount(7);

    const state = await page.evaluate(({ screenConfig }) => {
      const capture = window.__option2cCapture;
      return {
        navsSame: Object.keys(screenConfig).every(screenId =>
          capture.navs[screenId] === document.getElementById(screenId)?.querySelector(':scope > .v40-student-nav')
        ),
        learnSame: capture.learn.setup === document.querySelector('#start .v40c-learn-setup'),
        navCount: document.querySelectorAll('.v40-student-nav').length,
        learnCount: document.querySelectorAll('#start .v40c-learn-setup').length,
      };
    }, { screenConfig: SCREEN_CONFIG });
    expect(state).toEqual({ navsSame: true, learnSame: true, navCount: 7, learnCount: 1 });
  });

  test('gate 9 — repeated nav/Learn enhancement is idempotent and does not stack listeners', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInAndWait(page);
    await page.locator('#start [data-v40-nav="learn"]').click();

    await page.evaluate(() => {
      window.__option2cProgressSourceClicks = 0;
      document.getElementById('my-progress-btn')?.addEventListener('click', () => {
        window.__option2cProgressSourceClicks += 1;
      });
    });

    await page.addScriptTag({ url: '/v40-student-nav.js?option2c-repeat=1' });
    await page.addScriptTag({ url: '/v40-learn-setup.js?option2c-repeat=1' });
    await page.addScriptTag({ url: '/v40-student-nav.js?option2c-repeat=2' });
    await page.addScriptTag({ url: '/v40-learn-setup.js?option2c-repeat=2' });

    await expect(page.locator('.v40-student-nav')).toHaveCount(7);
    await expect(page.locator('#start .v40c-learn-setup')).toHaveCount(1);
    await expect(page.locator('#v40-student-nav-style')).toHaveCount(1);
    await expect(page.locator('#v40-learn-setup-style')).toHaveCount(1);

    const change = page.locator('#start .v40c-change-settings');
    await expect(change).toHaveAttribute('aria-expanded', 'false');
    await change.click();
    await expect(change).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#start .v40c-practice-summary')).toHaveClass(/v40c-settings-open/);
    await change.click();
    await expect(change).toHaveAttribute('aria-expanded', 'false');

    await page.locator('#start [data-v40-nav="home"]').click();
    await page.locator('#start [data-v40-nav="progress"]').click();
    await expect(page.locator('#student-dashboard')).toHaveClass(/active/);
    expect(await page.evaluate(() => window.__option2cProgressSourceClicks)).toBe(1);

    const navSource = fs.readFileSync(path.join(REPO_ROOT, 'site/v40-student-nav.js'), 'utf8');
    const learnSource = fs.readFileSync(path.join(REPO_ROOT, 'site/v40-learn-setup.js'), 'utf8');
    expect(learnSource).not.toContain('MutationObserver');
    expect(navSource).not.toMatch(/\.observe\(\s*document(?:\.|\s*[,)]|\s*$)/m);
  });

  test('gate 10 — wrapper chain, frozen site boundary and complete Supabase tree remain exact', async ({ page }) => {
    await installLifecycleCapture(page);
    await installSupabaseMock(page);
    await openApp(page);

    await expect.poll(() => page.evaluate(() => Boolean(
      window.__option2cCapture?.baseValidate &&
      window.__option2cCapture?.sessionValidate &&
      window.__option2cCapture?.platformValidate &&
      window.__option2cCapture?.v52c2Validate
    )), { timeout: 15_000 }).toBe(true);

    const chain = await page.evaluate(() => {
      const capture = window.__option2cCapture;
      const knownStages = [
        capture.baseValidate,
        capture.sessionValidate,
        capture.platformValidate,
        capture.v52c2Validate,
      ];
      return {
        knownStagesAreFunctions: knownStages.every(fn => typeof fn === 'function'),
        knownStagesAreDistinct: new Set(knownStages).size === 4,
        baseToSessionWrapped: capture.baseValidate !== capture.sessionValidate,
        sessionToPlatformWrapped: capture.sessionValidate !== capture.platformValidate,
        platformToV52C2Wrapped: capture.platformValidate !== capture.v52c2Validate,
        knownLoadOrder: capture.validateOrder.slice(0, 4),
        currentFinalIsFunction: typeof window.validateStudentAccess === 'function',
      };
    });
    expect(chain).toEqual({
      knownStagesAreFunctions: true,
      knownStagesAreDistinct: true,
      baseToSessionWrapped: true,
      sessionToPlatformWrapped: true,
      platformToV52C2Wrapped: true,
      knownLoadOrder: ['base', 'session', 'platform-polish', 'v52c2'],
      currentFinalIsFunction: true,
    });

    const sessionSource = fs.readFileSync(path.join(REPO_ROOT, 'site/v40-student-session.js'), 'utf8');
    const platformSource = fs.readFileSync(path.join(REPO_ROOT, 'site/v40-platform-polish.js'), 'utf8');
    const v52c2OwnerSource = fs.readFileSync(path.join(REPO_ROOT, 'site/topical-legacy-student-route.js'), 'utf8');
    expect(sessionSource).toContain('const validateStudentAccessV40Base = validateStudentAccess;');
    expect(sessionSource).toContain('return validateStudentAccessV40Base(requestedPurpose);');
    expect(platformSource).toContain('const validateBase = validateStudentAccess;');
    expect(platformSource).toContain('const access = await validateBase(purpose);');
    expect(v52c2OwnerSource).toContain('/* V5.2C.2 — Topical Practice result UX polish.');
    expect(v52c2OwnerSource).toContain('const base=validateStudentAccess;');
    expect(v52c2OwnerSource).toContain('const access=await base(purpose);');

    const changedSite = git(['diff', '--name-only', BASE_SHA, '--', 'site'])
      .split(/\r?\n/)
      .filter(Boolean)
      .sort();
    expect(changedSite).toEqual(Object.keys(RUNTIME_SUCCESSORS).sort());

    for (const [pathname, expected] of Object.entries(RUNTIME_SUCCESSORS)) {
      expect(gitBlob(pathname), `${pathname} successor bytes changed`).toBe(expected);
    }
    for (const [pathname, expected] of Object.entries(FROZEN_HIGH_RISK_BLOBS)) {
      expect(gitBlob(pathname), `${pathname} must remain byte-identical`).toBe(expected);
    }

    expect(workingManifestHash('site', new Set(Object.keys(RUNTIME_SUCCESSORS)))).toBe(EXPECTED_FROZEN_SITE_SHA256);
    expect(workingManifestHash('supabase')).toBe(EXPECTED_SUPABASE_SHA256);
    expect(git(['rev-parse', 'HEAD:supabase'])).toBe(EXPECTED_SUPABASE_TREE);
    expect(git(['diff', '--name-only', BASE_SHA, '--', 'supabase'])).toBe('supabase/v581b_assignment_checkpoint_and_attribution_hardening.sql');
  });
});
