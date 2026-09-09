const { test, expect } = require('@playwright/test');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const {
  STUDENT,
  installSupabaseMock,
  openApp,
  signInStudent,
} = require('./helpers.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_FROZEN_SITE_SHA256 = '__EXPECTED_FROZEN_SITE_SHA256__';
const EXPECTED_SUPABASE_SHA256 = '__EXPECTED_SUPABASE_SHA256__';
const EXPECTED_SUPABASE_TREE = '19dd92c4e1f1d7c3ab9fc522d1b1cdf191afc456';

const ALLOWED_SITE_CHANGES = new Set([
  'site/index.html',
  'site/v40-student-session.js',
  'site/v40-start-shell.js',
]);

const FROZEN_HIGH_RISK_BLOBS = Object.freeze({
  'site/v40-platform-polish.js': '5ebdcb4c8d6a8a4c5fad19fa14dfaea2561d102b',
  'site/v40-release.js': 'a308df11b601bf563b56d555e9f434652e524d77',
  'site/v41-signin-guard.js': '5794576f4c41e32ae8bb081e380ff892ef5f4a6c',
  'site/v41-mastery-progress.js': '49b8705335510cbc5df029f20b9a335e9c944e64',
  'site/v40-student-nav.js': '86855f09db9ce2900008e50d10b2f685caa87c56',
  'site/v40-learn-setup.js': 'bfa85adc8261684a91da87f720fa3e9af24ac677',
  'site/v40-learning-priorities.js': 'b2fa5bd838681c5bbe1838498393747c80c6f61e',
  'site/version.js': 'fa82bfbdb978bb927a9e0fb930cd692816571b0d',
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

function workingManifestHash(root, excluded = new Set()) {
  const output = git(['ls-files', '-co', '--exclude-standard', root]);
  const paths = output
    ? [...new Set(output.split(/\r?\n/).filter(Boolean))].sort()
    : [];

  const records = paths
    .filter(pathname => !excluded.has(pathname))
    .map(pathname => `${gitBlob(pathname)}  ${pathname}`);

  return crypto
    .createHash('sha256')
    .update(records.length ? `${records.join('\n')}\n` : '')
    .digest('hex');
}

async function installLifecycleCapture(page) {
  await page.addInitScript(() => {
    window.__option2aCapture = {
      studentId: null,
      studentPin: null,
      studentIdParent: null,
      studentPinParent: null,
      badge: null,
      baseValidate: null,
      sessionValidate: null,
      platformValidate: null,
      initialStartClass: '',
    };

    const captureStatic = () => {
      const capture = window.__option2aCapture;
      const studentId = document.getElementById('student-id');
      const studentPin = document.getElementById('student-pin');

      capture.studentId = studentId;
      capture.studentPin = studentPin;
      capture.studentIdParent = studentId?.closest('label')?.parentElement || null;
      capture.studentPinParent = document.getElementById('student-pin-wrap')?.parentElement || null;
      capture.badge = document.querySelector('#start .brand .badge');
      capture.baseValidate = window.validateStudentAccess;
      capture.initialStartClass = document.getElementById('start')?.className || '';

      const observer = new MutationObserver(records => {
        records.forEach(record => {
          record.addedNodes.forEach(node => {
            if (!(node instanceof HTMLScriptElement)) return;
            const src = String(node.getAttribute('src') || '');

            if (src.includes('v40-student-session.js')) {
              node.addEventListener('load', () => {
                capture.sessionValidate = window.validateStudentAccess;
              }, { once: true });
            }

            if (src.includes('v40-platform-polish.js')) {
              node.addEventListener('load', () => {
                capture.platformValidate = window.validateStudentAccess;
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
  });
}

async function waitForStudentRuntime(page) {
  await expect.poll(
    () => page.evaluate(() => Boolean(
      window.__v41PracticeTicketRotationInstalled &&
      window.__v41StudentPinEnterGuardInstalled &&
      window.MathAppVersion?.CURRENT_RELEASE?.version
    )),
    { timeout: 12_000 },
  ).toBe(true);
}

async function fulfillOpenAccessPolicy(route) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify({
      access_mode: 'open',
      student_id_required: false,
      pin_required: false,
    }),
  });
}

test.describe('Option 2A static V40 student sign-in shell hard gates', () => {
  test('gate 1 — raw index.html already contains the complete logged-out sign-in shell before staged JS', async ({ request }) => {
    const response = await request.get('/');
    expect(response.ok()).toBe(true);
    const html = await response.text();

    expect(html).toContain('<section id="start" class="card screen active v40-shell-logged-out">');
    expect((html.match(/class="v40c-session-panel"/g) || [])).toHaveLength(1);
    expect((html.match(/id="student-id"/g) || [])).toHaveLength(1);
    expect((html.match(/id="student-pin"/g) || [])).toHaveLength(1);
    expect((html.match(/id="v40c-student-signin"/g) || [])).toHaveLength(1);
    expect((html.match(/id="v40c-student-logout"/g) || [])).toHaveLength(1);

    const panelStart = html.indexOf('<section class="v40c-session-panel"');
    const panelEnd = html.indexOf('</section>', panelStart);
    expect(panelStart).toBeGreaterThan(-1);
    expect(panelEnd).toBeGreaterThan(panelStart);

    const panelHtml = html.slice(panelStart, panelEnd + '</section>'.length);
    expect(panelHtml).toContain('<h3>Student sign in</h3>');
    expect(panelHtml).toContain('id="student-id"');
    expect(panelHtml).toContain('id="student-pin"');
    expect(panelHtml).toContain('id="student-access-note"');
    expect(panelHtml).toContain('Sign in to Learning Hub');
    expect(panelStart).toBeLessThan(html.indexOf('<div class="mode-switch"'));
  });

  test('gate 2 — Student ID and PIN are the exact same DOM nodes before and after V40 enhancement', async ({ page }) => {
    await installLifecycleCapture(page);
    await installSupabaseMock(page);
    await openApp(page);

    const identity = await page.evaluate(() => {
      const capture = window.__option2aCapture;
      const id = document.getElementById('student-id');
      const pin = document.getElementById('student-pin');
      return {
        idSame: capture.studentId === id,
        pinSame: capture.studentPin === pin,
        idParentSame: capture.studentIdParent === id?.closest('label')?.parentElement,
        pinParentSame: capture.studentPinParent === document.getElementById('student-pin-wrap')?.parentElement,
        idParentClass: id?.closest('label')?.parentElement?.className || '',
        pinParentClass: document.getElementById('student-pin-wrap')?.parentElement?.className || '',
      };
    });

    expect(identity).toEqual({
      idSame: true,
      pinSame: true,
      idParentSame: true,
      pinParentSame: true,
      idParentClass: 'v40c-login-fields',
      pinParentClass: 'v40c-login-fields',
    });
  });

  test('gate 3 — enhancement is idempotent: one panel, one sign-in and one logout after repeated policy/setup events', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);

    await page.evaluate(() => {
      window.renderStudentAccessPolicy?.();
      window.renderStudentAccessPolicy?.();
      window.renderStudentAccessPolicy?.();
      document.dispatchEvent(new Event('DOMContentLoaded'));
    });

    await expect(page.locator('#start .v40c-session-panel')).toHaveCount(1);
    await expect(page.locator('#v40c-student-signin')).toHaveCount(1);
    await expect(page.locator('#v40c-student-logout')).toHaveCount(1);
    await expect(page.locator('#start .v40c-session-panel')).toHaveAttribute('data-v40-session-enhanced', 'true');
  });

  test('gate 4 — validateStudentAccess composes base → V40 session → V40 platform-polish without collapsing wrappers', async ({ page }) => {
    await installLifecycleCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await waitForStudentRuntime(page);

    await expect.poll(
      () => page.evaluate(() => Boolean(
        window.__option2aCapture?.baseValidate &&
        window.__option2aCapture?.sessionValidate &&
        window.__option2aCapture?.platformValidate
      )),
      { timeout: 12_000 },
    ).toBe(true);

    const chain = await page.evaluate(() => {
      const capture = window.__option2aCapture;
      return {
        baseVsSession: capture.baseValidate !== capture.sessionValidate,
        sessionVsPlatform: capture.sessionValidate !== capture.platformValidate,
        finalIsPlatform: window.validateStudentAccess === capture.platformValidate,
        rotationInstalled: window.__v41PracticeTicketRotationInstalled === true,
      };
    });

    expect(chain).toEqual({
      baseVsSession: true,
      sessionVsPlatform: true,
      finalIsPlatform: true,
      rotationInstalled: true,
    });
  });

  test('gate 5 — V41 Enter guard signs in through the final access wrapper and never activates Start Practice', async ({ page }) => {
    const mock = await installSupabaseMock(page);
    await openApp(page);
    await waitForStudentRuntime(page);

    await page.evaluate(() => {
      window.__option2aStartClicks = 0;
      document.getElementById('start-btn')?.addEventListener('click', () => {
        window.__option2aStartClicks += 1;
      }, true);
    });

    await page.locator('#student-id').fill(STUDENT.id);
    await page.locator('#student-pin').fill(STUDENT.pin);
    await page.locator('#student-pin').press('Enter');

    await expect(page.locator('.v40c-session-panel')).toHaveClass(/v40c-authenticated/);
    await expect(page.locator('#start')).toHaveClass(/v40-shell-authenticated/);

    expect(await page.evaluate(() => window.__v41StudentPinEnterGuardInstalled)).toBe(true);
    expect(await page.evaluate(() => window.__option2aStartClicks)).toBe(0);
    expect(mock.rpcCalls.some(call => call.rpc === 'validate_student_access' && call.body.p_purpose === 'practice')).toBe(true);
    expect(mock.rpcCalls.some(call => call.rpc === 'validate_student_access' && call.body.p_purpose === 'exam')).toBe(true);
    expect(mock.rpcCalls.some(call => call.rpc === 'get_student_practice_questions_v53d3')).toBe(false);
  });

  test('gate 6 — static shell preserves both protected PIN policy and open-access policy rendering', async ({ page, browser }) => {
    await installSupabaseMock(page);
    await openApp(page);

    await expect(page.locator('#student-pin-wrap')).toBeVisible();
    await expect(page.locator('#student-id')).toHaveAttribute('required', '');
    await expect(page.locator('#student-pin')).toHaveAttribute('required', '');
    await expect(page.locator('#student-access-note')).toContainText('Protected access');
    await expect(page.locator('.v40c-session-panel')).toHaveCount(1);

    const openPage = await browser.newPage();
    await installSupabaseMock(openPage);
    await openPage.route('**/rest/v1/rpc/get_student_access_policy', fulfillOpenAccessPolicy);
    await openPage.goto('/');

    await expect(openPage.locator('#cloud-status')).toContainText('Cloud Connected');
    await expect(openPage.locator('#v40c-student-signin')).toBeVisible();
    await expect(openPage.locator('#student-pin-wrap')).toBeHidden();
    await expect(openPage.locator('#student-id')).not.toHaveAttribute('required', '');
    await expect(openPage.locator('#student-pin')).not.toHaveAttribute('required', '');
    await expect(openPage.locator('#student-access-note')).toContainText('Open access');
    await expect(openPage.locator('.v40c-session-panel')).toHaveCount(1);
    await openPage.close();
  });

  test('gate 7 — first parsed state is logged out and the same shell transitions to authenticated Home', async ({ page }) => {
    await installLifecycleCapture(page);
    await installSupabaseMock(page);
    await openApp(page);

    expect(await page.evaluate(() => window.__option2aCapture.initialStartClass)).toContain('v40-shell-logged-out');
    await expect(page.locator('#start')).toHaveClass(/v40-shell-logged-out/);
    await expect(page.locator('#start')).not.toHaveClass(/v40-shell-authenticated/);

    await signInStudent(page);

    await expect(page.locator('#start')).toHaveClass(/v40-shell-authenticated/);
    await expect(page.locator('#start')).not.toHaveClass(/v40-shell-logged-out/);
    await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'home');
    await expect(page.locator('.v40c-session-panel')).toHaveCount(1);
  });

  test('gate 8 — logout returns the same static shell to logged-out state without recreating controls', async ({ page }) => {
    await installLifecycleCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);

    await page.locator('#v40c-student-logout').click();

    await expect(page.locator('#start')).toHaveClass(/v40-shell-logged-out/);
    await expect(page.locator('#start')).not.toHaveClass(/v40-shell-authenticated/);
    await expect(page.locator('.v40c-session-panel')).not.toHaveClass(/v40c-authenticated/);
    await expect(page.locator('#student-id')).toBeEnabled();
    await expect(page.locator('#student-pin')).toBeEnabled();
    await expect(page.locator('#student-id')).toHaveValue('');
    await expect(page.locator('#student-pin')).toHaveValue('');
    await expect(page.locator('.v40c-session-panel')).toHaveCount(1);
    await expect(page.locator('#v40c-student-signin')).toHaveCount(1);
    await expect(page.locator('#v40c-student-logout')).toHaveCount(1);

    const sameNodes = await page.evaluate(() => ({
      id: window.__option2aCapture.studentId === document.getElementById('student-id'),
      pin: window.__option2aCapture.studentPin === document.getElementById('student-pin'),
    }));
    expect(sameNodes).toEqual({ id: true, pin: true });
  });

  test('gate 9 — restored session enhances the newly parsed static shell without PIN retention or duplicate reconstruction', async ({ page }) => {
    await installLifecycleCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);

    await page.reload();

    await expect(page.locator('#cloud-status')).toContainText('Cloud Connected');
    await expect(page.locator('.v40c-session-panel')).toHaveClass(/v40c-authenticated/);
    await expect(page.locator('#start')).toHaveClass(/v40-shell-authenticated/);
    await expect(page.locator('#start')).not.toHaveClass(/v40-shell-logged-out/);
    await expect(page.locator('.v40c-session-identity-text')).toContainText(STUDENT.name);
    await expect(page.locator('#student-pin')).toHaveValue('');
    await expect(page.locator('#student-pin')).toBeDisabled();
    await expect(page.locator('.v40c-session-panel')).toHaveCount(1);
    await expect(page.locator('#v40c-student-signin')).toHaveCount(1);
    await expect(page.locator('#v40c-student-logout')).toHaveCount(1);

    const sameNodes = await page.evaluate(() => ({
      id: window.__option2aCapture.studentId === document.getElementById('student-id'),
      pin: window.__option2aCapture.studentPin === document.getElementById('student-pin'),
    }));
    expect(sameNodes).toEqual({ id: true, pin: true });
  });

  test('gate 10 — version.js updates the same static badge node from the staged-list-derived release identity', async ({ page }) => {
    await installLifecycleCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await waitForStudentRuntime(page);

    const identity = await page.evaluate(() => {
      const badge = document.querySelector('#start .brand .badge');
      return {
        sameBadge: window.__option2aCapture.badge === badge,
        badgeCount: document.querySelectorAll('#start .brand .badge').length,
        badgeText: badge?.textContent?.trim() || '',
        releaseBadge: window.MathAppVersion?.CURRENT_RELEASE?.badge || '',
        releaseVersion: window.MathAppVersion?.CURRENT_RELEASE?.version || '',
      };
    });

    expect(identity.sameBadge).toBe(true);
    expect(identity.badgeCount).toBe(1);
    expect(identity.releaseVersion).toBe('5.8.1');
    expect(identity.badgeText).toBe(identity.releaseBadge);
    expect(identity.badgeText).toBe('Version 5.8.1 • Stable Release');
  });

  test('gate 11 — V40 staged order and nested V41/current consolidated loader topology are unchanged', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await waitForStudentRuntime(page);

    const topology = await page.evaluate(() => {
      const staged = Array.from(window.MATH_APP_STAGED_SCRIPTS || []);
      const v40 = staged.filter(src => /\/v40[^/]*\.js(?:$|\?)/.test(src));
      const scriptSources = [...document.scripts].map(script => String(script.getAttribute('src') || ''));
      return {
        v40,
        hasV41Guard: scriptSources.some(src => src.includes('v41-signin-guard.js')),
        hasV41Mastery: scriptSources.some(src => src.includes('v41-mastery-progress.js')),
        sessionIndex: staged.indexOf('./v40-student-session.js'),
        platformIndex: staged.indexOf('./v40-platform-polish.js'),
        releaseIndex: staged.indexOf('./v40-release.js'),
        shellIndex: staged.indexOf('./v40-start-shell.js'),
      };
    });

    expect(topology.v40).toEqual([
      './v40-student-platform.js',
      './v40-student-nav.js',
      './v40-student-session.js',
      './v40-learn-setup.js',
      './v40-learning-priorities.js',
      './v40-platform-polish.js',
      './v40-release.js',
      './v40-start-shell.js',
    ]);
    expect(topology.hasV41Guard).toBe(true);
    expect(topology.hasV41Mastery).toBe(true);
    expect(topology.sessionIndex).toBeLessThan(topology.platformIndex);
    expect(topology.platformIndex).toBeLessThan(topology.releaseIndex);
    expect(topology.releaseIndex).toBeLessThan(topology.shellIndex);
  });

  test('gate 12 — every out-of-scope site byte and the complete Supabase tree remain frozen', async () => {
    expect(EXPECTED_FROZEN_SITE_SHA256).not.toContain('__EXPECTED_');
    expect(EXPECTED_SUPABASE_SHA256).not.toContain('__EXPECTED_');

    expect(workingManifestHash('site', ALLOWED_SITE_CHANGES)).toBe(EXPECTED_FROZEN_SITE_SHA256);
    expect(workingManifestHash('supabase')).toBe(EXPECTED_SUPABASE_SHA256);
    expect(git(['rev-parse', 'HEAD:supabase'])).toBe(EXPECTED_SUPABASE_TREE);

    for (const [pathname, expected] of Object.entries(FROZEN_HIGH_RISK_BLOBS)) {
      expect(gitBlob(pathname), `${pathname} must remain byte-identical`).toBe(expected);
    }
  });
});
