const { test, expect } = require('@playwright/test');
const {
  STUDENT,
  REQUIRED_STUDENT_READ_RPCS,
  installSupabaseMock,
  openApp,
  signInStudent,
  startPractice,
  answerPracticeCorrectly,
  loginTeacher,
} = require('./helpers.cjs');

const HOME_READ_RPCS = REQUIRED_STUDENT_READ_RPCS.filter(
  rpc => rpc !== 'get_student_practice_questions_v53d3',
);

test.describe('Phase 0 core browser safety net', () => {
  test('student can sign in with Student ID and PIN', async ({ page }) => {
    const mock = await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);

    const validations = mock.rpcCalls.filter(call => call.rpc === 'validate_student_access');
    expect(validations.some(call => call.body.p_purpose === 'practice')).toBe(true);
    expect(validations.some(call => call.body.p_purpose === 'exam')).toBe(true);
    expect(mock.unexpectedWrites).toEqual([]);
  });

  test('student Home loads through the maintained RPC read contract', async ({ page }) => {
    const mock = await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);

    await expect.poll(
      () => HOME_READ_RPCS.filter(
        rpc => mock.rpcCalls.some(call => call.rpc === rpc),
      ),
      { timeout: 12_000 },
    ).toEqual(HOME_READ_RPCS);

    expect(
      mock.unhandledRpcCalls.filter(call => REQUIRED_STUDENT_READ_RPCS.includes(call.rpc)),
    ).toEqual([]);
    expect(mock.unexpectedWrites).toEqual([]);
  });

  test('student can start Practice and answer through authoritative grading', async ({ page }) => {
    const mock = await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await startPractice(page);
    await answerPracticeCorrectly(page);

    await expect(page.locator('#first-score')).toContainText('First try: 1');
    await expect(page.locator('#mastery-score')).toContainText('Mastered: 1');

    expect(
      mock.rpcCalls.some(call => call.rpc === 'get_student_practice_questions_v53d3'),
    ).toBe(true);
    expect(
      mock.rpcCalls.some(call => call.rpc === 'grade_practice_response_v53b'),
    ).toBe(true);
    expect(mock.restReads.filter(path => path === '/rest/v1/questions')).toEqual([]);
    expect(mock.unexpectedWrites).toEqual([]);
  });

  test('student can submit Practice through the current V53B submission RPC', async ({ page }) => {
    const mock = await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await startPractice(page);
    await answerPracticeCorrectly(page);

    await page.locator('#next-btn').click();

    await expect(page.locator('#result')).toHaveClass(/active/);
    await expect(page.getByRole('heading', { name: 'Practice Complete' })).toBeVisible();
    await expect(page.locator('#result-score')).toContainText('1/1');
    await expect(page.locator('#res-sync')).toHaveText('Cloud ✓');
    await expect(page.locator('#result-code')).not.toHaveText('');

    expect(mock.practiceSubmissions).toBe(1);
    expect(
      mock.rpcCalls.some(call => call.rpc === 'submit_practice_session_v53b'),
    ).toBe(true);
    expect(
      mock.rpcCalls.some(call => call.rpc === 'submit_practice_session_v3'),
    ).toBe(false);
    expect(mock.unexpectedWrites).toEqual([]);
  });

  test('student sign-in session survives reload without retaining the PIN', async ({ page }) => {
    const mock = await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);

    await page.reload();

    await expect(page.locator('#cloud-status')).toContainText('Cloud Connected');
    await expect(page.locator('.v40c-session-panel')).toHaveClass(/v40c-authenticated/);
    await expect(page.locator('.v40c-session-identity-text')).toContainText(STUDENT.name);
    await expect(page.locator('#student-pin')).toHaveValue('');
    await expect(page.locator('#student-pin')).toBeDisabled();

    expect(mock.unexpectedWrites).toEqual([]);
  });

  test('teacher can log in to the Teacher Dashboard', async ({ page }) => {
    const mock = await installSupabaseMock(page);
    await openApp(page);
    await loginTeacher(page);

    await expect(page.getByRole('heading', { name: 'Teacher Dashboard' })).toBeVisible();
    await expect(page.locator('#signout-btn')).toBeVisible();
    expect(mock.unexpectedWrites).toEqual([]);
  });

  test('teacher can view the Analytics tab after login', async ({ page }) => {
    const mock = await installSupabaseMock(page);
    await openApp(page);
    await loginTeacher(page);

    const analyticsTab = page.locator('button.tab[data-panel="analytics-panel"]');
    await expect(analyticsTab).toBeVisible();
    await analyticsTab.click();

    await expect(analyticsTab).toHaveClass(/active/);
    await expect(page.locator('#analytics-panel')).toHaveClass(/active/);
    await expect(page.getByRole('heading', { name: 'Analytics Overview' })).toBeVisible();

    expect(mock.unexpectedWrites).toEqual([]);
  });
});
