const { test, expect } = require('@playwright/test');
const path = require('node:path');

const MODULE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'site',
  'v59b-adaptive-diagnostic-pilot-v2.js',
);

const Q9B = 'c4feda04-6c85-4123-baf6-8e38deb1d1fa';
const Q30 = '077872ec-2c3c-402f-9c51-491c77500791';

async function installHarness(page, {
  flag = true,
  targetId = Q9B,
  mode = 'eligible',
  completeWrong = true,
} = {}) {
  await page.route('http://pilot.test/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html>
        <html><body>
          <section id="quiz" class="active">
            <div id="response-input"></div>
            <div id="feedback"></div>
            <button id="check-btn" type="button">Check</button>
            <button id="next-btn" type="button" disabled>Next</button>
          </section>
        </body></html>`,
    });
  });

  await page.goto(flag
    ? 'http://pilot.test/?adaptivePilot=2'
    : 'http://pilot.test/');

  await page.evaluate(({ targetId, mode, completeWrong }) => {
    window.__rpcCalls = [];
    window.__completeWrong = completeWrong;
    window.__baseSubmitCount = 0;
    window.cloudReady = true;
    window.activeStudentAccess = { access_token: 'practice-ticket' };
    window.state = {
      accessToken: 'practice-ticket',
      questions: [{ id: targetId, question_text: 'Target question' }],
      index: 0,
      done: false,
      answers: [],
      first: 3,
      mastered: 4,
    };

    window.renderResponseInput = (question, container, disabled, prefix) => {
      container.innerHTML = `<input id="${prefix}-text" ${disabled ? 'disabled' : ''}>`;
    };
    window.readResponse = (question, prefix) => {
      const value = document.getElementById(`${prefix}-text`)?.value || '';
      return {
        type: 'text',
        empty: !String(value).trim(),
        display: String(value).trim(),
        value: String(value).trim(),
      };
    };

    window.submit = async function(){
      window.__baseSubmitCount += 1;
      if (!window.__completeWrong) {
        window.state.done = false;
        return;
      }
      window.state.done = true;
      window.state.answers.push({
        questionId: targetId,
        correct: false,
        manualReview: false,
      });
      document.getElementById('check-btn').disabled = true;
      document.getElementById('next-btn').disabled = false;
    };
    window.__baseSubmit = window.submit;
    document.getElementById('check-btn').onclick = window.submit;

    const plan = {
      status: 'READY',
      target: {
        question_id: targetId,
        question_text: '17 hundredths __ 1.7',
        response_type: 'text',
        response_config: {},
      },
      steps: [{
        step_order: 1,
        step_label: 'Check decimal place value',
        skill_id: 'Y4-DEC-M01',
        question: {
          question_id: '2d5bd3bb-c0df-4fe3-b29c-98909c83a9aa',
          question_text: 'Write 67 tenths and 5 thousandths as a decimal.',
          response_type: 'text',
          response_config: {},
        },
      }],
    };

    window.cloud = {
      rpc: async (name, args) => {
        window.__rpcCalls.push({ name, args });
        if (name === 'student_adaptive_trigger_check_v1') {
          if (mode === 'not_allowed') {
            return { data: { status: 'DISABLED', should_offer: false }, error: null };
          }
          return { data: { status: 'READY', should_offer: true }, error: null };
        }
        if (name === 'student_adaptive_question_readiness_v2') {
          if (mode === 'no_metadata') {
            return { data: { status: 'NO_METADATA_PROFILE' }, error: null };
          }
          return { data: { status: 'READY', diagnostic_route_ready: true }, error: null };
        }
        if (name === 'student_adaptive_diagnostic_plan_v1') {
          if (mode === 'plan_error') {
            return { data: null, error: { message: 'network unavailable' } };
          }
          return { data: plan, error: null };
        }
        if (name === 'student_adaptive_diagnostic_grade_v1') {
          return {
            data: {
              status: 'READY',
              correct: true,
              feedback: 'Good — this skill looks secure.',
            },
            error: null,
          };
        }
        return { data: null, error: { message: `Unexpected RPC ${name}` } };
      },
    };
  }, { targetId, mode, completeWrong });

  await page.addScriptTag({ path: MODULE_PATH });

  if (flag) {
    await expect.poll(
      () => page.evaluate(() => window.V59BAdaptiveDiagnosticPilotV2?.isInstalled?.()),
      { timeout: 3_000 },
    ).toBe(true);
  }
}

async function clickOrdinaryCheck(page){
  await page.locator('#check-btn').click();
}

async function rpcNames(page){
  return page.evaluate(() => window.__rpcCalls.map(call => call.name));
}

test.describe('V5.9B adaptive diagnostic pilot V2 hard gates', () => {
  test('gate 1 — flag absent leaves ordinary Practice completely untouched', async ({ page }) => {
    await installHarness(page, { flag: false });

    const snapshot = await page.evaluate(() => ({
      enabled: window.V59BAdaptiveDiagnosticPilotV2?.enabled,
      installed: window.V59BAdaptiveDiagnosticPilotV2?.installed,
      sameSubmit: window.submit === window.__baseSubmit,
      rpcCount: window.__rpcCalls.length,
    }));

    expect(snapshot).toEqual({
      enabled: false,
      installed: false,
      sameSubmit: true,
      rpcCount: 0,
    });
  });

  test('gate 2 — incomplete/first-try failure makes zero adaptive RPC calls', async ({ page }) => {
    await installHarness(page, { completeWrong: false });
    await clickOrdinaryCheck(page);
    await page.waitForTimeout(100);

    expect(await rpcNames(page)).toEqual([]);
    await expect(page.locator(`#v59b2-adaptive-overlay`)).toHaveCount(0);
    expect(await page.evaluate(() => window.__baseSubmitCount)).toBe(1);
  });

  test('gate 3 — old pilot allow-list cannot bypass missing Metadata V2 readiness (Q30)', async ({ page }) => {
    await installHarness(page, { targetId: Q30, mode: 'no_metadata' });
    await clickOrdinaryCheck(page);

    await expect.poll(() => rpcNames(page)).toEqual([
      'student_adaptive_trigger_check_v1',
      'student_adaptive_question_readiness_v2',
    ]);
    await expect(page.locator(`#v59b2-adaptive-overlay`)).toHaveCount(0);
  });

  test('gate 4 — eligible target runs diagnostics + unscored retry without changing Practice scores/results', async ({ page }) => {
    await installHarness(page, { targetId: Q9B, mode: 'eligible' });
    await clickOrdinaryCheck(page);

    await expect(page.locator('#v59b2-adaptive-overlay')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Want a little extra help?' })).toBeVisible();

    await page.locator('[data-v59b2-action="start"]').click();
    await expect(page.getByRole('heading', { name: 'Step 1 of 1' })).toBeVisible();
    await page.locator('#v59b2-response-text').fill('6.705');
    await page.locator('[data-v59b2-action="check-diagnostic"]').click();
    await expect(page.locator('.v59b2-feedback')).toContainText('Good');

    await page.locator('[data-v59b2-action="next-diagnostic"]').click();
    await expect(page.getByRole('heading', { name: 'Try the original question once more' })).toBeVisible();
    await page.locator('#v59b2-response-text').fill('<');
    await page.locator('[data-v59b2-action="check-target-retry"]').click();
    await expect(page.locator('.v59b2-feedback')).toContainText('Good');
    await page.locator('[data-v59b2-action="return"]').click();

    await expect(page.locator('#v59b2-adaptive-overlay')).toHaveCount(0);

    const stateSnapshot = await page.evaluate(() => ({
      first: window.state.first,
      mastered: window.state.mastered,
      answers: window.state.answers.length,
      answerCorrect: window.state.answers[0]?.correct,
      nextDisabled: document.getElementById('next-btn').disabled,
      checkDisabled: document.getElementById('check-btn').disabled,
    }));
    expect(stateSnapshot).toEqual({
      first: 3,
      mastered: 4,
      answers: 1,
      answerCorrect: false,
      nextDisabled: false,
      checkDisabled: true,
    });

    expect(await rpcNames(page)).toEqual([
      'student_adaptive_trigger_check_v1',
      'student_adaptive_question_readiness_v2',
      'student_adaptive_diagnostic_plan_v1',
      'student_adaptive_diagnostic_grade_v1',
      'student_adaptive_diagnostic_grade_v1',
    ]);

    const stages = await page.evaluate(() => window.__rpcCalls
      .filter(call => call.name === 'student_adaptive_diagnostic_grade_v1')
      .map(call => call.args.p_stage));
    expect(stages).toEqual(['diagnostic', 'target_retry']);
  });

  test('gate 5 — diagnostic network failure restores the completed ordinary Practice question', async ({ page }) => {
    await installHarness(page, { targetId: Q9B, mode: 'plan_error' });
    await clickOrdinaryCheck(page);
    await expect(page.locator('#v59b2-adaptive-overlay')).toBeVisible();

    await page.locator('[data-v59b2-action="start"]').click();
    await expect(page.locator('#v59b2-adaptive-overlay')).toHaveCount(0);

    const controls = await page.evaluate(() => ({
      nextDisabled: document.getElementById('next-btn').disabled,
      checkDisabled: document.getElementById('check-btn').disabled,
      done: window.state.done,
      answers: window.state.answers.length,
    }));
    expect(controls).toEqual({
      nextDisabled: false,
      checkDisabled: true,
      done: true,
      answers: 1,
    });
  });

  test('gate 6 — server pilot denial prevents readiness/plan calls even when URL flag is present', async ({ page }) => {
    await installHarness(page, { mode: 'not_allowed' });
    await clickOrdinaryCheck(page);

    await expect.poll(() => rpcNames(page)).toEqual([
      'student_adaptive_trigger_check_v1',
    ]);
    await expect(page.locator('#v59b2-adaptive-overlay')).toHaveCount(0);
  });
});
