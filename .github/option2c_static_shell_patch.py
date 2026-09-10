from pathlib import Path
import hashlib
import re
import subprocess

ROOT = Path.cwd()
BASE_SHA = 'cacf5d0a2e1b921275dbde9a1a115576d1046b64'
SUPABASE_TREE = '19dd92c4e1f1d7c3ab9fc522d1b1cdf191afc456'
INDEX = ROOT / 'site/index.html'
OPTION2A = ROOT / 'e2e/tests/v40-static-student-signin-shell-option2a.spec.cjs'
OPTION2B = ROOT / 'e2e/tests/v40-static-authenticated-home-option2b.spec.cjs'
OPTION2C = ROOT / 'e2e/tests/v40-static-v40-shell-option2c.spec.cjs'

EXPECTED = {
    'site/index.html': 'be7909f3534c77b3eb570ab3b971c33f58ebdaed',
    'site/v40-student-nav.js': '8a0fa4431de98be56c189f906ea9ba3f0bdf4fc3',
    'site/v40-learn-setup.js': '9293a79306455f2cfeb3ad0525e7203ad26de7e5',
    'e2e/tests/v40-static-student-signin-shell-option2a.spec.cjs': 'd283b8ca6e220710a76d4886ceed4c3a90ed4e7d',
    'e2e/tests/v40-static-authenticated-home-option2b.spec.cjs': '0df1cfdf046d7866522f82bcdb9abbc86bbcb93a',
}

FROZEN = {
    'site/config.js': '2c684d511315a4cd1f76e0ec833e614928e33180',
    'site/v39-student-polish.js': '4daea69a282d99f7e8a07bd4aeaa26dcaaaf86ad',
    'site/v40-student-platform.js': 'c200fd22365d54178696b5f12e6866c8b4edbfed',
    'site/v40-student-session.js': '52150813ff7eeeff72cbc98ab1cafff180d32c96',
    'site/v40-learning-priorities.js': 'bfec5b47eaf266486d21c96acdb4e1cfd677b328',
    'site/v40-platform-polish.js': '5ebdcb4c8d6a8a4c5fad19fa14dfaea2561d102b',
    'site/v40-release.js': 'a308df11b601bf563b56d555e9f434652e524d77',
    'site/v40-start-shell.js': '26280684b65275ea13656b3e423a8a3ce81cd9e9',
    'site/v41-signin-guard.js': '5794576f4c41e32ae8bb081e380ff892ef5f4a6c',
    'site/v52b1-question-bank-observer-gate.js': '82a87ffed9091b76c9008a3949c3bd432c2d06ce',
    'site/gamification-core.js': '87d6175270284e4b40c3a1fbcd196622179d0402',
    'site/gamification-student.js': 'd9c4dc0e25cbed50346937db887a703800be5a59',
    'site/v57c-student-continue-learning-home.js': '196225cf94035363869b8051bc33cdd3c03993f9',
    'site/v58a-student-first-use-experience.js': '8e0279e86b1ece862586238f99c760129c13465f',
}


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()


def blob(path):
    return git('hash-object', path)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


def manifest(root, excluded=()):
    excluded = set(excluded)
    output = git('ls-files', '-co', '--exclude-standard', root)
    paths = sorted(set(filter(None, output.splitlines()))) if output else []
    records = [f'{blob(path)}  {path}' for path in paths if path not in excluded]
    payload = ('\n'.join(records) + ('\n' if records else '')).encode()
    return hashlib.sha256(payload).hexdigest()


def nav_markup(screen, active):
    items = [
        ('home', '🏠', 'Home', None),
        ('learn', '✏️', 'Learn', 'start-btn'),
        ('assignments', '📚', 'Assignments', 'my-assignments-btn'),
        ('progress', '📊', 'Progress', 'my-progress-btn'),
        ('reviewed', '✅', 'Reviewed', 'check-reviewed-btn'),
    ]
    lines = [f'  <nav class="v40-student-nav" data-v40-static-nav="true" data-v40-nav-screen="{screen}" aria-label="Student learning navigation">']
    for key, icon, label, source_id in items:
        attrs = ['type="button"', f'data-v40-nav="{key}"']
        if source_id in {'my-assignments-btn', 'my-progress-btn'}:
            attrs.append('class="hidden"')
        if key == active:
            attrs.append('aria-current="page"')
        if screen == 'quiz' and key != 'learn':
            attrs.extend(['disabled', 'title="End Practice before switching sections."'])
        lines.append(f'    <button {" ".join(attrs)}><span aria-hidden="true">{icon}</span><span>{label}</span></button>')
    lines.append('  </nav>')
    if screen == 'quiz':
        lines.append('  <p class="v40-student-nav-note">Finish or end this Practice session before switching to another learning section.</p>')
    return '\n'.join(lines)


def patch_index():
    text = INDEX.read_text()
    old_css = '''/* Option 2B: authenticated Home is source HTML, but stays hidden while logged out
   even before the staged presentation scripts install their equivalent rules. */
#start.v40-shell-logged-out .v40-learning-hub-hero,
#start.v40-shell-logged-out .v40c3-home-dashboard,
#start.v40-shell-logged-out .v40-platform-section,
#start.v40-shell-logged-out .v40-section-note{
  display:none!important;
}
'''
    new_css = '''/* Options 2A–2C: source HTML owns the initial student shell. Keep authenticated
   controls hidden before staged JavaScript enhances the same nodes. */
#start .v40c-session-identity{
  display:none;
}

#start.v40-shell-logged-out > .v40-student-nav,
#start.v40-shell-logged-out .v40c-learn-setup,
#start.v40-shell-logged-out > .mode-switch,
#start.v40-shell-logged-out > #mode-note,
#start.v40-shell-logged-out .v40-learning-hub-hero,
#start.v40-shell-logged-out .v40c3-home-dashboard,
#start.v40-shell-logged-out .v40-platform-section,
#start.v40-shell-logged-out .v40-section-note{
  display:none!important;
}
'''
    text = replace_once(text, old_css, new_css, 'source visibility contract')

    text = replace_once(
        text,
        '<button id="start-btn" class="primary">Start Practice</button>',
        '<button type="button" class="primary v40c-open-learn">Open Learn</button>',
        'static Home Learn launcher',
    )

    mode_start = text.find('  <div class="mode-switch" role="group" aria-label="Choose activity mode">')
    hub_start = text.find('<div class="v39-home-hub v40-platform-ready">', mode_start)
    if mode_start < 0 or hub_start <= mode_start:
        raise RuntimeError('legacy start control region not found')

    learn = '''  <section class="v40c-learn-setup" data-v40-static-learn="true" aria-label="Learn setup">
    <div class="v40c-learn-head">
      <div>
        <div class="v40c-learn-kicker">Learn</div>
        <h2>Choose how you want to learn.</h2>
        <p>Pick Practice for guided learning or Exam for a full past paper.</p>
      </div>
    </div>
    <div class="mode-switch" role="group" aria-label="Choose activity mode">
      <button id="practice-mode-btn" class="mode-btn active" type="button"><strong>📘 Practice Mode</strong><span>Hints, second attempts and instant feedback.</span></button>
      <button id="exam-mode-btn" class="mode-btn" type="button"><strong>📝 Exam Mode</strong><span>Complete a full past paper with no hints or feedback until submission.</span></button>
    </div>
    <div id="mode-note" class="compact-note">Practice Mode is selected.</div>
    <section class="v40c-practice-summary">
      <div class="v40c-summary-head">
        <div><h3>Practice setup</h3><p>Start quickly with these settings, or change them if you want a specific focus.</p></div>
        <button type="button" class="outline v40c-change-settings" aria-expanded="false">Change settings</button>
      </div>
      <div class="v40c-practice-pills" aria-label="Current practice settings">
        <span data-v40-summary="strand"></span><span data-v40-summary="topic"></span><span data-v40-summary="count"></span><span data-v40-summary="difficulty"></span>
      </div>
      <div class="v40c-practice-settings"><div class="v40c-settings-grid">
        <label id="practice-strand-wrap">Strand<select id="strand-filter"></select></label>
        <label id="practice-topic-wrap">Topic<select id="topic-filter"></select></label>
        <label id="practice-count-wrap">Number of questions<select id="question-count"><option>5</option><option selected>10</option><option>15</option><option>20</option></select></label>
        <label id="practice-difficulty-wrap">Difficulty<select id="difficulty-filter"><option value="all">Any difficulty</option><option value="foundation">Foundation</option><option value="standard">Standard</option><option value="challenge">Challenge</option></select></label>
      </div></div>
    </section>
    <section class="v40c-exam-panel hidden">
      <h3>Exam setup</h3><p>Select a complete past paper. Exam Mode keeps its existing save, resume and submission safeguards.</p>
      <div class="v40c-exam-grid">
        <label id="exam-year-wrap" class="hidden">Exam year<select id="exam-year"><option value="">Select exam year</option></select></label>
        <label id="exam-paper-wrap" class="hidden">Paper<select id="exam-paper"><option value="">Select paper</option></select></label>
        <div id="exam-paper-note" class="exam-paper-note hidden">Choose an exam year and paper. The complete active paper will be loaded in question-number order.</div>
        <div id="exam-instructions" class="exam-instructions hidden"></div>
      </div>
    </section>
    <div class="v40c-learn-actions">
      <div class="v40c-learn-action-copy"><strong>Ready to practise?</strong><span>Your selected practice settings will be used for this session.</span></div>
      <button id="start-btn" class="primary">Start Practice</button>
    </div>
  </section>'''
    identity = '''  <div class="grid" style="margin-top:26px">
    <label>Student name<input id="student-name" placeholder="e.g. Aiman" maxlength="40"><span id="student-name-help" class="help">Required when access is open.</span></label>
    <label>Year level<select id="year-level"><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option><option value="5">Year 5</option><option value="6" selected>Year 6</option></select></label>
    <label>Class<select id="class-group"><option>A</option><option>B</option><option>C</option><option>Other</option></select></label>
  </div>'''
    replacement = f'{nav_markup("start", "home")}\n{learn}\n{identity}\n'
    text = text[:mode_start] + replacement + text[hub_start:]

    markers = {
        'quiz': '<section id="quiz" class="card screen">\n',
        'exam-result': '<section id="exam-result" class="card screen result">\n',
        'result': '<section id="result" class="card screen result">\n',
        'student-review': '<section id="student-review" class="card screen">\n',
        'student-assignments': '  <section id="student-assignments" class="card screen">\n',
        'student-dashboard': '<section id="student-dashboard" class="card screen">\n',
    }
    active = {
        'quiz': 'learn', 'exam-result': 'learn', 'result': 'learn',
        'student-review': 'reviewed', 'student-assignments': 'assignments',
        'student-dashboard': 'progress',
    }
    for screen, marker in markers.items():
        text = replace_once(text, marker, marker + nav_markup(screen, active[screen]) + '\n', f'{screen} static nav')

    INDEX.write_text(text)


def patch_option2a(nav_sha, learn_sha):
    original = OPTION2A.read_text()
    text = original
    match = re.search(r"const EXPECTED_FROZEN_SITE_SHA256 = '([0-9a-f]{64})';", text)
    if not match:
        raise RuntimeError('Option 2A frozen manifest seal not found')
    old_manifest = match.group(1)
    text = replace_once(text, "'site/v40-student-nav.js': '86855f09db9ce2900008e50d10b2f685caa87c56'", f"'site/v40-student-nav.js': '{nav_sha}'", '2A nav seal')
    text = replace_once(text, "'site/v40-learn-setup.js': 'bfa85adc8261684a91da87f720fa3e9af24ac677'", f"'site/v40-learn-setup.js': '{learn_sha}'", '2A Learn seal')
    new_manifest = manifest('site', {'site/index.html','site/v40-student-session.js','site/v40-start-shell.js'})
    text = replace_once(text, f"const EXPECTED_FROZEN_SITE_SHA256 = '{old_manifest}';", f"const EXPECTED_FROZEN_SITE_SHA256 = '{new_manifest}';", '2A manifest seal')

    reverse = text
    reverse = replace_once(reverse, f"const EXPECTED_FROZEN_SITE_SHA256 = '{new_manifest}';", f"const EXPECTED_FROZEN_SITE_SHA256 = '{old_manifest}';", '2A reverse manifest')
    reverse = replace_once(reverse, f"'site/v40-student-nav.js': '{nav_sha}'", "'site/v40-student-nav.js': '86855f09db9ce2900008e50d10b2f685caa87c56'", '2A reverse nav')
    reverse = replace_once(reverse, f"'site/v40-learn-setup.js': '{learn_sha}'", "'site/v40-learn-setup.js': 'bfa85adc8261684a91da87f720fa3e9af24ac677'", '2A reverse Learn')
    if reverse != original:
        raise RuntimeError('Option 2A patch changed more than successor seals')
    OPTION2A.write_text(text)
    return new_manifest


def patch_option2b(nav_sha, learn_sha):
    original = OPTION2B.read_text()
    text = original
    text = replace_once(text, "'site/v40-student-nav.js': '86855f09db9ce2900008e50d10b2f685caa87c56'", f"'site/v40-student-nav.js': '{nav_sha}'", '2B nav seal')
    text = replace_once(text, "'site/v40-learn-setup.js': 'bfa85adc8261684a91da87f720fa3e9af24ac677'", f"'site/v40-learn-setup.js': '{learn_sha}'", '2B Learn seal')
    old_allow = '''const ALLOWED_SITE_CHANGES = new Set([
  ...AUTHORIZED_RUNTIME_CHANGES,
  ...AUTHORIZED_SUCCESSOR_SEAL_CHANGES,
]);'''
    new_allow = '''const OPTION2C_SUCCESSOR_RUNTIME = new Set([
  'site/v40-student-nav.js',
  'site/v40-learn-setup.js',
]);

const ALLOWED_SITE_CHANGES = new Set([
  ...AUTHORIZED_RUNTIME_CHANGES,
  ...AUTHORIZED_SUCCESSOR_SEAL_CHANGES,
  ...OPTION2C_SUCCESSOR_RUNTIME,
]);'''
    text = replace_once(text, old_allow, new_allow, '2B exact Option 2C successor allowlist')

    reverse = text
    reverse = replace_once(reverse, new_allow, old_allow, '2B reverse allowlist')
    reverse = replace_once(reverse, f"'site/v40-student-nav.js': '{nav_sha}'", "'site/v40-student-nav.js': '86855f09db9ce2900008e50d10b2f685caa87c56'", '2B reverse nav')
    reverse = replace_once(reverse, f"'site/v40-learn-setup.js': '{learn_sha}'", "'site/v40-learn-setup.js': 'bfa85adc8261684a91da87f720fa3e9af24ac677'", '2B reverse Learn')
    if reverse != original:
        raise RuntimeError('Option 2B patch changed more than exact successor seals/allowlist')
    OPTION2B.write_text(text)


def main():
    if git('rev-parse', f'{BASE_SHA}^{{commit}}') != BASE_SHA:
        raise RuntimeError('approved base unavailable')
    if git('rev-parse', 'HEAD:supabase') != SUPABASE_TREE:
        raise RuntimeError('Supabase tree changed before patch')
    if git('status', '--porcelain', '--', 'supabase'):
        raise RuntimeError('Supabase working tree is not clean')

    for path, expected in EXPECTED.items():
        actual = blob(path)
        if actual != expected:
            raise RuntimeError(f'pre-patch blob mismatch: {path} {actual} != {expected}')
    for path, expected in FROZEN.items():
        if blob(path) != expected:
            raise RuntimeError(f'frozen pre-patch blob mismatch: {path}')

    patch_index()
    index_sha = blob('site/index.html')
    nav_sha = blob('site/v40-student-nav.js')
    learn_sha = blob('site/v40-learn-setup.js')
    option2a_manifest = patch_option2a(nav_sha, learn_sha)
    patch_option2b(nav_sha, learn_sha)

    frozen_manifest = manifest('site', {'site/index.html','site/v40-student-nav.js','site/v40-learn-setup.js'})
    spec = OPTION2C.read_text()
    spec = replace_once(spec, '__INDEX_SHA__', index_sha, 'Option 2C index seal')
    spec = replace_once(spec, '__EXPECTED_FROZEN_SITE_SHA256__', frozen_manifest, 'Option 2C frozen-site seal')
    OPTION2C.write_text(spec)

    for path, expected in FROZEN.items():
        if blob(path) != expected:
            raise RuntimeError(f'frozen blob changed during patch: {path}')
    if git('rev-parse', 'HEAD:supabase') != SUPABASE_TREE or git('status', '--porcelain', '--', 'supabase'):
        raise RuntimeError('Supabase changed during patch')

    changed = {line[3:] for line in git('status', '--porcelain').splitlines() if line.strip()}
    expected_changed = {
        'site/index.html',
        'e2e/tests/v40-static-student-signin-shell-option2a.spec.cjs',
        'e2e/tests/v40-static-authenticated-home-option2b.spec.cjs',
        'e2e/tests/v40-static-v40-shell-option2c.spec.cjs',
    }
    if changed != expected_changed:
        raise RuntimeError(f'unexpected materialization scope: {sorted(changed)}')

    print('OPTION2C_INDEX_SHA=' + index_sha)
    print('OPTION2C_NAV_SHA=' + nav_sha)
    print('OPTION2C_LEARN_SHA=' + learn_sha)
    print('OPTION2A_SITE_MANIFEST=' + option2a_manifest)
    print('OPTION2C_FROZEN_SITE_MANIFEST=' + frozen_manifest)
    print('SUPABASE_TREE=' + SUPABASE_TREE)
    print('Option 2C deterministic materialization and successor-seal self-audits passed.')


if __name__ == '__main__':
    main()
