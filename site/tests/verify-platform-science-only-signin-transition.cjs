const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'platform-student-session-v01.js'),
  'utf8'
);

class FakeClassList {
  constructor(){ this.values = new Set(); }
  add(...names){ names.forEach(name => this.values.add(name)); }
  remove(...names){ names.forEach(name => this.values.delete(name)); }
  contains(name){ return this.values.has(name); }
}

class FakeElement {
  constructor(id = ''){
    this.id = id;
    this.value = '';
    this.disabled = false;
    this.dataset = {};
    this.classList = new FakeClassList();
    this.listeners = new Map();
    this.attributes = new Map();
    this.innerHTML = '';
    this.textContent = '';
    this.queries = new Map();
  }

  addEventListener(type, listener, options = {}){
    const listeners = this.listeners.get(type) || [];
    listeners.push({ listener, capture: options === true || options?.capture === true });
    this.listeners.set(type, listeners);
  }

  dispatch(type, init = {}){
    const event = {
      type,
      target: this,
      key: init.key,
      defaultPrevented: false,
      immediateStopped: false,
      preventDefault(){ this.defaultPrevented = true; },
      stopImmediatePropagation(){ this.immediateStopped = true; }
    };
    const listeners = this.listeners.get(type) || [];
    for (const phase of [true, false]) {
      for (const entry of listeners) {
        if (entry.capture !== phase || event.immediateStopped) continue;
        entry.listener.call(this, event);
      }
    }
    return event;
  }

  querySelector(selector){ return this.queries.get(selector) || null; }
  setAttribute(name, value){ this.attributes.set(name, String(value)); }
  removeAttribute(name){ this.attributes.delete(name); }
}

class FakeStorage {
  constructor(){ this.values = new Map(); }
  getItem(key){ return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value){ this.values.set(key, String(value)); }
  removeItem(key){ this.values.delete(key); }
}

function createHarness(subjects){
  const elements = new Map();
  const add = (id, value = '') => {
    const element = new FakeElement(id);
    element.value = value;
    elements.set(id, element);
    return element;
  };

  const start = add('start');
  start.classList.add('screen', 'active', 'v40-shell-logged-out');
  const panel = add('session-panel');
  panel.classList.add('v40c-session-panel');
  const identity = add('session-identity');
  identity.classList.add('v40c-session-identity-text');
  panel.queries.set('.v40c-session-identity-text', identity);

  const studentId = add('student-id', subjects.maths ? '6A-ARINA' : '4A-RAIS');
  const pin = add('student-pin', '123456');
  add('student-name', '');
  add('year-level', subjects.maths ? '6' : '4');
  add('class-group', subjects.maths ? '6A' : '4A');
  const signIn = add('v40c-student-signin');
  add('v40c-student-logout');
  const status = add('v40c-session-status');
  add('my-progress-btn');
  add('my-assignments-btn');

  const documentListeners = new Map();
  const document = {
    readyState: 'complete',
    getElementById: id => elements.get(id) || null,
    querySelector: selector => {
      if (selector === '#start .v40c-session-panel') return panel;
      if (selector === '.screen.active') return start;
      return null;
    },
    querySelectorAll: () => [],
    addEventListener(type, listener){
      const listeners = documentListeners.get(type) || [];
      listeners.push(listener);
      documentListeners.set(type, listeners);
    }
  };

  const windowListeners = new Map();
  const emitted = [];
  const window = {
    addEventListener(type, listener){
      const listeners = windowListeners.get(type) || [];
      listeners.push(listener);
      windowListeners.set(type, listeners);
    },
    dispatchEvent(event){
      emitted.push(event);
      for (const listener of windowListeners.get(event.type) || []) listener(event);
      return true;
    }
  };

  let platformCalls = 0;
  let sharedCloudCalls = 0;
  let mathsCalls = 0;
  let legacyBubbleCalls = 0;
  const alerts = [];
  const sessionStorage = new FakeStorage();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const legacyMathValidator = async purpose => {
    mathsCalls += 1;
    assert.equal(pin.value, '123456', 'Maths validator must receive the in-memory PIN.');
    return { access_token:'math-ticket', purpose, year_level:6 };
  };

  // Represents the pre-existing V4 target/bubble listener installed first.
  signIn.addEventListener('click', () => { legacyBubbleCalls += 1; });

  const context = vm.createContext({
    window,
    document,
    location: { hostname:'deploy-preview-176--magical-pixie-a61111.netlify.app' },
    sessionStorage,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}){ this.type = type; this.detail = init.detail; }
    },
    fetch: async (url, options) => {
      assert.equal(url, 'https://example.supabase.co/rest/v1/rpc/validate_platform_student_access');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.apikey, 'public-test-key');
      const payload = JSON.parse(options.body);
      assert.equal(payload.p_student_id, studentId.value);
      assert.equal(payload.p_pin, '123456');
      platformCalls += 1;
      return {
        ok:true,
        status:200,
        async json(){
          return {
            allowed: true,
            platform_access_token: 'platform-ticket',
            access_mode: 'student_pin',
            registered: true,
            roster_student_id: subjects.maths ? 'roster-arina' : 'roster-rais',
            class_id: subjects.maths ? 'class-6a' : 'class-4a',
            student_name: subjects.maths ? 'Arina' : 'Rais',
            student_id: studentId.value,
            year_level: subjects.maths ? 6 : 4,
            class_name: subjects.maths ? '6A' : '4A',
            expires_at: expiresAt,
            subjects: {
              maths: { allowed:subjects.maths, source:'class' },
              science: { allowed:subjects.science, source:'class' }
            }
          };
        }
      };
    },
    AbortController,
    clearTimeout,
    cloudReady: true,
    cloud: {
      async rpc(){
        sharedCloudCalls += 1;
        throw new Error('Platform login must bypass the mutable shared cloud.rpc chain.');
      }
    },
    MATH_APP_CONFIG: undefined,
    studentAccessPolicy: {
      access_mode: 'student_pin',
      student_id_required: true,
      pin_required: true
    },
    validateStudentAccess: legacyMathValidator,
    activeStudentAccess: { access_token:'stale' },
    esc: value => String(value),
    show: id => { context.lastShown = id; },
    alert: message => alerts.push(message),
    console,
    setTimeout,
    Date,
    Promise
  });
  window.MATH_APP_CONFIG = {
    supabaseUrl:'https://example.supabase.co',
    supabasePublishableKey:'public-test-key'
  };
  context.window.window = window;
  context.window.document = document;

  new vm.Script(source, { filename:'platform-student-session-v01.js' }).runInContext(context);

  return {
    context,
    elements,
    panel,
    identity,
    start,
    studentId,
    pin,
    signIn,
    status,
    sessionStorage,
    emitted,
    alerts,
    counts: () => ({ platformCalls, sharedCloudCalls, mathsCalls, legacyBubbleCalls })
  };
}

async function settle(){
  await new Promise(resolve => setImmediate(resolve));
  await Promise.resolve();
}

(async () => {
  const science = createHarness({ maths:false, science:true });
  const click = science.signIn.dispatch('click');
  await settle();

  assert.equal(click.defaultPrevented, true, 'Platform owner must consume the sign-in click.');
  assert.deepEqual(science.counts(), {
    platformCalls: 1,
    sharedCloudCalls: 0,
    mathsCalls: 0,
    legacyBubbleCalls: 0
  }, 'Science-only sign-in must authenticate once without entering either legacy Maths path.');
  assert.equal(science.context.activeStudentAccess, null);
  assert.equal(science.panel.classList.contains('v40c-authenticated'), true);
  assert.equal(science.start.dataset.v40StartView, 'home');
  assert.equal(science.start.classList.contains('v40-shell-logged-out'), false);
  assert.equal(science.studentId.disabled, true);
  assert.equal(science.pin.disabled, true);
  assert.equal(science.pin.value, '');
  assert.match(science.identity.innerHTML, /Signed in as Rais/);
  assert.match(science.identity.innerHTML, /Subject access: Science/);
  assert.equal(science.status.textContent, 'Signed in securely. Choose Science from My Learning.');
  assert.equal(science.signIn.disabled, false);
  assert.equal(science.alerts.length, 0);

  const stored = JSON.parse(science.sessionStorage.getItem('learningPlatformSessionV01'));
  assert.equal(stored.identity.student_id, '4A-RAIS');
  assert.equal(stored.subjects.maths.allowed, false);
  assert.equal(stored.subjects.science.allowed, true);
  assert.equal(science.sessionStorage.getItem('v40StartView'), 'home');
  assert.equal(
    science.emitted.filter(event => event.type === 'platformsubjectaccesschange').length,
    1,
    'One successful platform authentication must publish one state change.'
  );

  const maths = createHarness({ maths:true, science:false });
  const result = await maths.context.window.platformStudentSessionV01.signIn('practice');
  assert.equal(result.access_token, 'math-ticket');
  assert.deepEqual(maths.counts(), {
    platformCalls: 1,
    sharedCloudCalls: 0,
    mathsCalls: 1,
    legacyBubbleCalls: 0
  }, 'Maths-enabled sign-in must delegate exactly once after platform authorization.');
  assert.equal(maths.alerts.length, 0);

  console.log('Platform sign-in state-transition regression passed.');
  console.log('- 4A Science-only moves from logged-out form to authenticated My Learning');
  console.log('- shared cloud.rpc wrappers, legacy Maths validation and duplicate bubble listener are not invoked');
  console.log('- Year 6 Maths authorization still delegates exactly once');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
