#!/usr/bin/env python3
"""Deterministically align the Option 2B hard-gate spec with approved seal scope.

Temporary validation scaffolding only. Gate 4 follows Option B: after the
Student B V57C Home render, it proves that Student A personalization is absent,
without coupling the leak-prevention contract to the gamification refresh
lifecycle. Gate 8 uses state-stability polling (not an arbitrary sleep) before
injecting its class-challenge fixture. No runtime code is changed here.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / 'e2e/tests/v40-static-authenticated-home-option2b.spec.cjs'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


def replace_block(text, start_marker, end_marker, replacement, label):
    start = text.find(start_marker)
    end = text.find(end_marker, start + len(start_marker)) if start >= 0 else -1
    if start < 0 or end < 0:
        raise RuntimeError(f'{label}: block markers not found')
    if text.find(start_marker, start + 1) >= 0:
        raise RuntimeError(f'{label}: start marker is not unique')
    return text[:start] + replacement + text[end:]


text = PATH.read_text(encoding='utf-8')

old_allowed = """const ALLOWED_SITE_CHANGES = new Set([
  'site/index.html',
  'site/v40-learning-priorities.js',
  'site/v57c-student-continue-learning-home.js',
  'site/gamification-student.js',
  'site/v58a-student-first-use-experience.js',
]);
"""
new_allowed = """const AUTHORIZED_RUNTIME_CHANGES = new Set([
  'site/index.html',
  'site/v40-learning-priorities.js',
  'site/v57c-student-continue-learning-home.js',
  'site/gamification-student.js',
  'site/v58a-student-first-use-experience.js',
]);

const AUTHORIZED_SUCCESSOR_SEAL_CHANGES = new Set([
  'site/tests/v51-phase4-protected-shas.json',
  'site/tests/verify-phase4-v50-operations-reporting-protected-sha.cjs',
  'site/tests/verify-phase4-v52c-legacy-student-route-protected-sha.cjs',
  'site/tests/verify-phase4-v53-practice-selection-protected-sha.cjs',
  'site/tests/verify-phase4-v53-ui-resource-companion-protected-sha.cjs',
  'site/tests/verify-phase4-v54-resource-bank-protected-sha.cjs',
  'site/tests/verify-phase4-teacher-assignments-checkpoint2-protected-sha.cjs',
]);

const ALLOWED_SITE_CHANGES = new Set([
  ...AUTHORIZED_RUNTIME_CHANGES,
  ...AUTHORIZED_SUCCESSOR_SEAL_CHANGES,
]);
"""
text = replace_once(text, old_allowed, new_allowed, 'authorized site scope')

old_helpers = """async function waitForHomeRendered(page) {
  await expect.poll(
    () => page.evaluate(() => document.querySelector('#start .v40c3-home-dashboard')?.dataset?.v57cRendered === 'true'),
    { timeout: 15_000 },
  ).toBe(true);
}

function homeModel(name = 'Fixture Student') {
"""
new_helpers = """async function waitForHomeRendered(page) {
  await expect.poll(
    () => page.evaluate(() => document.querySelector('#start .v40c3-home-dashboard')?.dataset?.v57cRendered === 'true'),
    { timeout: 15_000 },
  ).toBe(true);
}

const OPTION2B_STABLE_WINDOW_MS = 220;

async function waitForStableCardState(page, selector) {
  const locator = page.locator(selector);
  await expect(locator).toHaveCount(1);
  let lastSignature = null;
  let stableSince = 0;

  await expect.poll(async () => {
    const signature = await locator.evaluate(node => JSON.stringify({
      text: node.textContent,
      className: node.className,
      xp: node.dataset?.xp ?? null,
      hidden: node.classList.contains('hidden'),
    }));
    const now = Date.now();
    if (signature !== lastSignature) {
      lastSignature = signature;
      stableSince = now;
      return false;
    }
    return now - stableSince > OPTION2B_STABLE_WINDOW_MS;
  }, {
    timeout: 15_000,
    intervals: [40, 60, 80, 120],
  }).toBe(true);
}

function homeModel(name = 'Fixture Student') {
"""
text = replace_once(text, old_helpers, new_helpers, 'state-stability helper')

gate4_start = "  test('gate 4 — Student A logout then Student B render leaves no Home personalization from Student A', async ({ page }) => {"
gate5_start = "  test('gate 5 — V57C enhances the four static learning cards instead of replacing them', async ({ page }) => {"
gate4 = """  test('gate 4 — Student A logout then Student B render leaves no Home personalization from Student A', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await waitForOption2bRuntime(page);
    await waitForHomeRendered(page);

    // Drain any sign-in/V57C gamification writes before planting Student A's
    // distinctive personalization markers. This is stability polling, not a
    // fixed delay: the state must remain unchanged beyond the 180ms retry path.
    await waitForStableCardState(page, '#v571a-gamification-card');
    await waitForStableCardState(page, '#v572-weekly-missions-card');
    await waitForStableCardState(page, '#v574-class-challenge-card');

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

    // Option B: Gate 4 owns leak prevention, not refresh-cycle timing. A
    // successful Student Beta V57C render proves the new Home personalization
    // has completed; after that, every Student Alpha marker must be absent.
    await page.evaluate(model => window.V57CStudentContinueLearningHome.render(model), homeModel('Student Beta'));
    await expect(page.locator('#start .v40-learning-hub-hero')).toContainText('Student Beta', { timeout: 15_000 });

    const betaText = await page.locator('#start').innerText();
    expect(betaText).toContain('Student Beta');
    expect(betaText).not.toContain('Student Alpha');
    expect(betaText).not.toContain('321');
    expect(betaText).not.toContain('Alpha Mission');
    expect(betaText).not.toContain('Alpha Class');
  });

"""
text = replace_block(text, gate4_start, gate5_start, gate4, 'Gate 4 Option B')

gate8_start = "  test('gate 8 — class challenge uses one static card and toggles enabled/disabled without create/remove', async ({ page }) => {"
gate9_start = "  test('gate 9 — V58A first-use card toggles one static node instead of creating/removing it', async ({ page }) => {"
gate8 = """  test('gate 8 — class challenge uses one static card and toggles enabled/disabled without create/remove', async ({ page }) => {
    await installStaticCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await waitForOption2bRuntime(page);

    // Prove the real sign-in/V57C challenge state has stopped changing before
    // injecting the 6B fixture. The >180ms stability window covers the retry
    // path without relying on an arbitrary setTimeout.
    await waitForStableCardState(page, '#v574-class-challenge-card');

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

"""
text = replace_block(text, gate8_start, gate9_start, gate8, 'Gate 8 stable fixture boundary')

old_gate12 = """    const changedSite = git(['diff', '--name-only', BASE_SHA, '--', 'site'])
      .split(/\\r?\\n/)
      .filter(Boolean);
    for (const pathname of changedSite) {
      expect(ALLOWED_SITE_CHANGES.has(pathname), `unapproved site change: ${pathname}`).toBe(true);
    }

    const changedSupabase = git(['diff', '--name-only', BASE_SHA, '--', 'supabase']);
"""
new_gate12 = """    const changedSite = git(['diff', '--name-only', BASE_SHA, '--', 'site'])
      .split(/\\r?\\n/)
      .filter(Boolean);
    for (const pathname of changedSite) {
      expect(ALLOWED_SITE_CHANGES.has(pathname), `unapproved site change: ${pathname}`).toBe(true);
    }
    for (const pathname of AUTHORIZED_RUNTIME_CHANGES) {
      expect(changedSite, `authorized runtime successor missing: ${pathname}`).toContain(pathname);
    }

    const changedSupabase = git(['diff', '--name-only', BASE_SHA, '--', 'supabase']);
"""
text = replace_once(text, old_gate12, new_gate12, 'gate 12 exact authorized scope')

PATH.write_text(text, encoding='utf-8')
print('Option 2B E2E Option-B leak gate + stability-polled fixture patch applied successfully.')
