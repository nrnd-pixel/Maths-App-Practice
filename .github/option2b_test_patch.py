#!/usr/bin/env python3
"""Deterministically align the Option 2B hard-gate spec with approved seal scope.

This is temporary branch validation scaffolding. It changes only the Option 2B
E2E spec: race-prone fixture sequences are synchronized with the complete
XP -> achievements -> missions -> class-challenge lifecycle, including V57C's
scheduled forced refresh, and gate 12 recognizes the explicitly approved
historical successor-seal files without relaxing frozen runtime/Supabase checks.
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

const GAMIFICATION_LIFECYCLE_EVENTS = Object.freeze([
  'v571a:gamification-updated',
  'v571b:achievements-updated',
  'v572:missions-updated',
  'v573:class-challenge-updated',
]);

// The runtime schedules the V57C-forced refresh after 70ms and may retry after
// 180ms when a load is already active. A >180ms event-free poll window following
// a complete serial lifecycle therefore proves those scheduled paths are settled
// without using a blind sleep as the synchronization mechanism.
const GAMIFICATION_SETTLE_QUIET_MS = 220;

async function armGamificationLifecycleProbe(page) {
  await page.evaluate(eventNames => {
    if (!window.__option2bGamificationLifecycleProbe) {
      const probe = { events: [] };
      window.__option2bGamificationLifecycleProbe = probe;
      for (const name of eventNames) {
        window.addEventListener(name, () => {
          probe.events.push({ name, at: performance.now() });
        });
      }
    }
    window.__option2bGamificationLifecycleProbe.events = [];
  }, GAMIFICATION_LIFECYCLE_EVENTS);
}

async function waitForGamificationLifecycleQuiescence(page, minimumCycles = 1) {
  await expect.poll(
    () => page.evaluate(({ eventNames, minimumCycles, quietMs }) => {
      const entries = window.__option2bGamificationLifecycleProbe?.events || [];
      let position = 0;
      let cycles = 0;
      for (const entry of entries) {
        if (entry.name === eventNames[position]) {
          position += 1;
        } else {
          position = entry.name === eventNames[0] ? 1 : 0;
        }
        if (position === eventNames.length) {
          cycles += 1;
          position = 0;
        }
      }
      const last = entries[entries.length - 1];
      if (cycles < minimumCycles || !last || last.name !== eventNames[eventNames.length - 1]) return false;
      return performance.now() - last.at >= quietMs;
    }, {
      eventNames: GAMIFICATION_LIFECYCLE_EVENTS,
      minimumCycles,
      quietMs: GAMIFICATION_SETTLE_QUIET_MS,
    }),
    { timeout: 15_000, intervals: [40, 60, 80, 120] },
  ).toBe(true);
}

async function primeGamification(page) {
  await armGamificationLifecycleProbe(page);
  await expect.poll(
    () => page.evaluate(async () => Boolean(await window.GamificationStudent.refresh(true))),
    { timeout: 15_000, intervals: [100, 150, 250, 400] },
  ).toBe(true);
  await waitForGamificationLifecycleQuiescence(page, 1);
}

async function renderHomeAndWaitForScheduledGamificationRefresh(page, model) {
  // First settle any sign-in/previous Home refresh that could still be active.
  await primeGamification(page);
  await armGamificationLifecycleProbe(page);

  await page.evaluate(value => window.V57CStudentContinueLearningHome.render(value), model);

  // V57C emits v57c:home-updated. Existing gamification ownership renders the
  // primed cache synchronously (one complete lifecycle) and then schedules its
  // forced refresh 70ms later (a second complete lifecycle). Requiring both
  // ordered lifecycle sequences plus a >180ms quiet window proves the refresh
  // path is quiescent before deterministic fixture values are injected.
  await waitForGamificationLifecycleQuiescence(page, 2);
}

function homeModel(name = 'Fixture Student') {
"""
text = replace_once(text, old_helpers, new_helpers, 'gamification settlement helpers')

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
text = replace_once(text, old_alpha, new_alpha, 'gate 4 Alpha fixture sequencing')

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
text = replace_once(text, old_beta, new_beta, 'gate 4 Beta fixture sequencing')

old_gate8_start = """    await signInStudent(page);
    await waitForOption2bRuntime(page);

    await page.evaluate(payload => window.GamificationStudent.classChallenge.render(payload), challengePayload(true, '6B'));
"""
new_gate8_start = """    await signInStudent(page);
    await waitForOption2bRuntime(page);
    await primeGamification(page);

    await page.evaluate(payload => window.GamificationStudent.classChallenge.render(payload), challengePayload(true, '6B'));
"""
# This short sequence occurs in gate 8 and may also occur elsewhere. Anchor it to
# the gate heading to prevent accidentally modifying another test.
gate8_heading = "test('gate 8 — class challenge uses one static card and toggles enabled/disabled without create/remove', async ({ page }) => {"
gate8_index = text.find(gate8_heading)
if gate8_index < 0:
    raise RuntimeError('gate 8 heading not found')
prefix, gate8_tail = text[:gate8_index], text[gate8_index:]
gate8_tail = replace_once(gate8_tail, old_gate8_start, new_gate8_start, 'gate 8 refresh settlement')
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
print('Option 2B E2E deterministic test patch applied successfully.')