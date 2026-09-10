#!/usr/bin/env python3
"""Deterministically align the Option 2B hard-gate spec with approved seal scope.

Temporary validation scaffolding only. The generated spec synchronizes against
actual mocked gamification RPC calls plus browser output events. Settlement is
proved by an ordered XP -> achievements -> missions -> class-challenge cycle,
then an XP/call-signature stability poll longer than both the 70ms V57C forced
refresh delay and the 180ms retry delay. No runtime code is changed here.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / 'e2e/tests/v40-static-authenticated-home-option2b.spec.cjs'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


text = PATH.read_text(encoding='utf-8')

old_allowed = """const ALLOWED_SITE_CHANGES = new Set([
  'site/index.html',
  'site/v40-learning-priorities.js',
  'site/v57c-student-continue-learning-home.js',
  'site/gamification-student.js',
  'site/v58a-student-first-use-experience.js',
]);
"""
new_allowed = """const AUTHORIZED_RUNTIME_CHANGES = new Set([
  'site/index.html',
  'site/v40-learning-priorities.js',
  'site/v57c-student-continue-learning-home.js',
  'site/gamification-student.js',
  'site/v58a-student-first-use-experience.js',
]);

const AUTHORIZED_SUCCESSOR_SEAL_CHANGES = new Set([
  'site/tests/v51-phase4-protected-shas.json',
  'site/tests/verify-phase4-v50-operations-reporting-protected-sha.cjs',
  'site/tests/verify-phase4-v52c-legacy-student-route-protected-sha.cjs',
  'site/tests/verify-phase4-v53-practice-selection-protected-sha.cjs',
  'site/tests/verify-phase4-v53-ui-resource-companion-protected-sha.cjs',
  'site/tests/verify-phase4-v54-resource-bank-protected-sha.cjs',
  'site/tests/verify-phase4-teacher-assignments-checkpoint2-protected-sha.cjs',
]);

const ALLOWED_SITE_CHANGES = new Set([
  ...AUTHORIZED_RUNTIME_CHANGES,
  ...AUTHORIZED_SUCCESSOR_SEAL_CHANGES,
]);
"""
text = replace_once(text, old_allowed, new_allowed, 'authorized site scope')

old_helpers = """async function waitForHomeRendered(page) {
  await expect.poll(
    () => page.evaluate(() => document.querySelector('#start .v40c3-home-dashboard')?.dataset?.v57cRendered === 'true'),
    { timeout: 15_000 },
  ).toBe(true);
}

function homeModel(name = 'Fixture Student') {
"""
new_helpers = """async function waitForHomeRendered(page) {
  await expect.poll(
    () => page.evaluate(() => document.querySelector('#start .v40c3-home-dashboard')?.dataset?.v57cRendered === 'true'),
    { timeout: 15_000 },
  ).toBe(true);
}

const GAMIFICATION_RPC_ORDER = Object.freeze([
  'get_student_gamification_v571a',
  'get_student_gamification_achievements_v571b',
  'get_student_weekly_missions_v572',
  'get_student_class_challenge_v574',
]);
const GAMIFICATION_EVENT_ORDER = Object.freeze([
  'v571a:gamification-updated',
  'v571b:achievements-updated',
  'v572:missions-updated',
  'v573:class-challenge-updated',
]);
const GAMIFICATION_SETTLE_QUIET_MS = 220;
const OPTION2B_MOCKS = new WeakMap();

async function installTrackedSupabaseMock(page) {
  const mock = await installSupabaseMock(page);
  OPTION2B_MOCKS.set(page, mock);
  return mock;
}

function trackedMock(page) {
  const mock = OPTION2B_MOCKS.get(page);
  if (!mock) throw new Error('Option 2B tracked Supabase mock is not installed for this page');
  return mock;
}

function gamificationCallsSince(mock, startIndex) {
  return mock.rpcCalls
    .slice(startIndex)
    .map(call => call.rpc)
    .filter(name => GAMIFICATION_RPC_ORDER.includes(name));
}

function containsOrderedLifecycle(values, expected) {
  if (values.length < expected.length) return false;
  for (let i = 0; i <= values.length - expected.length; i += 1) {
    if (expected.every((name, offset) => values[i + offset] === name)) return true;
  }
  return false;
}

async function armGamificationEventProbe(page) {
  await page.evaluate(eventNames => {
    let probe = window.__option2bGamificationEventProbe;
    if (!probe) {
      probe = { events: [] };
      window.__option2bGamificationEventProbe = probe;
      for (const name of eventNames) {
        window.addEventListener(name, () => {
          probe.events.push({ name, at: performance.now() });
        });
      }
    }
    probe.events.length = 0;
  }, GAMIFICATION_EVENT_ORDER);
}

async function eventProbeLength(page) {
  return page.evaluate(() => window.__option2bGamificationEventProbe?.events?.length || 0);
}

async function waitForOrderedLifecycleAndStability(page, mock, startIndex, eventFloor = 0) {
  await expect.poll(
    () => containsOrderedLifecycle(gamificationCallsSince(mock, startIndex), GAMIFICATION_RPC_ORDER),
    { timeout: 15_000, intervals: [40, 60, 80, 120] },
  ).toBe(true);

  await expect.poll(
    () => page.evaluate(({ expected, floor }) => {
      const names = (window.__option2bGamificationEventProbe?.events || [])
        .slice(floor)
        .map(entry => entry.name);
      if (names.length < expected.length) return false;
      for (let i = 0; i <= names.length - expected.length; i += 1) {
        if (expected.every((name, offset) => names[i + offset] === name)) return true;
      }
      return false;
    }, { expected: GAMIFICATION_EVENT_ORDER, floor: eventFloor }),
    { timeout: 15_000, intervals: [40, 60, 80, 120] },
  ).toBe(true);

  let lastSignature = null;
  let lastXp = null;
  let stableSince = 0;
  await expect.poll(async () => {
    const signature = JSON.stringify(gamificationCallsSince(mock, startIndex));
    const xp = await page.locator('#v571a-gamification-card').getAttribute('data-xp');
    const now = Date.now();
    if (xp == null) return false;
    if (signature !== lastSignature || xp !== lastXp) {
      lastSignature = signature;
      lastXp = xp;
      stableSince = now;
      return false;
    }
    return now - stableSince >= GAMIFICATION_SETTLE_QUIET_MS;
  }, {
    timeout: 15_000,
    intervals: [40, 60, 80, 120],
  }).toBe(true);
}

async function primeGamification(page) {
  const mock = trackedMock(page);
  await armGamificationEventProbe(page);
  const startIndex = mock.rpcCalls.length;

  await expect.poll(
    () => page.evaluate(async () => Boolean(await window.GamificationStudent.refresh(true))),
    { timeout: 15_000, intervals: [80, 120, 180, 250] },
  ).toBe(true);

  await waitForOrderedLifecycleAndStability(page, mock, startIndex, 0);
}

async function renderHomeAndSettleForcedGamification(page, model) {
  const mock = trackedMock(page);
  await armGamificationEventProbe(page);
  const startIndex = mock.rpcCalls.length;

  // Capture the synchronous renderCached() event boundary inside the same browser
  // task as V57C.render(). The 70ms scheduled refresh cannot execute until after
  // that task returns, so events after this boundary belong to the forced path.
  const synchronousEventBoundary = await page.evaluate(value => {
    window.V57CStudentContinueLearningHome.render(value);
    return window.__option2bGamificationEventProbe?.events?.length || 0;
  }, model);

  await waitForOrderedLifecycleAndStability(page, mock, startIndex, synchronousEventBoundary);
}

async function renderHomeAndWaitForScheduledGamificationRefresh(page, model) {
  // First force and settle one complete serial refresh. This drains any sign-in
  // refresh/retry already in flight. Then prove V57C's own scheduled forced cycle.
  await primeGamification(page);
  await renderHomeAndSettleForcedGamification(page, model);
}

function homeModel(name = 'Fixture Student') {
"""
text = replace_once(text, old_helpers, new_helpers, 'gamification lifecycle settlement helpers')

old_gate4_preamble = """  test('gate 4 — Student A logout then Student B render leaves no Home personalization from Student A', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await waitForOption2bRuntime(page);
    await waitForHomeRendered(page);

"""
new_gate4_preamble = """  test('gate 4 — Student A logout then Student B render leaves no Home personalization from Student A', async ({ page }) => {
    await installTrackedSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await waitForOption2bRuntime(page);
    await waitForHomeRendered(page);

"""
text = replace_once(text, old_gate4_preamble, new_gate4_preamble, 'gate 4 tracked mock')

old_alpha = """    await page.evaluate(({ model, missions, challenge }) => {
      window.V57CStudentContinueLearningHome.render(model);
      window.GamificationStudent.xp.render({ xp: { total: 321 } });
      window.GamificationStudent.missions.render(missions);
      window.GamificationStudent.classChallenge.render(challenge);
    }, {
      model: homeModel('Student Alpha'),
      missions: missionsPayload('Alpha Mission'),
      challenge: challengePayload(true, 'Alpha Class'),
    });
"""
new_alpha = """    await renderHomeAndWaitForScheduledGamificationRefresh(page, homeModel('Student Alpha'));
    await page.evaluate(({ missions, challenge }) => {
      window.GamificationStudent.xp.render({ xp: { total: 321 } });
      window.GamificationStudent.missions.render(missions);
      window.GamificationStudent.classChallenge.render(challenge);
    }, {
      missions: missionsPayload('Alpha Mission'),
      challenge: challengePayload(true, 'Alpha Class'),
    });
"""
text = replace_once(text, old_alpha, new_alpha, 'gate 4 Alpha settlement')

old_beta = """    await signInStudent(page);
    await waitForHomeRendered(page);
    await page.evaluate(({ model, missions, challenge }) => {
      window.V57CStudentContinueLearningHome.render(model);
      window.GamificationStudent.xp.render({ xp: { total: 654 } });
      window.GamificationStudent.missions.render(missions);
      window.GamificationStudent.classChallenge.render(challenge);
    }, {
      model: homeModel('Student Beta'),
      missions: missionsPayload('Beta Mission'),
      challenge: challengePayload(true, 'Beta Class'),
    });
"""
new_beta = """    await signInStudent(page);
    await waitForHomeRendered(page);
    await renderHomeAndWaitForScheduledGamificationRefresh(page, homeModel('Student Beta'));
    await page.evaluate(({ missions, challenge }) => {
      window.GamificationStudent.xp.render({ xp: { total: 654 } });
      window.GamificationStudent.missions.render(missions);
      window.GamificationStudent.classChallenge.render(challenge);
    }, {
      missions: missionsPayload('Beta Mission'),
      challenge: challengePayload(true, 'Beta Class'),
    });
"""
text = replace_once(text, old_beta, new_beta, 'gate 4 Beta settlement')

old_gate8_mock = """  test('gate 8 — class challenge uses one static card and toggles enabled/disabled without create/remove', async ({ page }) => {
    await installStaticCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
"""
new_gate8_mock = """  test('gate 8 — class challenge uses one static card and toggles enabled/disabled without create/remove', async ({ page }) => {
    await installStaticCapture(page);
    await installTrackedSupabaseMock(page);
    await openApp(page);
"""
text = replace_once(text, old_gate8_mock, new_gate8_mock, 'gate 8 tracked mock')

old_gate8_start = """    await signInStudent(page);
    await waitForOption2bRuntime(page);

    await page.evaluate(payload => window.GamificationStudent.classChallenge.render(payload), challengePayload(true, '6B'));
"""
new_gate8_start = """    await signInStudent(page);
    await waitForOption2bRuntime(page);
    await primeGamification(page);

    await page.evaluate(payload => window.GamificationStudent.classChallenge.render(payload), challengePayload(true, '6B'));
"""
gate8_heading = "test('gate 8 — class challenge uses one static card and toggles enabled/disabled without create/remove', async ({ page }) => {"
gate8_index = text.find(gate8_heading)
if gate8_index < 0:
    raise RuntimeError('gate 8 heading not found')
prefix, gate8_tail = text[:gate8_index], text[gate8_index:]
gate8_tail = replace_once(gate8_tail, old_gate8_start, new_gate8_start, 'gate 8 lifecycle settlement')
text = prefix + gate8_tail

old_gate12 = """    const changedSite = git(['diff', '--name-only', BASE_SHA, '--', 'site'])
      .split(/\\r?\\n/)
      .filter(Boolean);
    for (const pathname of changedSite) {
      expect(ALLOWED_SITE_CHANGES.has(pathname), `unapproved site change: ${pathname}`).toBe(true);
    }

    const changedSupabase = git(['diff', '--name-only', BASE_SHA, '--', 'supabase']);
"""
new_gate12 = """    const changedSite = git(['diff', '--name-only', BASE_SHA, '--', 'site'])
      .split(/\\r?\\n/)
      .filter(Boolean);
    for (const pathname of changedSite) {
      expect(ALLOWED_SITE_CHANGES.has(pathname), `unapproved site change: ${pathname}`).toBe(true);
    }
    for (const pathname of AUTHORIZED_RUNTIME_CHANGES) {
      expect(changedSite, `authorized runtime successor missing: ${pathname}`).toContain(pathname);
    }

    const changedSupabase = git(['diff', '--name-only', BASE_SHA, '--', 'supabase']);
"""
text = replace_once(text, old_gate12, new_gate12, 'gate 12 exact authorized scope')

PATH.write_text(text, encoding='utf-8')
print('Option 2B E2E lifecycle-synchronized test patch applied successfully.')