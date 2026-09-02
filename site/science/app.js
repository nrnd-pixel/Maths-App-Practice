(() => {
  'use strict';

  const config = window.SCIENCE_CONFIG;
  if (!config?.supabaseUrl || !config?.supabasePublishableKey) {
    throw new Error('Science configuration is missing.');
  }

  const MATH_SESSION_KEY = 'mathStudentSessionV40';
  const SCIENCE_SESSION_KEY = 'scienceStudentSessionV01';
  const EXCHANGE_FUNCTION = 'science-session-exchange-v01';
  const EXPIRY_SAFETY_MS = 15 * 1000;

  const state = {
    token: '',
    expiresAt: 0,
    student: null,
    catalog: [],
    currentLessonId: null
  };

  const $ = (id) => document.getElementById(id);
  const screens = ['accessScreen', 'homeScreen', 'lessonScreen', 'loadingScreen', 'errorScreen'];

  function showScreen(id) {
    screens.forEach((screenId) => $(screenId)?.classList.toggle('active', screenId === id));
    $('forgetAccessBtn')?.classList.toggle('hidden', !state.token || id === 'accessScreen');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value ?? '';
  }

  function clearChildren(el) {
    while (el?.firstChild) el.removeChild(el.firstChild);
  }

  async function parseResponse(response) {
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
  }

  function readMathSession() {
    try {
      const raw = sessionStorage.getItem(MATH_SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (
        session?.version !== 1 ||
        !session?.tokens?.practice ||
        !session?.identity?.student_id ||
        !session?.identity?.student_name ||
        Number(session?.expiresAt || 0) <= Date.now()
      ) return null;
      return session;
    } catch {
      return null;
    }
  }

  function scienceSessionIsValid(session, mathSession = readMathSession()) {
    if (!session || !mathSession) return false;
    const expiresAt = Number(session.expiresAt || 0);
    return !!(
      session.token &&
      expiresAt > Date.now() + EXPIRY_SAFETY_MS &&
      session.student?.student_id &&
      String(session.student.student_id) === String(mathSession.identity.student_id)
    );
  }

  function readScienceSession() {
    try {
      const raw = sessionStorage.getItem(SCIENCE_SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      return scienceSessionIsValid(session) ? session : null;
    } catch {
      return null;
    }
  }

  function saveScienceSession(payload) {
    const expiresAt = Date.parse(payload?.expires_at || '');
    const session = {
      token: String(payload?.access_token || ''),
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0,
      student: payload?.student || null
    };

    if (!scienceSessionIsValid(session)) {
      throw new Error('Science access could not be verified.');
    }

    state.token = session.token;
    state.expiresAt = session.expiresAt;
    state.student = session.student;
    sessionStorage.setItem(SCIENCE_SESSION_KEY, JSON.stringify(session));
  }

  function clearScienceSession() {
    state.token = '';
    state.expiresAt = 0;
    state.student = null;
    state.catalog = [];
    state.currentLessonId = null;
    try { sessionStorage.removeItem(SCIENCE_SESSION_KEY); } catch {}
  }

  function applySavedScienceSession() {
    const saved = readScienceSession();
    if (!saved) return false;
    state.token = saved.token;
    state.expiresAt = saved.expiresAt;
    state.student = saved.student;
    return true;
  }

  function errorMessage(payload, fallback) {
    if (!payload) return fallback;
    if (typeof payload === 'string') return payload;
    return payload.error || payload.message || fallback;
  }

  async function exchangeMathSession() {
    const mathSession = readMathSession();
    if (!mathSession) {
      clearScienceSession();
      return false;
    }

    const response = await fetch(`${config.supabaseUrl}/functions/v1/${EXCHANGE_FUNCTION}`, {
      method: 'POST',
      headers: {
        apikey: config.supabasePublishableKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ math_access_token: mathSession.tokens.practice })
    });

    const payload = await parseResponse(response);
    if (!response.ok) {
      const error = new Error(errorMessage(payload, 'Your Learning Hub sign-in is invalid or expired.'));
      error.status = response.status;
      throw error;
    }

    saveScienceSession(payload);
    return true;
  }

  async function ensureScienceSession({ force = false } = {}) {
    const mathSession = readMathSession();
    if (!mathSession) {
      clearScienceSession();
      return false;
    }

    if (!force && state.token && state.expiresAt > Date.now() + EXPIRY_SAFETY_MS) return true;
    if (!force && applySavedScienceSession()) return true;

    clearScienceSession();
    return exchangeMathSession();
  }

  async function rpc(functionName, args) {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: config.supabasePublishableKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    });

    const payload = await parseResponse(response);
    if (!response.ok) {
      const error = new Error(errorMessage(payload, 'Unable to load Science right now.'));
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function scienceAccessExpired(error) {
    const text = String(error?.message || '').toLowerCase();
    return text.includes('invalid_science_access');
  }

  function showSignInRequired(message = '') {
    clearScienceSession();
    showScreen('accessScreen');
    setText('accessMessage', message || 'Sign in with your Student ID + PIN on the main Learning Hub page first.');
  }

  async function loadCatalog({ showLoading = true, allowExchangeRetry = true } = {}) {
    if (showLoading) showScreen('loadingScreen');

    try {
      if (!await ensureScienceSession()) {
        showSignInRequired();
        return;
      }

      const rows = await rpc('science_student_catalog', { p_token: state.token });
      state.catalog = Array.isArray(rows) ? rows : [];
      renderCatalog();
      showScreen('homeScreen');
    } catch (error) {
      if (allowExchangeRetry && scienceAccessExpired(error) && readMathSession()) {
        try {
          await ensureScienceSession({ force: true });
          return loadCatalog({ showLoading: false, allowExchangeRetry: false });
        } catch {}
      }

      if (error?.status === 401 || scienceAccessExpired(error)) {
        showSignInRequired('Your Learning Hub session needs to be refreshed. Please sign in again.');
        return;
      }

      setText('errorMessage', 'Science could not be opened right now. Please try again.');
      showScreen('errorScreen');
    }
  }

  function renderCatalog() {
    const grid = $('lessonGrid');
    clearChildren(grid);

    const year = state.catalog[0]?.year_level || state.student?.year_level;
    const studentName = state.student?.student_name;
    setText('homeTitle', year ? `Year ${year} Science` : 'Your Science lessons');
    setText('homeSubtitle', state.catalog.length
      ? `${studentName ? `Welcome, ${studentName}. ` : ''}Choose a reviewed lesson and work through the resources in order.`
      : `${studentName ? `${studentName}, ` : ''}no lessons have been published for your year yet.`);

    if (!state.catalog.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-card';
      empty.textContent = 'No published Science lessons are available yet.';
      grid.appendChild(empty);
      return;
    }

    state.catalog.forEach((lesson) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lesson-tile';
      button.addEventListener('click', () => openLesson(lesson.lesson_id));

      const top = document.createElement('div');
      top.className = 'tile-top';

      const chip = document.createElement('span');
      chip.className = 'topic-chip';
      chip.textContent = lesson.topic_title || lesson.theme || 'Science';
      top.appendChild(chip);

      if (lesson.is_featured) {
        const featured = document.createElement('span');
        featured.className = 'featured';
        featured.textContent = '★ Featured';
        top.appendChild(featured);
      }

      const title = document.createElement('h3');
      title.textContent = lesson.lesson_title || 'Science lesson';

      const summary = document.createElement('p');
      summary.textContent = lesson.summary || 'Open this lesson to view the learning resources.';

      const foot = document.createElement('div');
      foot.className = 'tile-foot';
      const theme = document.createElement('span');
      theme.textContent = lesson.theme || 'Science';
      const duration = document.createElement('span');
      duration.textContent = lesson.estimated_minutes ? `${lesson.estimated_minutes} min` : 'Self-paced';
      foot.append(theme, duration);

      button.append(top, title, summary, foot);
      grid.appendChild(button);
    });
  }

  function addListItems(target, values) {
    clearChildren(target);
    const list = Array.isArray(values) ? values : [];
    list.forEach((value) => {
      const li = document.createElement('li');
      li.textContent = String(value);
      target.appendChild(li);
    });
    if (!list.length) {
      const li = document.createElement('li');
      li.textContent = 'Your teacher will add this soon.';
      target.appendChild(li);
    }
  }

  function iconForType(type) {
    return ({
      note: '📘',
      worksheet: '📝',
      activity: '🧠',
      experiment: '🧪',
      video: '🎬',
      infographic: '🖼️',
      external_link: '🔗',
      quiz: '✅'
    })[type] || '🔬';
  }

  function safeHttpsUrl(value) {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : null;
    } catch {
      return null;
    }
  }

  function renderResources(resources) {
    const container = $('resourceList');
    clearChildren(container);

    if (!Array.isArray(resources) || !resources.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-card';
      empty.textContent = 'No student-ready resources are attached yet.';
      container.appendChild(empty);
      return;
    }

    resources.forEach((resource) => {
      const card = document.createElement('section');
      card.className = 'resource-card';

      const head = document.createElement('div');
      head.className = 'resource-head';

      const type = document.createElement('span');
      type.className = 'resource-type';
      type.textContent = `${iconForType(resource.resource_type)} ${String(resource.resource_type || 'resource').replace('_', ' ')}`;
      head.appendChild(type);

      const stageValue = resource?.metadata?.stage;
      if (stageValue) {
        const stage = document.createElement('span');
        stage.className = 'resource-stage';
        stage.textContent = String(stageValue);
        head.appendChild(stage);
      }

      const title = document.createElement('h4');
      title.textContent = resource.title || 'Science resource';
      card.append(head, title);

      if (resource.description) {
        const description = document.createElement('p');
        description.textContent = resource.description;
        card.appendChild(description);
      }

      if (resource.body_text) {
        const body = document.createElement('div');
        body.className = 'resource-body';
        body.textContent = resource.body_text;
        card.appendChild(body);
      }

      const safeUrl = safeHttpsUrl(resource.resource_url);
      if (safeUrl) {
        const link = document.createElement('a');
        link.className = 'resource-link';
        link.href = safeUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open resource';
        card.appendChild(link);
      }

      container.appendChild(card);
    });
  }

  async function openLesson(lessonId, allowExchangeRetry = true) {
    if (!lessonId) return;
    state.currentLessonId = lessonId;
    showScreen('loadingScreen');

    try {
      if (!await ensureScienceSession()) {
        showSignInRequired();
        return;
      }

      let payload = await rpc('science_student_lesson', {
        p_token: state.token,
        p_lesson_id: lessonId
      });

      if (Array.isArray(payload) && payload.length === 1) payload = payload[0];
      if (payload?.science_student_lesson) payload = payload.science_student_lesson;

      const topic = payload?.topic || {};
      const lesson = payload?.lesson || {};

      clearChildren($('lessonMeta'));
      [
        topic.year_level ? `Year ${topic.year_level}` : '',
        topic.theme || '',
        lesson.estimated_minutes ? `${lesson.estimated_minutes} min` : ''
      ].filter(Boolean).forEach((value) => {
        const pill = document.createElement('span');
        pill.className = 'meta-pill';
        pill.textContent = value;
        $('lessonMeta').appendChild(pill);
      });

      setText('lessonTitle', lesson.title || 'Science lesson');
      setText('lessonSummary', lesson.summary || '');
      addListItems($('objectivesList'), lesson.learning_objectives);
      addListItems($('criteriaList'), lesson.success_criteria);
      renderResources(payload?.resources || []);
      showScreen('lessonScreen');
    } catch (error) {
      if (allowExchangeRetry && scienceAccessExpired(error) && readMathSession()) {
        try {
          await ensureScienceSession({ force: true });
          return openLesson(lessonId, false);
        } catch {}
      }

      setText('errorMessage', String(error?.message || '').includes('science_lesson_not_available')
        ? 'This lesson is not currently available to students.'
        : 'The lesson could not be loaded. Please try again.');
      showScreen('errorScreen');
    }
  }

  $('studentSignInBtn')?.addEventListener('click', () => {
    window.location.href = '../';
  });
  $('refreshBtn')?.addEventListener('click', () => loadCatalog());
  $('backBtn')?.addEventListener('click', () => showScreen('homeScreen'));
  $('errorBackBtn')?.addEventListener('click', () => state.token ? showScreen('homeScreen') : showScreen('accessScreen'));
  $('forgetAccessBtn')?.addEventListener('click', async () => {
    clearScienceSession();
    await loadCatalog();
  });

  applySavedScienceSession();
  loadCatalog();
})();
