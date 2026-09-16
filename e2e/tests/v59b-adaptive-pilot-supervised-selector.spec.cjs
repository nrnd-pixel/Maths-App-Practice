const { test, expect } = require('@playwright/test');
const path = require('node:path');

const CONFIG_PATH = path.resolve(__dirname, '..', '..', 'site', 'config.js');
const PREVIEW = 'http://deploy-preview-999--magical-pixie-a61111.netlify.app';
const OTHER = 'http://pilot.test';
const APPROVED = [
  '5e386522-ae0f-4c82-8cf3-6bf0979272f7',
  '02a5b3b6-c5d7-4ab4-bd35-2c7989b6b3d1',
  '7dae8fc9-cb6a-441f-9549-2de1f0ba158d',
  'd8ef6d90-f1f3-4f60-8a26-0f8d927b2c07',
  '7e4457ae-ba55-4bc4-8814-4a8bdf92ee6d',
];
const OUTSIDER = '11111111-2222-4333-8444-555555555555';
const Q9A = 'dc49cfed-b945-49d1-abc2-1983b732da32';
const Q9B = 'c4feda04-6c85-4123-baf6-8e38deb1d1fa';
const Q4 = 'c2041abf-d204-47b3-ba92-3129c97681ae';

async function installHarness(page, url, rosterId = APPROVED[0]) {
  await page.route('http://**/*', async route => {
    const requestUrl = new URL(route.request().url());
    if (!['deploy-preview-999--magical-pixie-a61111.netlify.app', 'pilot.test'].includes(requestUrl.hostname)) {
      return route.abort();
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html><html><body>
        <section id="start" class="active">
          <div class="v40c-learn-setup">
            <button id="practice-mode-btn" type="button">Practice</button>
            <select id="year-level"><option value="5">5</option><option value="6">6</option></select>
            <select id="strand-filter"><option value="all">All</option><option value="number">Number</option></select>
            <select id="topic-filter"><option value="all">All topics</option><option value="Decimals">Decimals</option><option value="Fractions">Fractions</option></select>
            <select id="difficulty-filter"><option value="all">Any</option><option value="standard">Standard</option></select>
            <select id="question-count"><option value="5">5</option><option value="10" selected>10</option></select>
            <div class="v40c-learn-actions"><button id="start-btn" type="button">Start Practice</button></div>
          </div>
        </section>
        <section id="quiz"></section>
      </body></html>`,
    });
  });

  await page.goto(url);
  await page.evaluate(({ rosterId, q9a, q9b, q4 }) => {
    window.activeStudentAccess = { roster_student_id: rosterId };
    window.__startCalls = 0;
    window.__rendered = '';
    window.state = { questions: [], index: 0, count: 0 };
    window.show = id => {
      document.querySelectorAll('section#start,section#quiz').forEach(section => section.classList.remove('active'));
      document.getElementById(id)?.classList.add('active');
    };
    window.renderQuestion = () => {
      const item = window.state.questions[window.state.index] || null;
      window.__rendered = item?._kind === 'multipart'
        ? item.parts.map(part => part.id).join(',')
        : String(item?.id || '');
    };
    window.startPractice = async () => {
      window.__startCalls += 1;
      const topic = document.getElementById('topic-filter').value;
      window.state.count = Number(document.getElementById('question-count').value || 0);
      if (topic === 'Decimals') {
        window.state.questions = [{
          _kind: 'multipart',
          id: 'multipart:2025|paper 1|9',
          parts: [{ id: q9a }, { id: q9b }],
        }];
      } else if (topic === 'Fractions') {
        window.state.questions = [{ id: q4 }];
      } else {
        window.state.questions = [];
      }
      window.state.index = 0;
      window.show('quiz');
      window.renderQuestion();
    };
  }, { rosterId, q9a: Q9A, q9b: Q9B, q4: Q4 });

  await page.addScriptTag({ path: CONFIG_PATH });
}

test.describe('V5.9B Stage 3F supervised pilot selector hard gates', () => {
  test('gate 1 — selector stays absent without flag, outside preview, or for an unapproved roster', async ({ page }) => {
    await installHarness(page, PREVIEW);
    await page.waitForTimeout(150);
    await expect(page.locator('#v59b2-smoke-selector')).toHaveCount(0);

    await installHarness(page, `${OTHER}/?adaptivePilot=2`);
    await page.waitForTimeout(150);
    await expect(page.locator('#v59b2-smoke-selector')).toHaveCount(0);

    await installHarness(page, `${PREVIEW}/?adaptivePilot=2`, OUTSIDER);
    await page.waitForTimeout(150);
    await expect(page.locator('#v59b2-smoke-selector')).toHaveCount(0);
  });

  test('gate 2 — all five approved pilot rosters can launch Q4 through ordinary Practice', async ({ page }) => {
    for (const rosterId of APPROVED) {
      await installHarness(page, `${PREVIEW}/?adaptivePilot=2`, rosterId);
      await expect(page.locator('#v59b2-smoke-selector')).toBeVisible();
      await page.locator('[data-v59b2-smoke-target="q4"]').click();
      await expect.poll(() => page.evaluate(() => window.__rendered)).toBe(Q4);
      expect(await page.evaluate(() => window.__startCalls)).toBe(1);
    }
  });

  test('gate 3 — Q9(b) pins the ordinary multipart item instead of fabricating a standalone question', async ({ page }) => {
    await installHarness(page, `${PREVIEW}/?adaptivePilot=2`, APPROVED[1]);
    await expect(page.locator('#v59b2-smoke-selector')).toBeVisible();

    await page.locator('[data-v59b2-smoke-target="q9b"]').click();
    await expect.poll(() => page.evaluate(() => window.__rendered)).toBe(`${Q9A},${Q9B}`);

    const item = await page.evaluate(() => ({
      kind: window.state.questions[0]?._kind,
      parts: window.state.questions[0]?.parts?.map(part => part.id),
      startCalls: window.__startCalls,
    }));
    expect(item).toEqual({
      kind: 'multipart',
      parts: [Q9A, Q9B],
      startCalls: 1,
    });
  });
});
