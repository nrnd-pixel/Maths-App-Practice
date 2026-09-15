const { test, expect } = require('@playwright/test');
const path = require('node:path');

const MODULE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'site',
  'v59b-adaptive-pilot-smoke-selector.js',
);

const PREVIEW = 'http://deploy-preview-271--magical-pixie-a61111.netlify.app';
const OTHER = 'http://pilot.test';
const Q9A = 'dc49cfed-b945-49d1-abc2-1983b732da32';
const Q9B = 'c4feda04-6c85-4123-baf6-8e38deb1d1fa';
const Q4 = 'c2041abf-d204-47b3-ba92-3129c97681ae';
const Q30 = '077872ec-2c3c-402f-9c51-491c77500791';

async function installHarness(page, url){
  await page.route('http://**/*', async route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname !== 'deploy-preview-271--magical-pixie-a61111.netlify.app' && requestUrl.hostname !== 'pilot.test') {
      return route.abort();
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html>
        <html><body>
          <section id="start" class="active">
            <div class="v40c-learn-setup">
              <button id="practice-mode-btn" type="button">Practice</button>
              <select id="year-level"><option value="5">5</option><option value="6">6</option></select>
              <select id="strand-filter"><option value="all">All</option><option value="number">Number</option></select>
              <select id="topic-filter">
                <option value="all">All topics</option>
                <option value="Decimals">Decimals</option>
                <option value="Fractions">Fractions</option>
                <option value="Percentages">Percentages</option>
              </select>
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
  await page.evaluate(({ q9a, q9b, q4, q30 }) => {
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
      const count = Number(document.getElementById('question-count').value || 0);
      window.state.count = count;
      if (topic === 'Decimals') {
        window.state.questions = [{
          _kind: 'multipart',
          id: 'multipart:2025|paper 1|9',
          parts: [{ id: q9a }, { id: q9b }],
        }];
      } else if (topic === 'Fractions') {
        window.state.questions = [{ id: q4 }];
      } else if (topic === 'Percentages') {
        window.state.questions = [{ id: q30 }];
      } else {
        window.state.questions = [];
      }
      window.state.index = 0;
      window.show('quiz');
      window.renderQuestion();
    };
  }, { q9a: Q9A, q9b: Q9B, q4: Q4, q30: Q30 });

  await page.addScriptTag({ path: MODULE_PATH });
}

test.describe('V5.9B deploy-preview smoke selector hard gates', () => {
  test('gate 1 — selector stays absent without the pilot flag or outside deploy-preview', async ({ page }) => {
    await installHarness(page, PREVIEW);
    await page.waitForTimeout(150);
    await expect(page.locator('#v59b2-smoke-selector')).toHaveCount(0);

    await installHarness(page, `${OTHER}/?adaptivePilot=2`);
    await page.waitForTimeout(150);
    await expect(page.locator('#v59b2-smoke-selector')).toHaveCount(0);
  });

  test('gate 2 — Q4 launches through ordinary startPractice and restores Learn controls', async ({ page }) => {
    await installHarness(page, `${PREVIEW}/?adaptivePilot=2`);
    await expect(page.locator('#v59b2-smoke-selector')).toBeVisible();

    const before = await page.evaluate(() => ({
      year: document.getElementById('year-level').value,
      strand: document.getElementById('strand-filter').value,
      topic: document.getElementById('topic-filter').value,
      difficulty: document.getElementById('difficulty-filter').value,
      count: document.getElementById('question-count').value,
    }));

    await page.locator('[data-v59b2-smoke-target="q4"]').click();
    await expect.poll(() => page.evaluate(() => window.__rendered)).toBe(Q4);

    const result = await page.evaluate(() => ({
      startCalls: window.__startCalls,
      ids: window.state.questions.map(question => question.id),
      count: window.state.count,
      temporaryCountOptions: document.querySelectorAll('#question-count option[data-v59b2-smoke-count="true"]').length,
      controls: {
        year: document.getElementById('year-level').value,
        strand: document.getElementById('strand-filter').value,
        topic: document.getElementById('topic-filter').value,
        difficulty: document.getElementById('difficulty-filter').value,
        count: document.getElementById('question-count').value,
      },
    }));

    expect(result).toEqual({
      startCalls: 1,
      ids: [Q4],
      count: 1,
      temporaryCountOptions: 0,
      controls: before,
    });
  });

  test('gate 3 — Q9(b) pins the ordinary multipart item instead of fabricating a standalone question', async ({ page }) => {
    await installHarness(page, `${PREVIEW}/?adaptivePilot=2`);
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
