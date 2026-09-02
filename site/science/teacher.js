(() => {
  'use strict';

  const config = window.SCIENCE_CONFIG;
  if (!config?.supabaseUrl || !config?.supabasePublishableKey) {
    throw new Error('Science configuration is missing.');
  }

  const SESSION_KEY = 'scienceTeacherSessionV01';
  const state = {
    session: null,
    profile: null,
    overview: [],
    topics: [],
    selectedLessonId: null,
    resources: []
  };

  const $ = (id) => document.getElementById(id);
  const qsa = (selector) => [...document.querySelectorAll(selector)];

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value ?? '';
  }

  function show(id) {
    ['authScreen', 'dashboardScreen', 'blockedScreen', 'loadingScreen'].forEach((screenId) => {
      $(screenId)?.classList.toggle('active', screenId === id);
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function message(id, text, kind = '') {
    const el = $(id);
    if (!el) return;
    el.textContent = text || '';
    el.className = `teacher-message ${kind}`.trim();
  }

  function escapeFilter(value) {
    return encodeURIComponent(String(value));
  }

  async function parseResponse(response) {
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
  }

  function errorMessage(payload, fallback = 'Something went wrong.') {
    if (!payload) return fallback;
    if (typeof payload === 'string') return payload;
    return payload.message || payload.error_description || payload.error || fallback;
  }

  function authHeaders(extra = {}) {
    const headers = {
      apikey: config.supabasePublishableKey,
      'Content-Type': 'application/json',
      ...extra
    };
    if (state.session?.access_token) {
      headers.Authorization = `Bearer ${state.session.access_token}`;
    }
    return headers;
  }

  async function authRequest(path, { method = 'POST', body, token = false } = {}) {
    const response = await fetch(`${config.supabaseUrl}/auth/v1${path}`, {
      method,
      headers: token ? authHeaders() : {
        apikey: config.supabasePublishableKey,
        'Content-Type': 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const payload = await parseResponse(response);
    if (!response.ok) throw new Error(errorMessage(payload, 'Authentication failed.'));
    return payload;
  }

  async function rest(path, { method = 'GET', body, prefer } = {}) {
    const headers = authHeaders(prefer ? { Prefer: prefer } : {});
    const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const payload = await parseResponse(response);
    if (!response.ok) {
      const err = new Error(errorMessage(payload, 'Science request failed.'));
      err.status = response.status;
      throw err;
    }
    return payload;
  }

  async function rpc(name, args = {}) {
    return rest(`rpc/${name}`, { method: 'POST', body: args });
  }

  function saveSession(session) {
    state.session = session;
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  }

  async function refreshSession() {
    if (!state.session?.refresh_token) return false;
    try {
      const next = await authRequest('/token?grant_type=refresh_token', {
        body: { refresh_token: state.session.refresh_token }
      });
      saveSession(next);
      return true;
    } catch {
      saveSession(null);
      return false;
    }
  }

  async function getCurrentUser() {
    try {
      return await authRequest('/user', { method: 'GET', token: true });
    } catch (error) {
      if (error?.message && await refreshSession()) {
        return authRequest('/user', { method: 'GET', token: true });
      }
      throw error;
    }
  }

  async function signIn(email, password) {
    const payload = await authRequest('/token?grant_type=password', {
      body: { email, password }
    });
    saveSession(payload);
    return payload;
  }

  async function signUp(email, password) {
    return authRequest('/signup', { body: { email, password } });
  }

  async function signOut() {
    try {
      if (state.session?.access_token) {
        await authRequest('/logout', { token: true });
      }
    } catch {}
    saveSession(null);
    state.profile = null;
    state.overview = [];
    state.topics = [];
    state.selectedLessonId = null;
    state.resources = [];
    show('authScreen');
  }

  async function loadProfile() {
    const user = await getCurrentUser();
    const rows = await rest(`science_teacher_profiles?select=user_id,display_name,active&user_id=eq.${escapeFilter(user.id)}`);
    const profile = Array.isArray(rows) ? rows[0] : null;
    if (!profile?.active) {
      state.profile = null;
      setText('blockedEmailHint', user.email || 'this account');
      show('blockedScreen');
      return false;
    }
    state.profile = profile;
    setText('teacherName', profile.display_name || 'Teacher');
    return true;
  }

  async function loadDashboard() {
    show('loadingScreen');
    try {
      if (!await loadProfile()) return;
      const [overview, topics] = await Promise.all([
        rpc('science_teacher_lesson_overview'),
        rest('science_topics?select=id,year_level,theme,title,slug,description,sort_order,archived&order=year_level.asc,sort_order.asc,title.asc')
      ]);
      state.overview = Array.isArray(overview) ? overview : [];
      state.topics = Array.isArray(topics) ? topics : [];
      renderDashboard();
      show('dashboardScreen');
    } catch (error) {
      if (error.status === 401 || /jwt|token/i.test(error.message)) {
        if (await refreshSession()) return loadDashboard();
        return signOut();
      }
      message('dashboardMessage', error.message, 'error');
      show('dashboardScreen');
    }
  }

  function renderDashboard() {
    setText('lessonCount', state.overview.length);
    setText('publishedCount', state.overview.filter((row) => row.is_available).length);
    setText('reviewedCount', state.overview.filter((row) => row.review_status === 'reviewed').length);
    renderTopicOptions();
    renderLessonOptions();
    renderOverview();
  }

  function renderTopicOptions() {
    const select = $('lessonTopicId');
    if (!select) return;
    select.replaceChildren();
    const placeholder = new Option('Choose a topic', '');
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    state.topics.filter((topic) => !topic.archived).forEach((topic) => {
      select.appendChild(new Option(`Year ${topic.year_level} · ${topic.title}`, topic.id));
    });
  }

  function renderLessonOptions() {
    const select = $('resourceLessonId');
    if (!select) return;
    select.replaceChildren();
    const placeholder = new Option('Choose a lesson', '');
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    state.overview.filter((row) => !row.lesson_archived).forEach((row) => {
      select.appendChild(new Option(`Year ${row.year_level} · ${row.lesson_title}`, row.lesson_id));
    });
  }

  function statusBadge(row) {
    if (row.is_available) return ['Published', 'published'];
    if (row.review_status === 'reviewed') return ['Ready to publish', 'ready'];
    if (row.review_status === 'needs_review') return ['Needs review', 'review'];
    return ['Draft', 'draft'];
  }

  function renderOverview() {
    const container = $('lessonOverview');
    container.replaceChildren();
    if (!state.overview.length) {
      const empty = document.createElement('div');
      empty.className = 'teacher-empty';
      empty.textContent = 'No Science lessons yet. Create a topic and your first lesson above.';
      container.appendChild(empty);
      return;
    }

    state.overview.forEach((row) => {
      const card = document.createElement('article');
      card.className = 'admin-lesson';

      const head = document.createElement('div');
      head.className = 'admin-lesson-head';
      const titleWrap = document.createElement('div');
      const meta = document.createElement('div');
      meta.className = 'admin-meta';
      meta.textContent = `Year ${row.year_level} · ${row.topic_title}${row.theme ? ` · ${row.theme}` : ''}`;
      const title = document.createElement('h3');
      title.textContent = row.lesson_title;
      titleWrap.append(meta, title);

      const [statusText, statusClass] = statusBadge(row);
      const badge = document.createElement('span');
      badge.className = `admin-status ${statusClass}`;
      badge.textContent = statusText;
      head.append(titleWrap, badge);

      const facts = document.createElement('div');
      facts.className = 'admin-facts';
      const resourcesFact = document.createElement('span');
      resourcesFact.textContent = `${row.ready_resource_count}/${row.resource_count} resources ready`;
      const reviewFact = document.createElement('span');
      reviewFact.textContent = String(row.review_status || '').replace('_', ' ');
      facts.append(resourcesFact, reviewFact);
      if (row.is_featured) {
        const featuredFact = document.createElement('span');
        featuredFact.textContent = '★ Featured';
        facts.appendChild(featuredFact);
      }

      const actions = document.createElement('div');
      actions.className = 'admin-actions';
      actions.append(
        actionButton('Edit resources', 'ghost', () => openLessonEditor(row.lesson_id)),
        actionButton(row.review_status === 'reviewed' ? 'Return to draft' : 'Mark reviewed', 'ghost', () => toggleReview(row)),
        actionButton(row.is_available ? 'Unpublish' : 'Publish', row.is_available ? 'danger-button' : 'primary', () => togglePublication(row))
      );

      card.append(head, facts, actions);
      container.appendChild(card);
    });
  }

  function actionButton(label, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  }

  async function toggleReview(row) {
    const next = row.review_status === 'reviewed' ? 'draft' : 'reviewed';
    if (row.is_available && next !== 'reviewed') {
      message('dashboardMessage', 'Unpublish this lesson before returning it to draft.', 'error');
      return;
    }
    try {
      await rest(`science_lessons?id=eq.${escapeFilter(row.lesson_id)}`, {
        method: 'PATCH',
        body: { review_status: next, updated_at: new Date().toISOString() },
        prefer: 'return=minimal'
      });
      message('dashboardMessage', next === 'reviewed' ? 'Lesson marked reviewed.' : 'Lesson returned to draft.', 'success');
      await loadDashboard();
    } catch (error) {
      message('dashboardMessage', error.message, 'error');
    }
  }

  function publicationError(error) {
    const text = String(error?.message || '');
    if (text.includes('science_lesson_must_be_reviewed')) return 'Mark the lesson as reviewed before publishing.';
    if (text.includes('science_lesson_needs_student_ready_resource')) return 'At least one non-archived resource must be marked student-ready.';
    if (text.includes('science_archived_content_cannot_publish')) return 'Archived content cannot be published.';
    return text || 'Unable to change publication status.';
  }

  async function togglePublication(row) {
    try {
      await rpc('science_teacher_set_publication', {
        p_lesson_id: row.lesson_id,
        p_is_available: !row.is_available,
        p_is_featured: !row.is_available && $('featureOnPublish')?.checked === true,
        p_opens_at: null,
        p_closes_at: null
      });
      message('dashboardMessage', row.is_available ? 'Lesson unpublished.' : 'Lesson published for students.', 'success');
      await loadDashboard();
    } catch (error) {
      message('dashboardMessage', publicationError(error), 'error');
    }
  }

  function linesToArray(value) {
    return String(value || '').split('\n').map((line) => line.trim()).filter(Boolean);
  }

  function slugify(value) {
    return String(value || '')
      .trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 180);
  }

  async function createTopic(event) {
    event.preventDefault();
    message('createMessage', '');
    const title = $('topicTitle').value.trim();
    const payload = {
      year_level: Number($('topicYear').value),
      theme: $('topicTheme').value.trim(),
      title,
      slug: slugify(title),
      description: $('topicDescription').value.trim(),
      sort_order: Number($('topicSort').value || 0)
    };
    try {
      await rest('science_topics', { method: 'POST', body: payload, prefer: 'return=minimal' });
      event.target.reset();
      $('topicYear').value = '4';
      $('topicSort').value = '0';
      message('createMessage', 'Topic created.', 'success');
      await loadDashboard();
    } catch (error) {
      message('createMessage', error.message, 'error');
    }
  }

  async function createLesson(event) {
    event.preventDefault();
    message('createMessage', '');
    const payload = {
      topic_id: $('lessonTopicId').value,
      title: $('lessonTitleInput').value.trim(),
      summary: $('lessonSummaryInput').value.trim(),
      learning_objectives: linesToArray($('lessonObjectives').value),
      success_criteria: linesToArray($('lessonCriteria').value),
      estimated_minutes: $('lessonMinutes').value ? Number($('lessonMinutes').value) : null,
      review_status: 'draft'
    };
    try {
      await rest('science_lessons', { method: 'POST', body: payload, prefer: 'return=minimal' });
      event.target.reset();
      message('createMessage', 'Lesson created as a draft.', 'success');
      await loadDashboard();
    } catch (error) {
      message('createMessage', error.message, 'error');
    }
  }

  async function createResource(event) {
    event.preventDefault();
    message('createMessage', '');
    const bodyText = $('resourceBody').value.trim();
    const url = $('resourceUrl').value.trim();
    if (!bodyText && !url && $('resourceType').value !== 'quiz') {
      message('createMessage', 'Add either resource text or an HTTPS resource link.', 'error');
      return;
    }
    const payload = {
      lesson_id: $('resourceLessonId').value,
      resource_type: $('resourceType').value,
      title: $('resourceTitle').value.trim(),
      description: $('resourceDescription').value.trim(),
      body_text: bodyText,
      resource_url: url,
      sort_order: Number($('resourceSort').value || 0),
      student_ready: $('resourceReady').checked,
      metadata: $('resourceStage').value ? { stage: $('resourceStage').value } : {}
    };
    try {
      await rest('science_resources', { method: 'POST', body: payload, prefer: 'return=minimal' });
      event.target.reset();
      $('resourceSort').value = '0';
      message('createMessage', 'Resource added.', 'success');
      await loadDashboard();
      if (state.selectedLessonId === payload.lesson_id) await openLessonEditor(payload.lesson_id);
    } catch (error) {
      message('createMessage', error.message, 'error');
    }
  }

  async function openLessonEditor(lessonId) {
    state.selectedLessonId = lessonId;
    const row = state.overview.find((item) => item.lesson_id === lessonId);
    if (!row) return;
    try {
      const [lessons, resources] = await Promise.all([
        rest(`science_lessons?select=id,title,summary,learning_objectives,success_criteria,estimated_minutes,review_status,archived&id=eq.${escapeFilter(lessonId)}`),
        rest(`science_resources?select=id,resource_type,title,description,body_text,resource_url,sort_order,student_ready,archived,metadata&lesson_id=eq.${escapeFilter(lessonId)}&order=sort_order.asc,created_at.asc`)
      ]);
      const lesson = lessons?.[0];
      if (!lesson) return;
      state.resources = resources || [];
      setText('editorHeading', `Edit: ${lesson.title}`);
      $('editLessonTitle').value = lesson.title || '';
      $('editLessonSummary').value = lesson.summary || '';
      $('editLessonObjectives').value = (lesson.learning_objectives || []).join('\n');
      $('editLessonCriteria').value = (lesson.success_criteria || []).join('\n');
      $('editLessonMinutes').value = lesson.estimated_minutes || '';
      renderResources();
      $('lessonEditor').classList.remove('hidden');
      $('lessonEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      message('dashboardMessage', error.message, 'error');
    }
  }

  async function saveLesson(event) {
    event.preventDefault();
    if (!state.selectedLessonId) return;
    try {
      await rest(`science_lessons?id=eq.${escapeFilter(state.selectedLessonId)}`, {
        method: 'PATCH',
        body: {
          title: $('editLessonTitle').value.trim(),
          summary: $('editLessonSummary').value.trim(),
          learning_objectives: linesToArray($('editLessonObjectives').value),
          success_criteria: linesToArray($('editLessonCriteria').value),
          estimated_minutes: $('editLessonMinutes').value ? Number($('editLessonMinutes').value) : null,
          updated_at: new Date().toISOString()
        },
        prefer: 'return=minimal'
      });
      message('editorMessage', 'Lesson saved.', 'success');
      await loadDashboard();
    } catch (error) {
      message('editorMessage', error.message, 'error');
    }
  }

  function renderResources() {
    const container = $('editorResources');
    container.replaceChildren();
    if (!state.resources.length) {
      const empty = document.createElement('div');
      empty.className = 'teacher-empty';
      empty.textContent = 'No resources attached to this lesson yet.';
      container.appendChild(empty);
      return;
    }
    state.resources.forEach((resource) => {
      const row = document.createElement('div');
      row.className = `resource-admin-row${resource.archived ? ' archived' : ''}`;
      const info = document.createElement('div');
      const meta = document.createElement('div');
      meta.className = 'admin-meta';
      meta.textContent = `${resource.resource_type.replace('_', ' ')} · order ${resource.sort_order}`;
      const title = document.createElement('strong');
      title.textContent = resource.title;
      const status = document.createElement('span');
      status.className = `resource-ready ${resource.student_ready && !resource.archived ? 'yes' : 'no'}`;
      status.textContent = resource.archived ? 'Archived' : resource.student_ready ? 'Student-ready' : 'Not ready';
      info.append(meta, title, status);

      const actions = document.createElement('div');
      actions.className = 'admin-actions compact';
      if (!resource.archived) {
        actions.append(actionButton(resource.student_ready ? 'Mark not ready' : 'Mark ready', 'ghost', () => setResourceReady(resource, !resource.student_ready)));
        actions.append(actionButton('Archive', 'danger-button', () => archiveResource(resource)));
      }
      row.append(info, actions);
      container.appendChild(row);
    });
  }

  async function setResourceReady(resource, ready) {
    try {
      await rest(`science_resources?id=eq.${escapeFilter(resource.id)}`, {
        method: 'PATCH',
        body: { student_ready: ready, updated_at: new Date().toISOString() },
        prefer: 'return=minimal'
      });
      await openLessonEditor(state.selectedLessonId);
      await loadDashboard();
    } catch (error) {
      message('editorMessage', error.message, 'error');
    }
  }

  async function archiveResource(resource) {
    if (!confirm(`Archive “${resource.title}”?`)) return;
    try {
      await rest(`science_resources?id=eq.${escapeFilter(resource.id)}`, {
        method: 'PATCH',
        body: { archived: true, student_ready: false, updated_at: new Date().toISOString() },
        prefer: 'return=minimal'
      });
      await openLessonEditor(state.selectedLessonId);
      await loadDashboard();
    } catch (error) {
      message('editorMessage', error.message, 'error');
    }
  }

  $('signInForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    message('authMessage', 'Signing in…');
    try {
      await signIn($('signInEmail').value.trim(), $('signInPassword').value);
      message('authMessage', '');
      await loadDashboard();
    } catch (error) {
      message('authMessage', error.message, 'error');
    }
  });

  $('registerForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = $('registerEmail').value.trim();
    const password = $('registerPassword').value;
    if (password.length < 8) {
      message('authMessage', 'Use a password with at least 8 characters.', 'error');
      return;
    }
    message('authMessage', 'Creating development teacher account…');
    try {
      const payload = await signUp(email, password);
      if (payload?.access_token) {
        saveSession(payload);
        await loadDashboard();
      } else {
        message('authMessage', 'Account created. Check your email to confirm it, then sign in.', 'success');
      }
    } catch (error) {
      message('authMessage', error.message, 'error');
    }
  });

  qsa('[data-auth-tab]').forEach((button) => button.addEventListener('click', () => {
    const tab = button.dataset.authTab;
    qsa('[data-auth-tab]').forEach((item) => item.classList.toggle('active', item === button));
    $('signInPane').classList.toggle('hidden', tab !== 'signin');
    $('registerPane').classList.toggle('hidden', tab !== 'register');
    message('authMessage', '');
  }));

  $('signOutBtn')?.addEventListener('click', signOut);
  $('blockedSignOutBtn')?.addEventListener('click', signOut);
  $('refreshDashboardBtn')?.addEventListener('click', loadDashboard);
  $('topicForm')?.addEventListener('submit', createTopic);
  $('lessonForm')?.addEventListener('submit', createLesson);
  $('resourceForm')?.addEventListener('submit', createResource);
  $('editLessonForm')?.addEventListener('submit', saveLesson);
  $('closeEditorBtn')?.addEventListener('click', () => $('lessonEditor')?.classList.add('hidden'));

  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (saved?.access_token) {
      state.session = saved;
      loadDashboard();
    } else {
      show('authScreen');
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    show('authScreen');
  }
})();
