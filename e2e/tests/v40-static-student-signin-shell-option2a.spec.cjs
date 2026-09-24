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
const EXPECTED_FROZEN_SITE_SHA256 = '87f9f732061cb5e5251d07af055454e68a91b5fd9d7f0acd6af469b6f70c3de8';
const EXPECTED_SUPABASE_SHA256 = 'b9ce6bc01ead2f39b3aadab4f0a0688fa5c54bf8129258e776972636c17b4ef3';
const EXPECTED_SUPABASE_TREE = '27b8fdc47b6e56b4e54f6ad749827e631ce84110';
const AUTHORIZED_SUPABASE_RECONCILIATION = Object.freeze({
  'supabase/20260907073416_add_adaptive_route_preview_v1.sql': 'd00b2284dd639f58ef16de880cb995346b5532d9',
  'supabase/20260907080542_adaptive_pilot_feature_gate_v1.sql': '5565dfd1a4e67384cf69a61188b1e3452a24af39',
  'supabase/20260907150643_v59b_interactive_adaptive_diagnostic_pilot.sql': '28454d0b3bb19972be5915271842b36d920d3aba',
  'supabase/20260914134600_student_adaptive_question_readiness_v2.sql': 'da88c946334f07912735c3afd3c27073ab318d24',
  'supabase/20260915023000_adaptive_diagnostic_server_readiness_v2.sql': 'fe61768b9dbbb9d8fbfb6909a71e799dbfdd2c95',
  'supabase/20260916010000_adaptive_pilot_lifecycle_telemetry_v1.sql': 'c37fb6a97185cc58035ed03715c2ff803086bcf3',
});

const ALLOWED_SITE_CHANGES = new Set([
  'site/assignments-student.js',
  'site/index.html',
  'site/config.js',
  'site/question-bank-audit-multipart.js',
  'site/question-bank-metadata-review.js',
  'site/question-bank-selection-qa.js',
  'site/v52-topical-activation-guard.js',
  'site/v52-teacher-topical-library.js',
  'site/tests/verify-v5.1b2d-correction-audit-history.cjs',
  'site/v52b1-question-bank-observer-gate.js',
  'site/tests/verify-v5.2b1-question-bank-observer-gate.cjs',
  'site/v52b1-question-bank-performance.js',
  'site/tests/verify-v5.2b1-question-bank-performance.cjs',
  'site/v39cd-dashboard-state-bundle.js',
  'site/v576-feedback-presentation-bundle.js',
  'site/v58ab-first-use-workspace-bundle.js',
  'site/v58c-parent-summary-presentation-bundle.js',
  'site/tests/verify-v5.8c-parent-friendly-student-report.cjs',
  'site/tests/verify-v5.8d-content-workflow-consolidation.cjs',
  'site/tests/verify-v5.8-stable-release-checkpoint.cjs',
  'site/tests/verify-v5.7.6-classroom-feedback-support.cjs',
  'site/tests/verify-v5.7.6.3-teacher-feedback-header-icon.cjs',
  'site/tests/verify-v5.8a-student-first-use-experience.cjs',
  'site/tests/verify-v5.8b-teacher-workspace-consolidation.cjs',
  'site/tests/verify-v59a-student-home-refresh-test-contract.cjs',
  'site/v59a-student-home-refresh.js',
  'site/tests/verify-v5.9b-adaptive-diagnostic-pilot-v2.cjs',
  'site/v59b-adaptive-diagnostic-pilot-v2.js',
  'site/past-paper-assignments.js',
  'site/tests/v51-phase4-protected-shas.json',
  'site/tests/verify-phase4-gamification-checkpoint2-integrity.cjs',
  'site/tests/verify-phase4-past-paper-v55-checkpoint1-integrity.cjs',
  'site/tests/verify-phase4-past-paper-v56-v57-checkpoint1-integrity.cjs',
  'site/tests/verify-phase4-teacher-assignments-checkpoint2-protected-sha.cjs',
  'site/tests/verify-phase4-teacher-assignments-v44-v48-checkpoint2-integrity.cjs',
  'site/tests/verify-phase4-v50-operations-reporting-integrity.cjs',
  'site/tests/verify-phase4-v50-operations-reporting-protected-sha.cjs',
  'site/tests/verify-phase4-v51-question-bank-management-integrity.cjs',
  'site/tests/verify-phase4-v51-question-bank-management-protected-sha.cjs',
  'site/tests/verify-phase4-v52c-legacy-student-route-integrity.cjs',
  'site/tests/verify-phase4-v52c-legacy-student-route-protected-sha.cjs',
  'site/tests/verify-phase4-v53-practice-selection-dormant-reference-integrity.cjs',
  'site/tests/verify-phase4-v53-practice-selection-protected-sha.cjs',
  'site/tests/verify-phase4-v53-ui-resource-companion-dormant-reference-integrity.cjs',
  'site/tests/verify-phase4-v53-ui-resource-companion-integrity.cjs',
  'site/tests/verify-phase4-v53-ui-resource-companion-protected-sha.cjs',
  'site/tests/verify-phase4-v54-resource-bank-dormant-reference-integrity.cjs',
  'site/tests/verify-phase4-v54-resource-bank-integrity.cjs',
  'site/tests/verify-phase4-v54-resource-bank-protected-sha.cjs',
  'site/tests/verify-question-metadata-v2-schema-contract.cjs',
  'site/tests/verify-adaptive-question-readiness-v2.cjs',
  'site/tests/verify-adaptive-diagnostic-server-readiness-v2.cjs',
  'site/tests/verify-phase5c-wrapper-chain-coverage.cjs',
  'site/tests/verify-v5.1.cjs',
  'site/tests/verify-v5.4a-resource-bank-visibility.cjs',
  'site/tests/verify-v5.8.1b-checkpoint-attribution.cjs',
  'site/tests/verify-v5.8.2-past-paper-completion-dedup.cjs',
  'site/v40-start-shell.js',
  'site/v40-student-session.js',
  'site/demo/index.html',
  'site/viewer-demo/index.html',
  'site/demo-student/index.html',
  'site/tests/verify-v5.9-current-live-demo.cjs',
  'site/tests/verify-v5.9-demo-viewer-access.cjs',
  'site/tests/verify-v5.9-demo-student-questions.cjs',

  'site/icon-192.png',
  'site/icon-512.png',
  'site/sw.js',
  'site/manifest.json',
  'site/v59c-result-celebration.js',
  'site/v59d-streak-urgency.js',]);

const FROZEN_HIGH_RISK_BLOBS = Object.freeze({
  'site/v40-platform-polish.js': '5ebdcb4c8d6a8a4c5fad19fa14dfaea2561d102b',
  'site/v40-release.js': 'a308df11b601bf563b56d555e9f434652e524d77',
  'site/v41-signin-guard.js': '5794576f4c41e32ae8bb081e380ff892ef5f4a6c',
  'site/v41-mastery-progress.js': '49b8705335510cbc5df029f20b9a335e9c944e64',
  'site/v40-student-nav.js': '8a0fa4431de98be56c189f906ea9ba3f0bdf4fc3',
  'site/v40-learn-setup.js': '9293a79306455f2cfeb3ad0525e7203ad26de7e5',
  'site/v40-learning-priorities.js': 'bfec5b47eaf266486d21c96acdb4e1cfd677b328',
  'site/version.js': 'fa82bfbdb978bb927a9e0fb930cd692816571b0d',
});

// Phase 7B-D authorizes exact successors for these maintained verifiers. Keep
// their pre-successor blobs in the historical remainder calculation so the
// established frozen hash continues to prove every other site byte unchanged.
const PHASE7BD_REPLACED_SITE_BASELINE_BLOBS = Object.freeze({
  'site/question-bank-metadata-review.js': '5571f6ea2ee33479f5dd0ad75a418249c10ba664',
  'site/question-bank-selection-qa.js': '65df39b8a93c1c95bc3c5cdd4049070e7e18c8bf',
  'site/v52-topical-activation-guard.js': '7ece6302bc0faf9066db9e1b615810ad63c5f0fa',
  'site/v52-teacher-topical-library.js': '25a2e7eb176eb100ab852fc664379e5716feb6de',
  'site/v52b1-question-bank-observer-gate.js': '82a87ffed9091b76c9008a3949c3bd432c2d06ce',
  'site/tests/verify-v5.2b1-question-bank-observer-gate.cjs': 'e0c51954d485f5b090650e24b05b4ff0071537cd',
  'site/v52b1-question-bank-performance.js': '87124f4bc252289203409fc0abe614748ed1dd86',
  'site/tests/verify-v5.2b1-question-bank-performance.cjs': '160679754284a8158aaf6bf025a9530183eb9fbf',
  'site/question-bank-audit-multipart.js': '6738e89a7a4a98693b7303a05714c7419d562407',
  'site/tests/verify-v5.1b2d-correction-audit-history.cjs': '016562130bb8a7f601301f8d37819a060f0c06a6',
  'site/tests/verify-v5.7.6-classroom-feedback-support.cjs': '8033886865b0621313fbb8a0f9d6af38e53d499b',
  'site/tests/verify-v5.7.6.3-teacher-feedback-header-icon.cjs': '844feccd2cee26352f3c0d38219f03ee9e246e48',
  'site/tests/verify-v5.8a-student-first-use-experience.cjs': '0b65819da2d6285841e719c43d2606b2b2d15b69',
  'site/tests/verify-v5.8b-teacher-workspace-consolidation.cjs': 'c78833c57b21792f4f1960baa5a54a906d4a4a9b',
  'site/tests/verify-v5.8c-parent-friendly-student-report.cjs': '8cb7a721f645c39d9198cc90127c63696929df1a',
  'site/tests/verify-v5.8d-content-workflow-consolidation.cjs': '700c94d2ab07b3585a96194ce87a89eaf00f1ed0',
  'site/tests/verify-v5.8-stable-release-checkpoint.cjs': 'eabecf938d48ce6040973a0cd4e8c65ac9401818',
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

function workingManifestHash(root, excluded = new Set(), baselineBlobs = {}) {
  const output = git(['ls-files', '-co', '--exclude-standard', root]);
  const paths = output
    ? [...new Set(output.split(/\r?\n/).filter(Boolean))].sort()
    : [];

  const records = paths
    .filter(pathname => !excluded.has(pathname) || baselineBlobs[pathname])
    .map(pathname => `${baselineBlobs[pathname] || gitBlob(pathname)}  ${pathname}`);

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
        idParentHasBaseClass: id?.closest('label')?.parentElement?.classList.contains('v40c-login-fields') || false,
        pinParentHasBaseClass: document.getElementById('student-pin-wrap')?.parentElement?.classList.contains('v40c-login-fields') || false,
      };
    });

    expect(identity).toEqual({
      idSame: true,
      pinSame: true,
      idParentSame: true,
      pinParentSame: true,
      idParentHasBaseClass: true,
      pinParentHasBaseClass: true,
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
        finalIsFunction: typeof window.validateStudentAccess === 'function',
        finalIsNotBase: window.validateStudentAccess !== capture.baseValidate,
        finalIsNotSession: window.validateStudentAccess !== capture.sessionValidate,
        rotationInstalled: window.__v41PracticeTicketRotationInstalled === true,
      };
    });

    expect(chain).toEqual({
      baseVsSession: true,
      sessionVsPlatform: true,
      finalIsFunction: true,
      finalIsNotBase: true,
      finalIsNotSession: true,
      rotationInstalled: true,
    });

    await page.locator('#student-id').fill(STUDENT.id);
    await page.locator('#student-pin').fill(STUDENT.pin);
    const access = await page.evaluate(() => window.validateStudentAccess('practice'));
    expect(access?.access_token).toBeTruthy();

    const storage = await page.evaluate(() => ({
      session: JSON.parse(sessionStorage.getItem('mathStudentSessionV40') || 'null'),
      pool: JSON.parse(sessionStorage.getItem('mathPracticeTicketPoolV41B') || 'null'),
    }));
    expect(storage.session?.tokens?.practice).toBeTruthy();
    expect(storage.session?.tokens?.exam).toBeTruthy();
    expect(storage.pool?.currentToken).toBeTruthy();
    expect(Number(storage.pool?.baseCreatedAt || 0)).toBe(Number(storage.session?.createdAt || 0));
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
  });

  test('gate 6 — static shell preserves both protected PIN policy and open-access policy rendering', async ({ page, browser }) => {
    await installSupabaseMock(page);
    await openApp(page);

    await expect(page.locator('#student-pin-wrap')).toBeVisible();
    await expect(page.locator('#student-id-help')).toContainText('Required');
    await expect(page.locator('#student-pin-wrap .help')).toContainText('Your teacher provides or resets this PIN.');
    await expect(page.locator('#student-access-note')).toContainText('Enter your Student ID and PIN');
    await expect(page.locator('.v40c-session-panel')).toHaveCount(1);

    const openPage = await browser.newPage();
    await installSupabaseMock(openPage);
    await openPage.route('**/rest/v1/rpc/get_student_access_policy', fulfillOpenAccessPolicy);
    await openPage.goto('/');

    await expect(openPage.locator('#cloud-status')).toContainText('Cloud Connected');
    await expect(openPage.locator('#v40c-student-signin')).toBeVisible();
    await expect(openPage.locator('#student-pin-wrap')).toBeHidden();
    await expect(openPage.locator('#student-id-help')).toContainText('Optional');
    await expect(openPage.locator('#student-name-help')).toContainText('Required when access is open');
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
    expect(identity.releaseVersion).toBe('5.9');
    expect(identity.badgeText).toBe(identity.releaseBadge);
    expect(identity.badgeText).toBe('Version 5.9 • Stable Release');
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

    expect(workingManifestHash(
      'site',
      ALLOWED_SITE_CHANGES,
      PHASE7BD_REPLACED_SITE_BASELINE_BLOBS,
    )).toBe(EXPECTED_FROZEN_SITE_SHA256);
    const authorizedSupabase = new Set(Object.keys(AUTHORIZED_SUPABASE_RECONCILIATION));
    expect(workingManifestHash('supabase', authorizedSupabase)).toBe(EXPECTED_SUPABASE_SHA256);
    for (const [pathname, expected] of Object.entries(AUTHORIZED_SUPABASE_RECONCILIATION)) {
      expect(gitBlob(pathname), `${pathname} reconciled production bytes changed`).toBe(expected);
    }
    expect(git(['rev-parse', 'HEAD:supabase'])).toBe(EXPECTED_SUPABASE_TREE);

    for (const [pathname, expected] of Object.entries(FROZEN_HIGH_RISK_BLOBS)) {
      expect(gitBlob(pathname), `${pathname} must remain byte-identical`).toBe(expected);
    }
  });
});
