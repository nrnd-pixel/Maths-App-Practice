const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const {
  installSupabaseMock,
  openApp,
  signInStudent,
} = require('./helpers.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BASE_SHA = '162205ba76b08f31f0ea4bbb14cc6f5fc85c56a3';
const EXPECTED_SUPABASE_TREE = '19dd92c4e1f1d7c3ab9fc522d1b1cdf191afc456';

const ALLOWED_SITE_CHANGES = new Set([
  'site/index.html',
  'site/v40-learning-priorities.js',
  'site/v57c-student-continue-learning-home.js',
  'site/gamification-student.js',
  'site/v58a-student-first-use-experience.js',
]);

const FROZEN_BLOBS = Object.freeze({
  'site/v39-student-polish.js': '4daea69a282d99f7e8a07bd4aeaa26dcaaaf86ad',
  'site/v40-student-platform.js': 'c200fd22365d54178696b5f12e6866c8b4edbfed',
  'site/v40-platform-polish.js': '5ebdcb4c8d6a8a4c5fad19fa14dfaea2561d102b',
  'site/v40-release.js': 'a308df11b601bf563b56d555e9f434652e524d77',
  'site/v40-student-session.js': '52150813ff7eeeff72cbc98ab1cafff180d32c96',
  'site/v40-start-shell.js': '26280684b65275ea13656b3e423a8a3ce81cd9e9',
  'site/v40-student-nav.js': '86855f09db9ce2900008e50d10b2f685caa87c56',
  'site/v40-learn-setup.js': 'bfa85adc8261684a91da87f720fa3e9af24ac677',
  'site/gamification-core.js': '87d6175270284e4b40c3a1fbcd196622179d0402',
  'site/v41-signin-guard.js': '5794576f4c41e32ae8bb081e380ff892ef5f4a6c',
  'site/v52b1-question-bank-observer-gate.js': '82a87ffed9091b76c9008a3949c3bd432c2d06ce',
});

const STATIC_SELECTORS = Object.freeze({
  hub: '#start .v39-home-hub',
  hero: '#start .v40-learning-hub-hero',
  dashboard: '#start .v40c3-home-dashboard',
  continueCard: '#start .v57c-continue-card',
  assignmentCard: '#start [data-v57c-card="assignments"]',
  recommendationCard: '#start [data-v57c-card="recommendation"]',
  recentCard: '#start [data-v57c-card="recent"]',
  xpCard: '#v571a-gamification-card',
  achievementCard: '#v571b-latest-achievement',
  missionsCard: '#v572-weekly-missions-card',
  classChallengeCard: '#v574-class-challenge-card',
  firstUseCard: '#v58a-first-use-card',
});

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

async function installStaticCapture(page) {
  await page.addInitScript(selectors => {
    window.__option2bCapture = { initial: {}, reload: null };
    const capture = () => {
      for (const [key, selector] of Object.entries(selectors)) {
        window.__option2bCapture.initial[key] = document.querySelector(selector);
      }
      window.__option2bCapture.initialStartClass = document.getElementById('start')?.className || '';
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', capture, { once: true });
    else capture();
  }, STATIC_SELECTORS);
}

async function waitForOption2bRuntime(page) {
  await expect.poll(
    () => page.evaluate(() => Boolean(
      window.V57CStudentContinueLearningHome &&
      window.GamificationStudent &&
      window.V58AStudentFirstUseExperience
    )),
    { timeout: 15_000 },
  ).toBe(true);
}

async function waitForHomeRendered(page) {
  await expect.poll(
    () => page.evaluate(() => document.querySelector('#start .v40c3-home-dashboard')?.dataset?.v57cRendered === 'true'),
    { timeout: 15_000 },
  ).toBe(true);
}

function homeModel(name = 'Fixture Student') {
  return {
    student: { student_name: name },
    assignments: [],
    checkpoints: [],
    progress: { student: { student_name: name }, recent: [] },
    recommendation: {
      student: { student_name: name },
      recommended_count: 0,
      practice_scope: 'mixed',
      focus_strand: null,
      focus_topic: null,
      reason: '',
    },
  };
}

function missionsPayload(title = 'Question Quest') {
  return {
    week: {
      start_date: '2026-09-07',
      end_date: '2026-09-13',
      today: '2026-09-10',
      timezone: 'Asia/Brunei',
    },
    summary: { completed: 0, total: 1, all_complete: false },
    missions: [{
      id: 'fixture_mission',
      title,
      description: 'Complete five Practice questions.',
      icon: '🎯',
      progress: 2,
      raw_progress: 2,
      target: 5,
      unit: 'questions',
      complete: false,
      action: 'learn',
    }],
    rules: {
      question_target: 5,
      practice_day_target: 2,
      meaningful_questions_per_day: 5,
      challenge_target: 1,
      week_starts: 'Monday',
      timezone: 'Asia/Brunei',
      exam_activity_counts: false,
    },
  };
}

function challengePayload(enabled, className = '6A') {
  return {
    class: {
      class_id: 'fixture-class',
      class_name: className,
      year_level: 6,
      active_students: 20,
    },
    week: {
      start_date: '2026-09-07',
      end_date: '2026-09-13',
      today: '2026-09-10',
      timezone: 'Asia/Brunei',
    },
    challenge: {
      enabled,
      questions_completed: enabled ? 80 : 0,
      target_questions: 200,
      contributors: enabled ? 11 : 0,
      progress_percent: enabled ? 40 : 0,
      complete: false,
    },
    settings: {
      challenge_enabled: enabled,
      questions_per_active_student: 10,
      allowed_questions_per_active_student: [5, 10, 15, 20],
    },
  };
}

test.describe('Option 2B static authenticated Home hard gates', () => {
  test('gate 1 — authenticated Home skeleton exists in raw index.html before staged JavaScript', async ({ request }) => {
    const response = await request.get('/');
    expect(response.ok()).toBe(true);
    const html = await response.text();

    expect(html).toContain('class="v39-home-hub v40-platform-ready"');
    expect(html).toContain('class="v40-learning-hub-hero"');
    expect(html).toContain('class="v40c3-home-dashboard v40c3-ready"');
    expect(html).toContain('data-v40-static-home="true"');

    for (const token of [
      'class="v57c-continue-card"',
      'data-v57c-card="assignments"',
      'data-v57c-card="recommendation"',
      'data-v57c-card="recent"',
      'id="v571a-gamification-card"',
      'id="v571b-latest-achievement"',
      'id="v572-weekly-missions-card"',
      'id="v574-class-challenge-card"',
      'id="v58a-first-use-card"',
    ]) {
      expect((html.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || [])).toHaveLength(1);
    }

    expect(html).toContain('Preparing your next learning step');
    expect(html).toContain('#start.v40-shell-logged-out .v40c3-home-dashboard');
  });

  test('gate 2 — all static Home card containers keep exact DOM identity through enhancement', async ({ page }) => {
    await installStaticCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await waitForOption2bRuntime(page);
    await waitForHomeRendered(page);

    const identity = await page.evaluate(selectors => {
      const initial = window.__option2bCapture?.initial || {};
      return Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, initial[key] === document.querySelector(selector)]));
    }, STATIC_SELECTORS);

    for (const [key, same] of Object.entries(identity)) expect(same, `${key} identity changed`).toBe(true);
  });

  test('gate 3 — repeated sign-in cycles never duplicate or reconstruct the static Home containers', async ({ page }) => {
    await installStaticCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await waitForOption2bRuntime(page);
    await waitForHomeRendered(page);

    await page.locator('#v40c-student-logout').click();
    await expect(page.locator('.v40c-session-panel')).not.toHaveClass(/v40c-authenticated/);
    await signInStudent(page);
    await waitForHomeRendered(page);

    const result = await page.evaluate(selectors => {
      const initial = window.__option2bCapture.initial;
      const counts = {};
      const identities = {};
      for (const [key, selector] of Object.entries(selectors)) {
        counts[key] = document.querySelectorAll(selector).length;
        identities[key] = initial[key] === document.querySelector(selector);
      }
      return { counts, identities };
    }, STATIC_SELECTORS);

    for (const [key, count] of Object.entries(result.counts)) expect(count, `${key} duplicated`).toBe(1);
    for (const [key, same] of Object.entries(result.identities)) expect(same, `${key} reconstructed`).toBe(true);
  });

  test('gate 4 — Student A logout then Student B render leaves no Home personalization from Student A', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await waitForOption2bRuntime(page);
    await waitForHomeRendered(page);

    await page.evaluate(({ model, missions, challenge }) => {
      window.V57CStudentContinueLearningHome.render(model);
      window.GamificationStudent.xp.render({ xp: { total: 321 } });
      window.GamificationStudent.missions.render(missions);
      window.GamificationStudent.classChallenge.render(challenge);
    }, {
      model: homeModel('Student Alpha'),
      missions: missionsPayload('Alpha Mission'),
      challenge: challengePayload(true, 'Alpha Class'),
    });

    await expect(page.locator('#start .v40-learning-hub-hero')).toContainText('Student Alpha');
    await expect(page.locator('#v571a-gamification-card')).toContainText('321');
    await expect(page.locator('#v572-weekly-missions-card')).toContainText('Alpha Mission');
    await expect(page.locator('#v574-class-challenge-card')).toContainText('Alpha Class');

    await page.locator('#v40c-student-logout').click();
    await expect(page.locator('.v40c-session-panel')).not.toHaveClass(/v40c-authenticated/);
    await expect.poll(
      () => page.locator('#start .v40c3-home-dashboard').innerText(),
      { timeout: 8_000 },
    ).not.toContain('Student Alpha');

    const afterLogout = await page.locator('#start .v40c3-home-dashboard').innerText();
    expect(afterLogout).not.toContain('321');
    expect(afterLogout).not.toContain('Alpha Mission');
    expect(afterLogout).not.toContain('Alpha Class');

    await signInStudent(page);
    await waitForHomeRendered(page);
    await page.evaluate(({ model, missions, challenge }) => {
      window.V57CStudentContinueLearningHome.render(model);
      window.GamificationStudent.xp.render({ xp: { total: 654 } });
      window.GamificationStudent.missions.render(missions);
      window.GamificationStudent.classChallenge.render(challenge);
    }, {
      model: homeModel('Student Beta'),
      missions: missionsPayload('Beta Mission'),
      challenge: challengePayload(true, 'Beta Class'),
    });

    const betaText = await page.locator('#start').innerText();
    expect(betaText).toContain('Student Beta');
    expect(betaText).toContain('654');
    expect(betaText).toContain('Beta Mission');
    expect(betaText).toContain('Beta Class');
    expect(betaText).not.toContain('Student Alpha');
    expect(betaText).not.toContain('Alpha Mission');
    expect(betaText).not.toContain('Alpha Class');
  });

  test('gate 5 — V57C enhances the four static learning cards instead of replacing them', async ({ page }) => {
    await installStaticCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await waitForOption2bRuntime(page);
    await waitForHomeRendered(page);

    const state = await page.evaluate(() => ({
      continueSame: window.__option2bCapture.initial.continueCard === document.querySelector('#start .v57c-continue-card'),
      assignmentsSame: window.__option2bCapture.initial.assignmentCard === document.querySelector('#start [data-v57c-card="assignments"]'),
      recommendationSame: window.__option2bCapture.initial.recommendationCard === document.querySelector('#start [data-v57c-card="recommendation"]'),
      recentSame: window.__option2bCapture.initial.recentCard === document.querySelector('#start [data-v57c-card="recent"]'),
      rendered: document.querySelector('#start .v40c3-home-dashboard')?.dataset?.v57cRendered,
    }));

    expect(state).toEqual({
      continueSame: true,
      assignmentsSame: true,
      recommendationSame: true,
      recentSame: true,
      rendered: 'true',
    });
  });

  test('gate 6 — XP card is enhanced in place and logout resets rather than removes it', async ({ page }) => {
    await installStaticCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await waitForOption2bRuntime(page);

    await expect(page.locator('#v571a-gamification-card')).not.toHaveClass(/hidden/, { timeout: 15_000 });
    expect(await page.evaluate(() => window.__option2bCapture.initial.xpCard === document.getElementById('v571a-gamification-card'))).toBe(true);

    await page.locator('#v40c-student-logout').click();
    await expect(page.locator('#v571a-gamification-card')).toHaveCount(1);
    await expect(page.locator('#v571a-gamification-card')).toHaveClass(/hidden/);
    expect(await page.evaluate(() => window.__option2bCapture.initial.xpCard === document.getElementById('v571a-gamification-card'))).toBe(true);
    expect(await page.locator('#v571a-gamification-card').innerText()).not.toContain('Maths Starter');
  });

  test('gate 7 — weekly missions card is enhanced in place and survives reset', async ({ page }) => {
    await installStaticCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await waitForOption2bRuntime(page);

    await expect(page.locator('#v572-weekly-missions-card')).not.toHaveClass(/hidden/, { timeout: 15_000 });
    expect(await page.evaluate(() => window.__option2bCapture.initial.missionsCard === document.getElementById('v572-weekly-missions-card'))).toBe(true);

    await page.locator('#v40c-student-logout').click();
    await expect(page.locator('#v572-weekly-missions-card')).toHaveCount(1);
    await expect(page.locator('#v572-weekly-missions-card')).toHaveClass(/hidden/);
    expect(await page.evaluate(() => window.__option2bCapture.initial.missionsCard === document.getElementById('v572-weekly-missions-card'))).toBe(true);
  });

  test('gate 8 — class challenge uses one static card and toggles enabled/disabled without create/remove', async ({ page }) => {
    await installStaticCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await waitForOption2bRuntime(page);

    await page.evaluate(payload => window.GamificationStudent.classChallenge.render(payload), challengePayload(true, '6B'));
    await expect(page.locator('#v574-class-challenge-card')).not.toHaveClass(/hidden/);
    await expect(page.locator('#v574-class-challenge-card')).toContainText('6B');
    expect(await page.evaluate(() => window.__option2bCapture.initial.classChallengeCard === document.getElementById('v574-class-challenge-card'))).toBe(true);

    await page.evaluate(payload => window.GamificationStudent.classChallenge.render(payload), challengePayload(false, '6B'));
    await expect(page.locator('#v574-class-challenge-card')).toHaveCount(1);
    await expect(page.locator('#v574-class-challenge-card')).toHaveClass(/hidden/);
    expect(await page.evaluate(() => window.__option2bCapture.initial.classChallengeCard === document.getElementById('v574-class-challenge-card'))).toBe(true);
    expect(await page.locator('#v574-class-challenge-card').innerText()).not.toContain('6B');
  });

  test('gate 9 — V58A first-use card toggles one static node instead of creating/removing it', async ({ page }) => {
    await installStaticCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await waitForOption2bRuntime(page);
    await waitForHomeRendered(page);

    await expect(page.locator('#v571b-latest-achievement .v571b-badge[data-badge-id="first_practice"]')).toHaveCount(1, { timeout: 15_000 });
    await page.evaluate(() => window.V58AStudentFirstUseExperience.render());
    await expect(page.locator('#v58a-first-use-card')).not.toHaveClass(/hidden/);
    expect(await page.evaluate(() => window.__option2bCapture.initial.firstUseCard === document.getElementById('v58a-first-use-card'))).toBe(true);

    await page.evaluate(() => {
      document.querySelector('#v571b-latest-achievement .v571b-badge[data-badge-id="first_practice"]')?.classList.replace('locked', 'earned');
      window.dispatchEvent(new CustomEvent('v571b:achievements-updated'));
    });
    await expect(page.locator('#v58a-first-use-card')).toHaveClass(/hidden/, { timeout: 8_000 });
    await expect(page.locator('#v58a-first-use-card')).toHaveCount(1);
    expect(await page.evaluate(() => window.__option2bCapture.initial.firstUseCard === document.getElementById('v58a-first-use-card'))).toBe(true);
  });

  test('gate 10 — repeated V57C renders bind actions idempotently', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await waitForOption2bRuntime(page);
    await waitForHomeRendered(page);

    await page.evaluate(model => {
      window.__option2bAssignmentClicks = 0;
      document.getElementById('my-assignments-btn')?.addEventListener('click', () => {
        window.__option2bAssignmentClicks += 1;
      });
      for (let i = 0; i < 5; i += 1) window.V57CStudentContinueLearningHome.render(model);
    }, homeModel('Idempotent Student'));

    await page.locator('#start .v57c-assignments').click();
    expect(await page.evaluate(() => window.__option2bAssignmentClicks)).toBe(1);
  });

  test('gate 11 — restored session reload exposes the static Home immediately when authenticated shell activates', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await waitForOption2bRuntime(page);
    await waitForHomeRendered(page);

    await page.addInitScript(() => {
      window.__option2bReloadProbe = { staticAtDomReady: false, authSample: null };
      document.addEventListener('DOMContentLoaded', () => {
        const start = document.getElementById('start');
        const dashboard = document.querySelector('#start .v40c3-home-dashboard');
        const card = document.querySelector('#start .v57c-continue-card');
        window.__option2bReloadProbe.staticAtDomReady = Boolean(dashboard && card);
        const sample = () => {
          if (!start?.classList.contains('v40-shell-authenticated') || window.__option2bReloadProbe.authSample) return;
          window.__option2bReloadProbe.authSample = {
            dashboardExists: Boolean(dashboard),
            continueExists: Boolean(card),
            dashboardReady: dashboard?.classList.contains('v40c3-ready') || false,
            childCount: dashboard?.children?.length || 0,
            text: String(card?.textContent || '').trim(),
            display: dashboard ? getComputedStyle(dashboard).display : 'missing',
          };
        };
        sample();
        new MutationObserver(sample).observe(start, { attributes: true, attributeFilter: ['class'] });
      }, { once: true });
    });

    await page.reload();
    await expect.poll(
      () => page.evaluate(() => Boolean(window.__option2bReloadProbe?.authSample)),
      { timeout: 15_000 },
    ).toBe(true);

    const probe = await page.evaluate(() => window.__option2bReloadProbe);
    expect(probe.staticAtDomReady).toBe(true);
    expect(probe.authSample.dashboardExists).toBe(true);
    expect(probe.authSample.continueExists).toBe(true);
    expect(probe.authSample.dashboardReady).toBe(true);
    expect(probe.authSample.childCount).toBeGreaterThan(0);
    expect(probe.authSample.text.length).toBeGreaterThan(0);
    expect(probe.authSample.display).not.toBe('none');
  });

  test('gate 12 — frozen V39/V40/core/downstream boundaries and complete Supabase tree remain exact', async () => {
    for (const [pathname, expected] of Object.entries(FROZEN_BLOBS)) {
      expect(gitBlob(pathname), `${pathname} changed`).toBe(expected);
    }

    const changedSite = git(['diff', '--name-only', BASE_SHA, '--', 'site'])
      .split(/\r?\n/)
      .filter(Boolean);
    for (const pathname of changedSite) {
      expect(ALLOWED_SITE_CHANGES.has(pathname), `unapproved site change: ${pathname}`).toBe(true);
    }

    const changedSupabase = git(['diff', '--name-only', BASE_SHA, '--', 'supabase']);
    expect(changedSupabase).toBe('');
    expect(git(['rev-parse', `${BASE_SHA}:supabase`])).toBe(EXPECTED_SUPABASE_TREE);
  });
});
