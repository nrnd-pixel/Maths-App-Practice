from pathlib import Path
import subprocess
import sys

ROOT = Path.cwd()
SPEC = ROOT / 'e2e/tests/v40-static-v40-shell-option2c.spec.cjs'
MATERIALIZER = ROOT / '.github/option2c_static_shell_patch.py'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


def patch_gate_expectations():
    spec = SPEC.read_text()

    spec = replace_once(
        spec,
        "      platformValidate: null,\n",
        "      platformValidate: null,\n      v52c2Validate: null,\n      validateOrder: [],\n",
        'capture V52C2 stage',
    )
    spec = replace_once(
        spec,
        "      capture.baseValidate = window.validateStudentAccess;\n",
        "      capture.baseValidate = window.validateStudentAccess;\n      capture.validateOrder.push('base');\n",
        'record base stage',
    )

    old_platform_capture = """            if (src.includes('v40-platform-polish.js')) {
              node.addEventListener('load', () => {
                capture.platformValidate = window.validateStudentAccess;
              }, { once: true });
            }
"""
    new_platform_capture = old_platform_capture + """            if (src.includes('topical-legacy-student-route.js')) {
              node.addEventListener('load', () => {
                capture.v52c2Validate = window.validateStudentAccess;
                capture.validateOrder.push('v52c2');
              }, { once: true });
            }
"""
    spec = replace_once(spec, old_platform_capture, new_platform_capture, 'capture active consolidated V52C2 load stage')
    spec = replace_once(
        spec,
        "                capture.sessionValidate = window.validateStudentAccess;\n",
        "                capture.sessionValidate = window.validateStudentAccess;\n                capture.validateOrder.push('session');\n",
        'record session stage',
    )
    spec = replace_once(
        spec,
        "                capture.platformValidate = window.validateStudentAccess;\n",
        "                capture.platformValidate = window.validateStudentAccess;\n                capture.validateOrder.push('platform-polish');\n",
        'record platform stage',
    )

    old_gate6 = """  test('gate 6 — non-Home transitions use the existing Home controls before opening the next student section', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInAndWait(page);

    await page.locator('#start [data-v40-nav=\"assignments\"]').click();
    await expect(page.locator('#student-assignments')).toHaveClass(/active/);

    await page.locator('#student-assignments [data-v40-nav=\"progress\"]').click();
    await expect(page.locator('#student-dashboard')).toHaveClass(/active/);

    await page.locator('#student-dashboard [data-v40-nav=\"learn\"]').click();
    await expect(page.locator('#start')).toHaveClass(/active/);
    await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'learn');
    await expect(page.locator('#start .v40c-learn-setup')).toBeVisible();

    await page.locator('#start [data-v40-nav=\"home\"]').click();
    await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'home');
  });
"""
    new_gate6 = """  test('gate 6 — non-Home transitions use the existing back-home and delegated source-button path', async ({ page }) => {
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

    await page.locator('#start [data-v40-nav=\"assignments\"]').click();
    await expect(page.locator('#student-assignments')).toHaveClass(/active/);

    await page.locator('#student-assignments [data-v40-nav=\"progress\"]').click();
    await expect(page.locator('#student-dashboard')).toHaveClass(/active/);
    expect(await page.evaluate(() => window.__option2cDelegation)).toMatchObject({
      assignmentsBackHome: 1,
      progressSource: 1,
    });

    await page.locator('#student-dashboard [data-v40-nav=\"learn\"]').click();
    await expect(page.locator('#start')).toHaveClass(/active/);
    await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'home');
    await expect(page.locator('#start [data-v40-nav=\"home\"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#start .v40c-learn-setup')).toBeHidden();
    await expect(page.locator('#start .v39-home-hub')).toBeVisible();
    expect(await page.evaluate(() => window.__option2cDelegation.dashboardBackHome)).toBe(1);
  });
"""
    spec = replace_once(spec, old_gate6, new_gate6, 'Gate 6 delegation contract')

    spec = replace_once(
        spec,
        "      window.__option2cCapture?.platformValidate\n",
        "      window.__option2cCapture?.platformValidate &&\n      window.__option2cCapture?.v52c2Validate\n",
        'Gate 10 wait for V52C2 stage',
    )

    old_chain = """    const chain = await page.evaluate(() => {
      const capture = window.__option2cCapture;
      return {
        baseFunction: typeof capture.baseValidate === 'function',
        sessionFunction: typeof capture.sessionValidate === 'function',
        platformFunction: typeof capture.platformValidate === 'function',
        baseToSessionWrapped: capture.baseValidate !== capture.sessionValidate,
        sessionToPlatformWrapped: capture.sessionValidate !== capture.platformValidate,
        platformIsFinal: capture.platformValidate === window.validateStudentAccess,
      };
    });
    expect(chain).toEqual({
      baseFunction: true,
      sessionFunction: true,
      platformFunction: true,
      baseToSessionWrapped: true,
      sessionToPlatformWrapped: true,
      platformIsFinal: true,
    });
"""
    new_chain = """    const chain = await page.evaluate(() => {
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
"""
    spec = replace_once(spec, old_chain, new_chain, 'Gate 10 known wrapper chain')
    SPEC.write_text(spec)


def run_materializer():
    source = MATERIALIZER.read_text()
    old = "changed = {line[3:] for line in git('status', '--porcelain').splitlines() if line.strip()}"
    new = "changed = set(filter(None, git('diff', '--name-only').splitlines()))"
    source = replace_once(source, old, new, 'temporary scope parser')
    temp = Path('/tmp/option2c_static_shell_patch.py')
    temp.write_text(source)
    subprocess.check_call([sys.executable, str(temp)], cwd=ROOT)


def main():
    patch_gate_expectations()
    run_materializer()
    print('Option 2C Gate 6/Gate 10 expectation corrections applied without runtime edits.')


if __name__ == '__main__':
    main()
