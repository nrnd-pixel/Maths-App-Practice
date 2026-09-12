'use strict';
// V5.9A successor — test-first acceptance contract for the refreshed Student Home.
//
// This spec intentionally targets the future presentation layer while exercising
// the CURRENT consolidated learning owners underneath it. It must not be weakened
// to make implementation easier. The runtime is expected to delegate to accepted
// Practice, Continue Learning, gamification, first-use, feedback and navigation
// controls rather than creating a second learning/data engine.

const { test, expect } = require('@playwright/test');
const {
  STUDENT,
  installSupabaseMock,
  openApp,
  signInStudent,
  startPractice,
} = require('./helpers.cjs');

const FUTURE_RUNTIME = 'site/v59a-student-home-refresh.js';
const PROFILE = '#v59a-student-profile';
const SHORTCUTS = '#v59a-practice-shortcuts';
const MOBILE_NAV = '#v59a-mobile-nav';
const MORE_SHEET = '#v59a-more-sheet';

async function openStudentHome(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  const mock = await installSupabaseMock(page);
  await openApp(page);
  await signInStudent(page);

  await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'home');
  await expect(page.locator('#start .v57c-continue-card')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#v571a-gamification-card')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#v572-weekly-missions-card')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#v571b-latest-achievement')).toBeVisible({ timeout: 10_000 });
  return mock;
}

async function returnHomeThroughAcceptedNav(page) {
  await page.evaluate(() => {
    document.querySelector('#start .v40-student-nav [data-v40-nav="home"]')?.click();
  });
  await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'home');
}

async function installClickProbe(page, selector, key) {
  await page.evaluate(({ selector, key }) => {
    const node = document.querySelector(selector);
    if (!node) throw new Error(`Missing accepted delegated control: ${selector}`);
    window.__v59aClickProbe = window.__v59aClickProbe || {};
    window.__v59aClickProbe[key] = 0;
    node.addEventListener('click', () => {
      window.__v59aClickProbe[key] += 1;
    });
  }, { selector, key });
}

async function clickProbeCount(page, key) {
  return page.evaluate(key => window.__v59aClickProbe?.[key] || 0, key);
}

async function runtimeContract(page) {
  return page.evaluate(() => {
    const api = window.V59AStudentHomeRefresh;
    const descriptor = Object.getOwnPropertyDescriptor(window, 'V59AStudentHomeRefresh');
    return {
      installed: window.__v59aStudentHomeRefreshInstalled === true,
      apiObject: !!api && typeof api === 'object',
      apiFrozen: !!api && Object.isFrozen(api),
      apiWritable: descriptor?.writable,
      apiConfigurable: descriptor?.configurable,
    };
  });
}

test.describe('V5.9A successor — Student Home acceptance contract', () => {
  test('A — one presentation module renders profile identity from accepted student + gamification state', async ({ page }) => {
    await openStudentHome(page);

    const contract = await runtimeContract(page);
    expect(contract.installed).toBe(true);
    expect(contract.apiObject).toBe(true);
    expect(contract.apiFrozen).toBe(true);
    expect(contract.apiWritable).toBe(false);
    expect(contract.apiConfigurable).toBe(false);

    const profile = page.locator(PROFILE);
    await expect(profile).toBeVisible();
    await expect(profile.locator('[data-v59a-student-name]')).toHaveText(STUDENT.name);
    await expect(profile.locator('[data-v59a-year-class]')).toContainText(`Year ${STUDENT.year}`);
    await expect(profile.locator('[data-v59a-year-class]')).toContainText(STUDENT.className);

    const accepted = await page.evaluate(() => {
      const card = document.getElementById('v571a-gamification-card');
      return {
        level: card?.querySelector('.v571a-level-title')?.textContent?.trim() || '',
        xp: card?.querySelector('.v571a-xp-label')?.textContent?.replace(/^⭐\s*/, '').trim() || '',
        progress: card?.querySelector('.v571a-progress')?.getAttribute('aria-valuenow') || '',
        streak: card?.querySelector('.v571b-streak-chip')?.textContent?.trim() || '',
      };
    });

    await expect(profile.locator('[data-v59a-level]')).toContainText(accepted.level);
    await expect(profile.locator('[data-v59a-xp]')).toContainText(accepted.xp);
    await expect(profile.locator('[data-v59a-xp-progress]')).toHaveAttribute('aria-valuenow', accepted.progress);
    await expect(profile.locator('[data-v59a-streak]')).toContainText(accepted.streak);
  });

  test('B — Continue Learning delegates to the existing V5.7C primary action', async ({ page }) => {
    await openStudentHome(page);
    await expect(page.locator(PROFILE)).toBeVisible();
    await expect(page.locator('#start .v57c-primary')).toBeEnabled();

    await installClickProbe(page, '#start .v57c-primary', 'continue');
    await page.locator('[data-v59a-action="continue"]').click();

    expect(await clickProbeCount(page, 'continue')).toBe(1);
    await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'learn');
  });

  test('C — Mixed, Topic and Past Paper tiles set the accepted Past Paper core Practice type', async ({ page }) => {
    await openStudentHome(page);
    await expect(page.locator(SHORTCUTS)).toBeVisible();

    for (const type of ['mixed', 'topic', 'past_paper']) {
      await page.locator(`${SHORTCUTS} [data-v59a-practice-type="${type}"]`).click();
      await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'learn');
      await expect.poll(async () => page.evaluate(() => window.V55APastPaperPractice?.getPracticeType?.()))
        .toBe(type);
      await returnHomeThroughAcceptedNav(page);
    }
  });

  test('D — accepted Home owner nodes remain single-source and the V5.8A first-use card is preserved', async ({ page }) => {
    await openStudentHome(page);
    await expect(page.locator(PROFILE)).toBeVisible();

    await expect(page.locator('#v571a-gamification-card')).toHaveCount(1);
    await expect(page.locator('#v572-weekly-missions-card')).toHaveCount(1);
    await expect(page.locator('#v571b-latest-achievement')).toHaveCount(1);
    await expect(page.locator('#v574-class-challenge-card, #v573-class-challenge-card')).toHaveCount(1);
    await expect(page.locator('#v58a-first-use-card')).toHaveCount(1);
    await expect(page.locator('#v58a-first-use-card')).toBeVisible();

    const before = await page.evaluate(() => ({
      level: document.getElementById('v571a-gamification-card')?.dataset?.level || '',
      xp: document.getElementById('v571a-gamification-card')?.dataset?.xp || '',
      missionText: document.getElementById('v572-weekly-missions-card')?.textContent || '',
    }));

    await page.locator('[data-v59a-action="missions-toggle"]').click();

    const after = await page.evaluate(() => ({
      level: document.getElementById('v571a-gamification-card')?.dataset?.level || '',
      xp: document.getElementById('v571a-gamification-card')?.dataset?.xp || '',
      missionText: document.getElementById('v572-weekly-missions-card')?.textContent || '',
    }));

    expect(after.level).toBe(before.level);
    expect(after.xp).toBe(before.xp);
    expect(after.missionText).toBe(before.missionText);
  });

  test('E — mobile Home / Practice / Progress / Badges / More navigation delegates to accepted controls', async ({ page }) => {
    await openStudentHome(page);

    const nav = page.locator(MOBILE_NAV);
    await expect(nav).toBeVisible();
    for (const [key, label] of [
      ['home', 'Home'],
      ['practice', 'Practice'],
      ['progress', 'Progress'],
      ['badges', 'Badges'],
      ['more', 'More'],
    ]) {
      await expect(nav.locator(`[data-v59a-nav="${key}"]`)).toContainText(label);
    }

    await nav.locator('[data-v59a-nav="practice"]').click();
    await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'learn');
    await returnHomeThroughAcceptedNav(page);

    await installClickProbe(page, '#my-progress-btn', 'progress');
    await nav.locator('[data-v59a-nav="progress"]').click();
    expect(await clickProbeCount(page, 'progress')).toBe(1);

    await returnHomeThroughAcceptedNav(page);
    await nav.locator('[data-v59a-nav="badges"]').click();
    await expect(page.locator('#v571b-latest-achievement details')).toHaveAttribute('open', '');

    await nav.locator('[data-v59a-nav="more"]').click();
    await expect(page.locator(MORE_SHEET)).toBeVisible();

    for (const [key, selector] of [
      ['assignments', '#my-assignments-btn'],
      ['reviewed', '#check-reviewed-btn'],
      ['feedback', '#v576-send-feedback'],
    ]) {
      await installClickProbe(page, selector, `more-${key}`);
      await page.locator(`${MORE_SHEET} [data-v59a-more="${key}"]`).click();
      expect(await clickProbeCount(page, `more-${key}`)).toBe(1);
      if (key !== 'feedback') {
        await returnHomeThroughAcceptedNav(page);
        await nav.locator('[data-v59a-nav="more"]').click();
        await expect(page.locator(MORE_SHEET)).toBeVisible();
      }
    }
  });

  test('F — bottom navigation cannot bypass an active Practice session', async ({ page }) => {
    await openStudentHome(page);
    await expect(page.locator(MOBILE_NAV)).toBeVisible();
    await startPractice(page);
    await expect(page.locator('#quiz')).toHaveClass(/active/);

    for (const key of ['home', 'progress', 'badges', 'more']) {
      await page.locator(`${MOBILE_NAV} [data-v59a-nav="${key}"]`).click({ force: true });
      await expect(page.locator('#quiz')).toHaveClass(/active/);
      await expect(page.locator(MORE_SHEET)).not.toBeVisible();
    }
  });

  test('G — genuinely new students keep the accepted V5.8A first-Practice path', async ({ page }) => {
    await openStudentHome(page);
    await expect(page.locator(PROFILE)).toBeVisible();
    await expect(page.locator('#v58a-first-use-card')).toBeVisible();
    await expect(page.locator('#v58a-first-use-card .v58a-start')).toBeVisible();

    await page.locator('#v58a-first-use-card .v58a-start').click();
    await expect(page.locator('#quiz')).toHaveClass(/active/, { timeout: 10_000 });
  });

  test('H — V5.9A adds no Exam promotion and pure Home presentation interactions add no RPC/write authority', async ({ page }) => {
    const mock = await openStudentHome(page);
    const profile = page.locator(PROFILE);
    await expect(profile).toBeVisible();

    const rpcBefore = mock.rpcCalls.length;
    const writesBefore = mock.unexpectedWrites.length;
    const unhandledBefore = mock.unhandledRpcCalls.length;

    await page.locator(`${MOBILE_NAV} [data-v59a-nav="more"]`).click();
    await expect(page.locator(MORE_SHEET)).toBeVisible();
    await page.locator(`${MORE_SHEET} [data-v59a-more-close]`).click();
    await page.locator('[data-v59a-action="missions-toggle"]').click();
    await page.locator('[data-v59a-action="missions-toggle"]').click();

    expect(mock.rpcCalls.length).toBe(rpcBefore);
    expect(mock.unexpectedWrites.length).toBe(writesBefore);
    expect(mock.unhandledRpcCalls.length).toBe(unhandledBefore);

    const promotedExam = await page.locator([
      PROFILE,
      SHORTCUTS,
      MOBILE_NAV,
      MORE_SHEET,
      '[data-v59a-surface="continue"]',
    ].join(',')).evaluateAll(nodes => nodes.some(node => {
      const text = (node.textContent || '').toLowerCase();
      return text.includes('exam mode') || !!node.querySelector('[data-v59a-practice-type="exam"],[data-v59a-nav="exam"]');
    }));
    expect(promotedExam).toBe(false);
  });
});

// Static contract readers use this literal to ensure the successor remains one
// V5.9A runtime layer rather than recreating the old v59a1-v59a4 patch chain.
void FUTURE_RUNTIME;
