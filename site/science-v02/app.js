(() => {
  'use strict';

  const cfg = window.SCIENCE_V02_CONFIG || {};
  const SESSION_KEY = cfg.sessionKey || 'scienceV02StudentSession';
  const API_ROOT = `${String(cfg.supabaseUrl || '').replace(/\/$/,'')}/rest/v1/rpc`;
  const API_KEY = String(cfg.supabasePublishableKey || '');
  const REQUEST_TIMEOUT_MS = 12000;

  const $ = id => document.getElementById(id);
  const loginView = $('login-view');
  const homeView = $('home-view');
  const catalogView = $('catalog-view');
  const lessonView = $('lesson-view');
  const lessonList = $('lesson-list');
  const lessonContent = $('lesson-content');
  const loginForm = $('login-form');
  const loginButton = $('login-button');
  const loginStatus = $('login-status');
  const catalogStatus = $('catalog-status');

  let currentSession = null;

  function setLoginStatus(message, kind = '') {
    loginStatus.textContent = message || '';
    loginStatus.className = `status${kind ? ` ${kind}` : ''}`;
  }

  function normalizeRpcData(value) {
    let current = value;
    for (let i = 0; i < 3; i += 1) {
      if (typeof current === 'string') {
        try { current = JSON.parse(current); }
        catch { break; }
        continue;
      }
      if (Array.isArray(current) && current.length === 1 && typeof current[0] === 'object') {
        current = current[0];
        continue;
      }
      break;
    }
    return current;
  }

  async function rpc(name, args, timeoutMs = REQUEST_TIMEOUT_MS) {
    if (!API_ROOT.startsWith('https://') || !API_KEY) {
      throw new Error('Science preview is not configured.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${API_ROOT}/${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: {
          apikey: API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(args || {}),
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal
      });
      const text = await response.text();
      const data = normalizeRpcData(text ? JSON.parse(text) : null);
      if (!response.ok) {
        throw new Error(data?.message || data?.details || `Science request failed (${response.status}).`);
      }
      return data;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Science took too long to respond. Please try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function readStoredSession() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      if (!parsed?.token || !parsed?.student || Number(parsed?.expiresAt || 0) <= Date.now() + 15000) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function saveSession(payload) {
    const expiresAt = Date.parse(payload?.expires_at || '');
    const session = {
      token: String(payload?.access_token || ''),
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0,
      student: payload?.student || null
    };
    if (!session.token || !session.student?.student_id || session.expiresAt <= Date.now()) {
      throw new Error('Science sign in did not return a valid session.');
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    currentSession = session;
    return session;
  }

  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    currentSession = null;
  }

  function showLogin() {
    loginView.classList.remove('hidden');
    homeView.classList.add('hidden');
    catalogView.classList.remove('hidden');
    lessonView.classList.add('hidden');
    lessonList.replaceChildren();
    lessonContent.replaceChildren();
    $('student-pin').value = '';
    loginButton.disabled = false;
  }

  function showHome(session) {
    loginView.classList.add('hidden');
    homeView.classList.remove('hidden');
    catalogView.classList.remove('hidden');
    lessonView.classList.add('hidden');
    $('student-name').textContent = session.student.student_name || 'Student';
    $('student-meta').textContent = `Year ${Number(session.student.year_level || 4)} · ${session.student.class_name || 'Class'} · ${session.student.student_id}`;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function appendList(parent, values) {
    const list = element('ul');
    (Array.isArray(values) ? values : []).forEach(value => list.appendChild(element('li', '', value)));
    parent.appendChild(list);
  }

  function renderCatalog(rows) {
    lessonList.replaceChildren();
    const lessons = Array.isArray(rows)
      ? rows
      : (rows && typeof rows === 'object' ? [rows] : []);
    catalogStatus.textContent = lessons.length === 1 ? '1 published lesson' : `${lessons.length} published lessons`;

    if (!lessons.length) {
      lessonList.appendChild(element('div', 'empty', 'No Science lessons are published for your year level yet.'));
      return;
    }

    lessons.forEach(row => {
      const button = element('button', 'lesson-card');
      button.type = 'button';
      button.appendChild(element('span', 'theme', row.theme || row.topic_title || 'Science'));
      button.appendChild(element('h3', '', row.lesson_title || 'Lesson'));
      button.appendChild(element('p', '', row.summary || 'Open this Science lesson.'));
      button.appendChild(element('div', 'meta', `${Number(row.estimated_minutes || 0)} min${row.is_featured ? ' · Featured' : ''}`));
      button.addEventListener('click', () => openLesson(row.lesson_id));
      lessonList.appendChild(button);
    });
  }

  async function loadCatalog() {
    catalogStatus.textContent = 'Loading lessons…';
    try {
      const rows = await rpc('science_student_catalog', { p_token: currentSession.token });
      renderCatalog(rows);
    } catch (error) {
      catalogStatus.textContent = '';
      lessonList.replaceChildren(element('div', 'empty', error?.message || 'Lessons could not be loaded.'));
    }
  }

  function renderLesson(payload) {
    lessonContent.replaceChildren();
    const lesson = payload?.lesson || {};
    const topic = payload?.topic || {};
    const resources = Array.isArray(payload?.resources) ? payload.resources : [];

    const hero = element('section', 'lesson-hero');
    hero.appendChild(element('div', 'eyebrow', `${topic.theme || 'SCIENCE'} · YEAR ${Number(topic.year_level || currentSession?.student?.year_level || 4)}`));
    hero.appendChild(element('h2', '', lesson.title || 'Science lesson'));
    hero.appendChild(element('p', 'muted', lesson.summary || ''));
    lessonContent.appendChild(hero);

    if (Array.isArray(lesson.learning_objectives) && lesson.learning_objectives.length) {
      const section = element('section', 'lesson-section');
      section.appendChild(element('h3', '', 'Learning objectives'));
      appendList(section, lesson.learning_objectives);
      lessonContent.appendChild(section);
    }

    if (Array.isArray(lesson.success_criteria) && lesson.success_criteria.length) {
      const section = element('section', 'lesson-section');
      section.appendChild(element('h3', '', 'Success criteria'));
      appendList(section, lesson.success_criteria);
      lessonContent.appendChild(section);
    }

    const resourcesSection = element('section', 'resource-list');
    resources.forEach(resource => {
      const card = element('article', 'resource-card');
      const stage = String(resource?.metadata?.stage || resource.resource_type || 'resource');
      card.appendChild(element('div', 'resource-type', stage));
      card.appendChild(element('h3', '', resource.title || 'Resource'));
      if (resource.description) card.appendChild(element('p', 'muted', resource.description));
      if (resource.body_text) card.appendChild(element('p', '', resource.body_text));
      if (/^https:\/\//i.test(String(resource.resource_url || ''))) {
        const link = element('a', '', 'Open resource ↗');
        link.href = resource.resource_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        card.appendChild(link);
      }
      resourcesSection.appendChild(card);
    });
    if (!resources.length) resourcesSection.appendChild(element('div', 'empty', 'No resources are published for this lesson yet.'));
    lessonContent.appendChild(resourcesSection);
  }

  async function openLesson(lessonId) {
    if (!lessonId || !currentSession) return;
    catalogView.classList.add('hidden');
    lessonView.classList.remove('hidden');
    lessonContent.replaceChildren(element('div', 'empty', 'Loading lesson…'));
    try {
      const payload = await rpc('science_student_lesson', {
        p_token: currentSession.token,
        p_lesson_id: lessonId
      });
      renderLesson(payload || {});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      lessonContent.replaceChildren(element('div', 'empty', error?.message || 'Lesson could not be opened.'));
    }
  }

  async function signIn(event) {
    event.preventDefault();
    const studentId = $('student-id').value.trim();
    const pin = $('student-pin').value;

    if (!studentId) {
      setLoginStatus('Enter your Student ID.', 'error');
      return;
    }
    if (!/^[0-9]{4,8}$/.test(pin)) {
      setLoginStatus('Enter your 4–8 digit PIN.', 'error');
      return;
    }

    loginButton.disabled = true;
    setLoginStatus('Checking your Science access…');
    try {
      const payload = await rpc('science_v02_sign_in', {
        p_student_id: studentId,
        p_pin: pin
      });
      if (payload?.allowed !== true) {
        throw new Error(payload?.code === 'try_later'
          ? 'Too many attempts. Please wait a few minutes and try again.'
          : 'Student ID or PIN is incorrect.');
      }
      const session = saveSession(payload);
      $('student-pin').value = '';
      setLoginStatus('');
      showHome(session);
      await loadCatalog();
    } catch (error) {
      setLoginStatus(error?.message || 'Science sign in could not be completed.', 'error');
    } finally {
      loginButton.disabled = false;
    }
  }

  async function logOut() {
    const token = currentSession?.token;
    clearSession();
    showLogin();
    setLoginStatus('Signed out.', 'ok');
    if (token) {
      try { await rpc('science_v02_sign_out', { p_token: token }, 5000); } catch {}
    }
  }

  async function restore() {
    const stored = readStoredSession();
    if (!stored) {
      showLogin();
      setLoginStatus('Science sign in is ready.');
      return;
    }

    currentSession = stored;
    try {
      const check = await rpc('science_v02_session', { p_token: stored.token }, 8000);
      if (check?.allowed !== true) throw new Error('Session expired.');
      currentSession = {
        ...stored,
        expiresAt: Date.parse(check.expires_at || '') || stored.expiresAt,
        student: check.student || stored.student
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
      showHome(currentSession);
      await loadCatalog();
    } catch {
      clearSession();
      showLogin();
      setLoginStatus('Your previous Science session has expired. Please sign in again.');
    }
  }

  loginForm.addEventListener('submit', signIn);
  $('logout-button').addEventListener('click', logOut);
  $('back-button').addEventListener('click', () => {
    lessonView.classList.add('hidden');
    catalogView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  restore();
})();
