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
  expect(scripts.filter(name => name === 'v576-feedback-presentation-bundle.js')).toHaveLength(1);
  expect(scripts).not.toContain('v5761-feedback-trigger-position.js');
  expect(scripts).not.toContain('v5763-teacher-feedback-header-icon.js');
}

test.describe('Phase 7B-D V576 production successor', () => {
  test('student Home loads only the generated bundle and keeps feedback delegation', async ({ page }) => {
    const scripts = captureProductionScripts(page);
    const mock = await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);

    const legacyProxy = page.locator('#v5761-feedback-icon');
    await expect(legacyProxy).toHaveCount(1);
    await expect(legacyProxy).toBeHidden();
    await expect(legacyProxy).toHaveAttribute('aria-label', 'Send feedback');
    const currentProxy = page.locator('[data-v59a-profile-action="feedback"]');
    await expect(currentProxy).toHaveCount(1);
    await expect(currentProxy).toBeVisible();
    await expect(currentProxy).toHaveAttribute('aria-label', 'Send feedback');
    await expect(page.locator('#v576-send-feedback')).toHaveClass(/v5761-feedback-source/);
    await expect(page.locator('#v576-send-feedback')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => ({
      studentMarker: window.__v5761FeedbackTriggerPositionInstalled,
      teacherMarker: window.__v5763TeacherFeedbackHeaderIconInstalled,
      studentApi: Object.keys(window.V5761FeedbackTriggerPosition || {}),
      teacherApi: Object.keys(window.V5763TeacherFeedbackHeaderIcon || {}).sort(),
    }))).toEqual({
      studentMarker: true,
      teacherMarker: true,
      studentApi: ['positionTrigger'],
      teacherApi: ['organizeToolbar', 'positionTeacherTrigger'],
    });

    await currentProxy.click();
    await expect(page.locator('#v576-feedback-overlay')).not.toHaveClass(/hidden/);
    await expect(page.locator('#v576-feedback-overlay')).toBeVisible();
    expectProductionBundleOnly(scripts);
    expect(mock.unexpectedWrites).toEqual([]);
  });

  test('teacher Dashboard uses one bundled Feedback Inbox proxy in the reviewed toolbar order', async ({ page }) => {
    const scripts = captureProductionScripts(page);
    const mock = await installSupabaseMock(page);
    await openApp(page);
    await loginTeacher(page);

    const proxy = page.locator('#v5763-teacher-feedback-icon');
    await expect(proxy).toHaveCount(1);
    await expect(proxy).toBeVisible();
    await expect(proxy).toHaveAttribute('aria-label', 'Feedback Inbox');
    await expect(page.locator('#v576-feedback-inbox')).toHaveClass(/v5763-feedback-source/);
    await expect(page.locator('#v576-feedback-inbox')).toHaveCount(1);
    await expect.poll(() => page.locator('#v5763-teacher-primary-actions > *').evaluateAll(nodes =>
      nodes.map(node => node.id || (node.classList.contains('back-home') ? 'back-home' : node.className)),
    )).toEqual(['teacher-mode', 'refresh-btn', 'v5763-teacher-feedback-icon', 'back-home']);
    await expect.poll(() => page.locator('#v5763-teacher-account-actions > *').evaluateAll(nodes =>
      nodes.map(node => node.id),
    )).toEqual(['change-password-btn', 'signout-btn']);

    await proxy.click();
    await expect(page.locator('#v576-feedback-inbox-overlay')).not.toHaveClass(/hidden/);
    await expect(page.locator('#v576-feedback-inbox-overlay')).toBeVisible();
    expectProductionBundleOnly(scripts);
    expect(mock.unexpectedWrites).toEqual([]);
  });
});
