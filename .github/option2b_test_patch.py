#!/usr/bin/env python3
"""Deterministically align the Option 2B hard-gate spec with approved seal scope.

This is temporary branch validation scaffolding. It changes only the Option 2B
E2E spec: race-prone fixture sequences are synchronized against the actual
XP -> achievements -> missions -> class-challenge RPC/render lifecycle and a
post-lifecycle stability window that exceeds both the V57C 70ms forced-refresh
schedule and the 180ms retry schedule. Gate 12 recognizes only the explicitly
approved historical successor-seal files without relaxing frozen runtime or
Supabase checks.
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

const GAMIFICATION_LIFECYCLE = Object.freeze([
  Object.freeze({ rpc: 'get_student_gamification_v571a', event: 'v571a:gamification-updated' }),
  Object.freeze({ rpc: 'get_student_gamification_achievements_v571b', event: 'v571b:achievements-updated' }),
  Object.freeze({ rpc: 'get_student_weekly_missions_v572', event: 'v572:missions-updated' }),
  Object.freeze({ rpc: 'get_student_class_challenge_v574', event: 'v573:class-challenge-updated' }),
]);

// This is a stability condition, not a blind sleep. The runtime's V57C path
// schedules the forced refresh after 70ms and a collision retry after 180ms.
// Requiring >180ms with no new lifecycle activity AND unchanged XP proves those
// scheduled paths have settled before fixture values are asserted.
const GAMIFICATION_SETTLE_QUIET_MS = 220;

async function armGamificationLifecycleProbe(page) {
  await page.evaluate(stages => {
    const rpcNames = new Set(stages.map(stage => stage.rpc));
    const eventNames = new Set(stages.map(stage => stage.event));
    let probe = window.__option2bGamificationLifecycleProbe;

    if (!probe) {
      if (!window.cloud || typeof window.cloud.rpc !== 'function') {
        throw new Error('cloud.rpc is unavailable for the Option 2B lifecycle probe');
      }

      probe = {
        entries: [],
        nextCallId: 1,
        lastXp: null,
        xpStableSince: performance.now(),
      };
      window.__option2bGamificationLifecycleProbe = probe;

      const originalRpc = window.cloud.rpc;
      window.cloud.rpc = async function(...args) {
        const name = String(args[0] || '');
        if (!rpcNames.has(name)) return originalRpc.apply(this, args);

        const id = probe.nextCallId++;
        probe.entries.push({ kind: 'rpc-start', name, id, at: performance.now() });
        try {
          const result = await originalRpc.apply(this, args);
          probe.entries.push({ kind: 'rpc-end', name, id, at: performance.now() });
          return result;
        } catch (error) {
          probe.entries.push({ kind: 'rpc-error', name, id, at: performance.now() });
          throw error;
        }
      };

      for (const name of eventNames) {
        window.addEventListener(name, () => {
          probe.entries.push({ kind: 'event', name, at: performance.now() });
        });
      }
    }

    probe.entries.length = 0;
    probe.lastXp = null;
    probe.xpStableSince = performance.now();
  }, GAMIFICATION_LIFECYCLE);
}

async function waitForGamificationLifecycleSettlement(page) {
  try {
    await expect.poll(
      () => page.evaluate(({ stages, quietMs }) => {
        const probe = window.__option2bGamificationLifecycleProbe;
        if (!probe) return false;
        const entries = probe.entries;
        const starts = new Map();
        const completedCalls = [];

        for (const entry of entries) {
          if (entry.kind === 'rpc-start') starts.set(entry.id, entry);
          if (entry.kind === 'rpc-end') {
            const start = starts.get(entry.id);
            if (start) completedCalls.push({ name: entry.name, startAt: start.at, endAt: entry.at });
          }
        }
        completedCalls.sort((a, b) => a.startAt - b.startAt);

        let batch = null;
        for (let i = 0; i <= completedCalls.length - stages.length; i += 1) {
          const calls = completedCalls.slice(i, i + stages.length);
          if (!calls.every((call, index) => call.name === stages[index].rpc)) continue;

          let valid = true;
          let finalOutputAt = 0;
          for (let index = 0; index < stages.length; index += 1) {
            const lower = calls[index].endAt;
            const upper = index + 1 < calls.length ? calls[index + 1].startAt : Number.POSITIVE_INFINITY;
            const output = entries.find(entry => (
              entry.kind === 'event' &&
              entry.name === stages[index].event &&
              entry.at >= lower &&
              entry.at <= upper
            ));
            if (!output) {
              valid = false;
              break;
            }
            finalOutputAt = output.at;
          }
          if (valid) batch = { finalOutputAt };
        }
        if (!batch) return false;

        const now = performance.now();
        const xp = document.getElementById('v571a-gamification-card')?.dataset?.xp ?? null;
        if (xp === null) return false;
        if (probe.lastXp !== xp) {
          probe.lastXp = xp;
          probe.xpStableSince = now;
          return false;
        }

        const lastActivityAt = entries.reduce((latest, entry) => Math.max(latest, entry.at || 0), batch.finalOutputAt);
        const stableSince = Math.max(lastActivityAt, probe.xpStableSince);
        return now - stableSince >= quietMs;
      }, { stages: GAMIFICATION_LIFECYCLE, quietMs: GAMIFICATION_SETTLE_QUIET_MS }),
      { timeout: 15_000, intervals: [40, 60, 80, 120] },
    ).toBe(true);
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      xp: document.getElementById('v571a-gamification-card')?.dataset?.xp ?? null,
      entries: window.__option2bGamificationLifecycleProbe?.entries || [],
    }));
    throw new Error(`${error.message}\\nGamification lifecycle diagnostic: ${JSON.stringify(diagnostic)}`);
  }
}

async function settleSignInGamification(page) {
  await armGamificationLifecycleProbe(page);
  await signInStudent(page);
  await waitForHomeRendered(page);
  await waitForGamificationLifecycleSettlement(page);
}

async function renderHomeAndSettleForcedGamification(page, model) {
  await armGamificationLifecycleProbe(page);
  await page.evaluate(value => window.V57CStudentContinueLearningHome.render(value), model);
  await waitForGamificationLifecycleSettlement(page);
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
    await installSupabaseMock(page);
    await openApp(page);
    await waitForOption2bRuntime(page);
    await settleSignInGamification(page);

"""
text = replace_once(text, old_gate4_preamble, new_gate4_preamble, 'gate 4 initial sign-in settlement')

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
new_alpha = """    await renderHomeAndSettleForcedGamification(page, homeModel('Student Alpha'));
    await page.evaluate(({ missions, challenge }) => {
      window.GamificationStudent.xp.render({ xp: { total: 321 } });
      window.GamificationStudent.missions.render(missions);
      window.GamificationStudent.classChallenge.render(challenge);
    }, {
      missions: missionsPayload('Alpha Mission'),
      challenge: challengePayload(true, 'Alpha Class'),
    });
"""
text = replace_once(text, old_alpha, new_alpha, 'gate 4 Alpha forced-refresh settlement')

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
new_beta = """    await settleSignInGamification(page);
    await renderHomeAndSettleForcedGamification(page, homeModel('Student Beta'));
    await page.evaluate(({ missions, challenge }) => {
      window.GamificationStudent.xp.render({ xp: { total: 654 } });
      window.GamificationStudent.missions.render(missions);
      window.GamificationStudent.classChallenge.render(challenge);
    }, {
      missions: missionsPayload('Beta Mission'),
      challenge: challengePayload(true, 'Beta Class'),
    });
"""
text = replace_once(text, old_beta, new_beta, 'gate 4 Beta forced-refresh settlement')

old_gate8 = """  test('gate 8 — class challenge uses one static card and toggles enabled/disabled without create/remove', async ({ page }) => {
    await installStaticCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await waitForOption2bRuntime(page);

    await page.evaluate(payload => window.GamificationStudent.classChallenge.render(payload), challengePayload(true, '6B'));
"""
new_gate8 = """  test('gate 8 — class challenge uses one static card and toggles enabled/disabled without create/remove', async ({ page }) => {
    await installStaticCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await waitForOption2bRuntime(page);
    await settleSignInGamification(page);

    await page.evaluate(payload => window.GamificationStudent.classChallenge.render(payload), challengePayload(true, '6B'));
"""
text = replace_once(text, old_gate8, new_gate8, 'gate 8 sign-in refresh settlement')

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