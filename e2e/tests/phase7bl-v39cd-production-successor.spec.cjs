const { test, expect } = require('@playwright/test');
const {
  installSupabaseMock,
  openApp,
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
  expect(scripts.filter(name => name === 'v39cd-dashboard-state-bundle.js')).toHaveLength(1);
  expect(scripts).not.toContain('v39-dashboard-polish.js');
  expect(scripts).not.toContain('v39-state-polish.js');
}

test.describe('Phase 7B-L V39CD production successor', () => {
  test('actual config loads one V39CD bundle and preserves Dashboard/Assignments presentation behavior', async ({ page }) => {
    const scripts = captureProductionScripts(page);
    await installSupabaseMock(page);
    await openApp(page);

    await expect.poll(() => scripts.filter(name => name === 'v39cd-dashboard-state-bundle.js').length)
      .toBe(1);
    await expect(page.locator('#v39-dashboard-polish-style')).toHaveCount(1);
    await expect(page.locator('#v39-state-polish-style')).toHaveCount(1);

    await expect(page.locator('#student-dashboard .v39-dashboard-intro')).toHaveCount(1);
    await expect(page.locator('#student-assignments .v39-assignments-intro')).toHaveCount(1);
    await expect(page.locator('#student-dashboard .v39-section-label')).toHaveCount(1);
    await expect(page.locator('#student-assignments .v39-section-label')).toHaveCount(1);

    const structure = await page.evaluate(() => {
      const dashboard = document.getElementById('student-dashboard');
      const assignments = document.getElementById('student-assignments');
      const summary = document.getElementById('student-dashboard-summary');
      const list = document.getElementById('student-assignments-list');
      const recommended = [...(dashboard?.querySelectorAll('h2,h3,h4') || [])]
        .find(node => /recommended practice/i.test(node.textContent || ''))
        ?.closest('.analytics-section') || null;
      return {
        acceptedOverviewAfterHeader:
          dashboard?.querySelector(':scope > .header')?.nextElementSibling?.id === 'v50-student-progress-overview',
        dashboardIntroAfterAcceptedOverview:
          document.getElementById('v50-student-progress-overview')?.nextElementSibling?.classList.contains('v39-dashboard-intro') || false,
        dashboardIntroRetiredByAcceptedOwner:
          dashboard?.querySelector('.v39-dashboard-intro')?.classList.contains('v50-retired-progress-source') || false,
        assignmentsIntroAfterHeader:
          assignments?.querySelector(':scope > .header')?.nextElementSibling?.classList.contains('v39-assignments-intro') || false,
        dashboardLabelBeforeSummary:
          summary?.previousElementSibling?.classList.contains('v39-section-label') || false,
        assignmentLabelBeforeList:
          list?.previousElementSibling?.classList.contains('v39-section-label') || false,
        recommendationAfterIntro:
          recommended?.previousElementSibling?.classList.contains('v39-dashboard-intro') || false,
        recommendationPrioritized: recommended?.dataset.v39Prioritized || '',
        stateStyleHasMobileContract:
          document.getElementById('v39-state-polish-style')?.textContent.includes('@media(max-width:520px)') || false,
      };
    });

    expect(structure).toEqual({
      acceptedOverviewAfterHeader: true,
      dashboardIntroAfterAcceptedOverview: true,
      dashboardIntroRetiredByAcceptedOwner: true,
      assignmentsIntroAfterHeader: true,
      dashboardLabelBeforeSummary: true,
      assignmentLabelBeforeList: true,
      recommendationAfterIntro: true,
      recommendationPrioritized: 'true',
      stateStyleHasMobileContract: true,
    });

    await page.evaluate(() => {
      const late = document.createElement('div');
      late.id = 'phase7bl-late-empty';
      late.className = 'empty';
      late.textContent = 'Late empty state';
      document.getElementById('student-dashboard')?.appendChild(late);
    });
    await expect(page.locator('#phase7bl-late-empty')).toHaveClass(/v39-empty-enhanced/);

    expectProductionBundleOnly(scripts);
  });
});
