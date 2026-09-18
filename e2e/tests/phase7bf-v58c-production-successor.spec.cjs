const { test, expect } = require('@playwright/test');
const {
  installSupabaseMock,
  openApp,
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
  expect(scripts.filter(name => name === 'v58c-parent-summary-presentation-bundle.js')).toHaveLength(1);
  expect(scripts).not.toContain('v58c-parent-friendly-student-report.js');
  expect(scripts).not.toContain('v58c-parent-summary-workspace-shortcut.js');
}

test.describe('Phase 7B-F V58C production successor', () => {
  test('teacher Dashboard loads only the generated V58C bundle and preserves Parent Summary flows', async ({ page }) => {
    const scripts = captureProductionScripts(page);
    const mock = await installSupabaseMock(page);
    await openApp(page);
    await loginTeacher(page);

    await expect.poll(() => page.evaluate(() => ({
      reportMarker: window.__v58cParentFriendlyStudentReportInstalled,
      shortcutMarker: window.__v58cParentSummaryWorkspaceShortcutInstalled,
      api: Object.keys(window.V58CParentFriendlyStudentReport || {}).sort(),
    }))).toEqual({
      reportMarker: true,
      shortcutMarker: true,
      api: ['buildSummary', 'nextStep', 'open'],
    });

    await expect(page.locator('#v58c-open-parent-summary')).toHaveCount(1);
    await expect(page.locator('#v58c-workspace-parent-summary')).toHaveCount(1);

    await page.evaluate(() => {
      globalThis.analyticsVisibleRows = [{
        key: 'phase7bf-student',
        student_name: 'Alya',
        student_id: 'S001',
        class_name: '6A',
        class_group: '6A',
        year_level: 6,
        registered: true,
        active: true,
        practice: 0,
        examStarted: 0,
        examSubmitted: 0,
        examFullyMarked: 0,
        inProgress: 0,
        incomplete: 0,
        awaitingReview: 0,
        examPercents: [],
        lastActivity: '',
      }];
      globalThis.selectedAnalyticsStudentKey = 'phase7bf-student';
      globalThis.analyticsLearningRows = [];
      globalThis.analyticsContext = { sessions: [], attempts: [], answers: [] };
      globalThis.learningBand = globalThis.learningBand || (() => ({ key: '', label: 'Learning evidence' }));
      globalThis.aggregateLearning = globalThis.aggregateLearning || (() => []);
      globalThis.analyticsAnswerScore = globalThis.analyticsAnswerScore || (() => ({ pending: false, possible: 0, awarded: 0 }));
      globalThis.analyticsFinalExamPercent = globalThis.analyticsFinalExamPercent || (() => null);
      globalThis.analyticsKey = globalThis.analyticsKey || (value => value?.key || '');
      globalThis.STRANDS = globalThis.STRANDS || {};
    });

    await page.locator('#v58c-open-parent-summary').click();
    await expect(page.locator('#v58c-parent-summary-overlay')).toBeVisible();
    await expect(page.locator('#v58c-parent-summary-title')).toContainText('Alya');
    await expect(page.locator('#v58c-parent-summary-overlay')).toContainText('Practice progress summary');
    await page.locator('#v58c-close').click();
    await expect(page.locator('#v58c-parent-summary-overlay')).toHaveClass(/hidden/);

    await page.locator('#v58c-workspace-parent-summary').click();
    await expect(page.locator('#v58b-teacher-workspace-status')).toContainText(
      'Choose a student in Analytics, then use 👪 Parent summary in that learner profile.',
    );

    expectProductionBundleOnly(scripts);
    expect(mock.unexpectedWrites).toEqual([]);
  });
});
