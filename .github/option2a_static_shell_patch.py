from pathlib import Path
import hashlib
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
ALLOWED_SITE = {
    'site/index.html',
    'site/v40-student-session.js',
    'site/v40-start-shell.js',
}


def run(*args):
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


def working_manifest_hash(root, excluded=frozenset()):
    output = run('git', 'ls-files', '-co', '--exclude-standard', root)
    paths = sorted(set(filter(None, output.splitlines()))) if output else []
    records = []
    for pathname in paths:
        if pathname in excluded:
            continue
        blob = run('git', 'hash-object', pathname)
        records.append(f'{blob}  {pathname}')
    payload = ('\n'.join(records) + ('\n' if records else '')).encode()
    return hashlib.sha256(payload).hexdigest()


def seal_test_manifests():
    frozen_site_hash = working_manifest_hash('site', ALLOWED_SITE)
    supabase_hash = working_manifest_hash('supabase')
    test_path = ROOT / 'e2e/tests/v40-static-student-signin-shell-option2a.spec.cjs'
    text = test_path.read_text()
    assert text.count('__EXPECTED_FROZEN_SITE_SHA256__') == 1
    assert text.count('__EXPECTED_SUPABASE_SHA256__') == 1
    text = text.replace('__EXPECTED_FROZEN_SITE_SHA256__', frozen_site_hash)
    text = text.replace('__EXPECTED_SUPABASE_SHA256__', supabase_hash)
    test_path.write_text(text)


def patch_index():
    path = ROOT / 'site/index.html'
    text = path.read_text()

    old_start = '<section id="start" class="card screen active">'
    new_start = '<section id="start" class="card screen active v40-shell-logged-out">'
    assert text.count(old_start) == 1
    text = text.replace(old_start, new_start, 1)

    header_anchor = (
        '  </div></div><span id="cloud-status" class="badge local">● Local Demo</span></div>\n'
        '  <div class="mode-switch" role="group" aria-label="Choose activity mode">'
    )
    assert text.count(header_anchor) == 1
    static_panel = '''  </div></div><span id="cloud-status" class="badge local">● Local Demo</span></div>
  <section class="v40c-session-panel" aria-label="Student session">
    <div class="v40c-session-head">
      <div>
        <h3>Student sign in</h3>
        <p>Sign in once, then move between your learning sections without entering your PIN again.</p>
      </div>
    </div>
    <div class="v40c-login-fields">
      <label>Student ID<input id="student-id" placeholder="e.g. 6A-012" maxlength="40" autocomplete="username"><span id="student-id-help" class="help">Optional school identifier.</span></label>
      <label id="student-pin-wrap" class="hidden">Student PIN<input id="student-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="current-password" placeholder="4–8 digits"><span class="help">Your teacher provides or resets this PIN.</span></label>
      <div id="student-access-note" class="info wide">Loading student access settings…</div>
    </div>
    <div class="v40c-login-actions">
      <button type="button" class="primary" id="v40c-student-signin">Sign in to Learning Hub</button>
      <span class="v40c-session-status" id="v40c-session-status">Your PIN is checked securely and is not saved.</span>
    </div>
    <div class="v40c-session-identity">
      <div class="v40c-session-identity-text"></div>
      <button type="button" class="outline" id="v40c-student-logout">Log out</button>
    </div>
  </section>
  <div class="mode-switch" role="group" aria-label="Choose activity mode">'''
    text = text.replace(header_anchor, static_panel, 1)

    legacy_lines = [
        '    <label>Student ID<input id="student-id" placeholder="e.g. 6A-012" maxlength="40" autocomplete="username"><span id="student-id-help" class="help">Optional school identifier.</span></label>\n',
        '    <label id="student-pin-wrap" class="hidden">Student PIN<input id="student-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="current-password" placeholder="4–8 digits"><span class="help">Your teacher provides or resets this PIN.</span></label>\n',
        '    <div id="student-access-note" class="info wide">Loading student access settings…</div>\n',
    ]
    for legacy_line in legacy_lines:
        assert text.count(legacy_line) == 2
        first = text.find(legacy_line)
        second = text.find(legacy_line, first + len(legacy_line))
        assert second > first
        text = text[:second] + text[second + len(legacy_line):]

    assert text.count('id="student-id"') == 1
    assert text.count('id="student-pin"') == 1
    assert text.count('class="v40c-session-panel"') == 1
    assert text.count('id="v40c-student-signin"') == 1
    assert text.count('id="v40c-student-logout"') == 1
    path.write_text(text)


def patch_student_session():
    path = ROOT / 'site/v40-student-session.js'
    text = path.read_text()
    pattern = re.compile(
        r"  function buildSessionPanel\(\)\{.*?\n  \}\n\n  function clearStudentUi\(\)\{",
        re.S,
    )
    replacement = '''  function buildSessionPanel(){
    const start = document.getElementById('start');
    const panel = start?.querySelector('.v40c-session-panel');
    const fields = panel?.querySelector('.v40c-login-fields');
    const studentId = document.getElementById('student-id');
    const studentPin = document.getElementById('student-pin');
    const studentPinWrap = document.getElementById('student-pin-wrap');
    const accessNote = document.getElementById('student-access-note');
    const signIn = document.getElementById('v40c-student-signin');
    const logout = document.getElementById('v40c-student-logout');

    if (
      !start ||
      !panel ||
      !fields ||
      !studentId ||
      !studentPin ||
      !studentPinWrap ||
      !accessNote ||
      !signIn ||
      !logout
    ) return;

    const idLabel = studentId.closest('label');
    const staticNodesAreInPlace = !!(
      idLabel &&
      idLabel.parentElement === fields &&
      studentPinWrap.parentElement === fields &&
      accessNote.parentElement === fields
    );

    if (!staticNodesAreInPlace) {
      console.warn('V4.0 static student sign-in shell is incomplete.');
      return;
    }

    if (panel.dataset.v40SessionEnhanced === 'true') return;
    panel.dataset.v40SessionEnhanced = 'true';

    signIn.addEventListener('click', () => validateStudentAccess('practice'));
    logout.addEventListener('click', logoutStudentV40);

    studentPin.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !sessionIsValid()) {
        event.preventDefault();
        validateStudentAccess('practice');
      }
    });
  }

  function clearStudentUi(){'''
    text, count = pattern.subn(replacement, text, count=1)
    assert count == 1
    build_slice = text[text.index('function buildSessionPanel'):text.index('function clearStudentUi')]
    assert "document.createElement('section')" not in build_slice
    assert '.appendChild(idLabel)' not in build_slice
    path.write_text(text)


def patch_start_shell():
    path = ROOT / 'site/v40-start-shell.js'
    text = path.read_text()
    pattern = re.compile(
        r"  function applyShellState\(\{ resetView = false \} = \{\}\)\{.*?\n  \}\n\n  function keepFreshSignInOnHome\(\)\{",
        re.S,
    )
    replacement = '''  function applyShellState({ resetView = false, preserveInitialLoggedOut = false } = {}){
    const start = startScreen();
    if (!start) return;

    const signedIn = isSignedIn();
    start.classList.toggle('v40-shell-authenticated', signedIn);

    if (signedIn) {
      start.classList.remove('v40-shell-logged-out');
    } else if (!preserveInitialLoggedOut) {
      start.classList.add('v40-shell-logged-out');
    }

    if (!signedIn) {
      delete start.dataset.v40StartView;
      clearStoredView();
      return;
    }

    setStartView(resetView ? 'home' : preferredView(), { scroll:false });
  }

  function keepFreshSignInOnHome(){'''
    text, count = pattern.subn(replacement, text, count=1)
    assert count == 1
    assert text.count('    applyShellState();') == 1
    text = text.replace(
        '    applyShellState();',
        '    applyShellState({ preserveInitialLoggedOut:true });',
        1,
    )
    path.write_text(text)


def assert_scope():
    changed = run('git', 'diff', '--name-only', 'HEAD', '--', 'site', 'supabase').splitlines()
    assert sorted(changed) == sorted(ALLOWED_SITE), changed


if __name__ == '__main__':
    seal_test_manifests()
    patch_index()
    patch_student_session()
    patch_start_shell()
    assert_scope()
