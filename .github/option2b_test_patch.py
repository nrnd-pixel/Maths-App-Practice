#!/usr/bin/env python3
"""Deterministically align the Option 2B hard-gate spec with approved seal scope.

This is temporary branch validation scaffolding. It changes only the Option 2B
E2E spec: two race-prone fixture sequences are synchronized with the existing
gamification refresh lifecycle, and gate 12 recognizes the explicitly approved
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

async function primeGamification(page) {
  await expect.poll(
    () => page.evaluate(async () => Boolean(await window.GamificationStudent.refresh(true))),
    { timeout: 15_000, intervals: [100, 150, 250, 400] },
  ).toBe(true);
}

async function renderHomeAndWaitForScheduledGamificationRefresh(page, model) {
  await primeGamification(page);
  const before = await page.evaluate(() => {
    if (!window.__option2bChallengeEvents) {
      window.__option2bChallengeEvents = 0;
      window.addEventListener('v573:class-challenge-updated', () => {
        window.__option2bChallengeEvents += 1;
      });
    }
    return window.__option2bChallengeEvents;
  });

  await page.evaluate(value => window.V57CStudentContinueLearningHome.render(value), model);

  // V57C emits v57c:home-updated. Existing gamification ownership first renders
  // the primed cache synchronously, then performs its scheduled forced refresh.
  // Waiting for two class-challenge output events proves both phases have settled
  // before this test injects its deterministic fixture values.
  await expect.poll(
    () => page.evaluate(start => window.__option2bChallengeEvents >= start + 2, before),
    { timeout: 15_000, intervals: [50, 100, 150, 250] },
  ).toBe(true);
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
