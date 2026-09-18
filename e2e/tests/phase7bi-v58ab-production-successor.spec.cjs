const { test, expect } = require('@playwright/test');
const {
  installSupabaseMock,
  openApp,
  signInStudent,
  loginTeacher,
} = require('./helpers.cjs');

function captureProductionScripts(page) {
  const scripts = [];
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('.js')) scripts.push(pathname.split('/').pop());
  });
  return scripts;
}

function expectProductionBundleOnly(scripts) {
  expect(scripts.filter(name => name === 'v58ab-first-use-workspace-bundle.js')).toHaveLength(1);
  expect(scripts).not.toContain('v58a-student-first-use-experience.js');
  expect(scripts).not.toContain('v58b-teacher-workspace-consolidation.js');
}

test.describe('Phase 7B-I V58AB production successor', () => {
  test('student first-use CTA loads through the generated bundle and delegates to established Practice start', async ({ page }) => {
    const scripts = captureProductionScripts(page);
    const mock = await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);

    await expect.poll(() => page.evaluate(() => ({
      v58a: window.__v58aStudentFirstUseExperienceInstalled,
      v58b: window.__v58bTeacherWorkspaceInstalled,
      v58aApi: Object.keys(window.V58AStudentFirstUseExperience || {}).sort(),
      v58bApi: Object.keys(window.V58BTeacherWorkspaceConsolidation || {}).sort(),
    }))).toEqual({
      v58a: true,
      v58b: true,
      v58aApi: ['BADGE_SELECTOR','BLOCKING_PRIORITIES','CARD_ID','configureFirstPractice','eligible','firstPracticeState','priorityKind','render'],
      v58bApi: ['GROUPS','WORKSPACE_ID','ensureWorkspace','invokeTool','openPanel','refreshAvailability','toolByKey','toolReady'],
    });

    await expect(page.locator('#v571b-latest-achievement .v571b-badge[data-badge-id="first_practice"]')).toHaveCount(1, { timeout: 15_000 });
    await expect.poll(
      () => page.evaluate(() => window.GamificationStudent.refresh(true)),
      { timeout: 15_000 },
    ).toBe(true);
    await expect(page.locator('#v571b-latest-achievement .v571b-badge[data-badge-id="first_practice"]')).toHaveClass(/locked/);

    await page.evaluate(() => {
      const card = document.querySelector('.v57c-continue-card');
      if (card) card.dataset.v57cKind = '';
      window.__phase7biStartClicks = 0;
      document.getElementById('start-btn')?.addEventListener('click', () => {
        window.__phase7biStartClicks += 1;
      });
      window.V58AStudentFirstUseExperience.render();
    });

    await expect(page.locator('#v58a-first-use-card')).not.toHaveClass(/hidden/);
    await page.locator('#v58a-first-use-card .v58a-start').click();

    await expect.poll(() => page.evaluate(() => window.__phase7biStartClicks)).toBe(1);
    await expect(page.locator('#quiz')).toHaveClass(/active/);
    expect(await page.locator('#strand-filter').inputValue()).toBe('all');
    expect(await page.locator('#topic-filter').inputValue()).toBe('all');
    expect(await page.locator('#question-count').inputValue()).toBe('5');
    expect(await page.locator('#difficulty-filter').inputValue()).toBe('all');

    expectProductionBundleOnly(scripts);
    expect(mock.unexpectedWrites).toEqual([]);
  });

  test('teacher workspace loads through the generated bundle and delegates to existing teacher owners', async ({ page }) => {
    const scripts = captureProductionScripts(page);
    const mock = await installSupabaseMock(page);
    await openApp(page);
    await loginTeacher(page);

    await expect.poll(() => page.evaluate(() => Boolean(
      window.__v58aStudentFirstUseExperienceInstalled &&
      window.__v58bTeacherWorkspaceInstalled &&
      window.V58BTeacherWorkspaceConsolidation
    ))).toBe(true);

    await expect(page.locator('#v58b-teacher-workspace')).toHaveCount(1);
    await expect(page.locator('#v58b-teacher-workspace [data-v58b-tool]')).toHaveCount(15);

    await page.evaluate(() => {
      window.__phase7biTeacher = { analyticsClicks: 0, feedbackClicks: 0 };
      document.querySelector('#teacher .tab[data-panel="analytics-panel"]')?.addEventListener('click', () => {
        window.__phase7biTeacher.analyticsClicks += 1;
      });
      document.getElementById('v5763-teacher-feedback-icon')?.addEventListener('click', () => {
        window.__phase7biTeacher.feedbackClicks += 1;
      });
    });

    await page.locator('#v58b-teacher-workspace [data-v58b-tool="analytics"]').click();
    await page.locator('#v58b-teacher-workspace [data-v58b-tool="feedback"]').click();

    await expect(page.locator('#v576-feedback-inbox-overlay')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__phase7biTeacher.feedbackClicks)).toBe(1);
    await page.locator('#v576-teacher-close').click();
    await expect(page.locator('#v576-feedback-inbox-overlay')).toHaveClass(/hidden/);

    await page.locator('#v58b-teacher-workspace [data-v58b-tool="student-reports"]').click();

    await expect.poll(() => page.evaluate(() => window.__phase7biTeacher)).toEqual({
      analyticsClicks: 2,
      feedbackClicks: 1,
    });
    await expect(page.locator('#v58b-teacher-workspace-status')).toContainText(
      'Choose a student in Analytics, then open the existing Student report from that learner profile.',
    );

    expectProductionBundleOnly(scripts);
    expect(mock.unexpectedWrites).toEqual([]);
  });
});
