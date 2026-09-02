(() => {
  'use strict';

  const config = window.SCIENCE_CONFIG;
  if (!config?.supabaseUrl || !config?.supabasePublishableKey) {
    throw new Error('Science configuration is missing.');
  }

  const STORAGE_KEY = 'scienceDevAccessV01';
  const state = {
    token: '',
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

  async function rpc(functionName, args) {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: config.supabasePublishableKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    });

    if (!response.ok) {
      let message = 'Unable to load Science right now.';
      try {
        const payload = await response.json();
        if (payload?.message) message = payload.message;
      } catch {}
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) return null;
    return response.json();
  }

  function saveToken(token) {
    state.token = token;
    sessionStorage.setItem(STORAGE_KEY, token);
  }

  function clearToken() {
    state.token = '';
    state.catalog = [];
    state.currentLessonId = null;
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function errorForAccess(error) {
    const text = String(error?.message || '').toLowerCase();
    if (text.includes('invalid_science_access')) {
      return 'That Science access code is invalid or has expired.';
    }
    return 'Science could not be opened. Please try again.';
  }

  async function loadCatalog({ showLoading = true } = {}) {
    if (!state.token) {
      showScreen('accessScreen');
      return;
    }

    if (showLoading) showScreen('loadingScreen');

    try {
      const rows = await rpc('science_student_catalog', { p_token: state.token });
      state.catalog = Array.isArray(rows) ? rows : [];
      renderCatalog();
      showScreen('homeScreen');
    } catch (error) {
      clearToken();
      showScreen('accessScreen');
      setText('accessMessage', errorForAccess(error));
    }
  }

  function renderCatalog() {
    const grid = $('lessonGrid');
    clearChildren(grid);

    const year = state.catalog[0]?.year_level;
    setText('homeTitle', year ? `Year ${year} Science` : 'Your Science lessons');
    setText('homeSubtitle', state.catalog.length
      ? 'Choose a reviewed lesson and work through the resources in order.'
      : 'No lessons have been published for this access yet.');

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

  async function openLesson(lessonId) {
    if (!lessonId) return;
    state.currentLessonId = lessonId;
    showScreen('loadingScreen');

    try {
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
      setText('errorMessage', String(error?.message || '').includes('science_lesson_not_available')
        ? 'This lesson is not currently available to students.'
        : 'The lesson could not be loaded. Please try again.');
      showScreen('errorScreen');
    }
  }

  $('accessForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setText('accessMessage', '');
    const token = $('accessToken').value.trim();
    if (!token) return;
    saveToken(token);
    $('accessToken').value = '';
    await loadCatalog();
  });

  $('refreshBtn')?.addEventListener('click', () => loadCatalog());
  $('backBtn')?.addEventListener('click', () => showScreen('homeScreen'));
  $('errorBackBtn')?.addEventListener('click', () => state.token ? showScreen('homeScreen') : showScreen('accessScreen'));
  $('forgetAccessBtn')?.addEventListener('click', () => {
    clearToken();
    setText('accessMessage', '');
    showScreen('accessScreen');
  });

  const saved = sessionStorage.getItem(STORAGE_KEY);
  if (saved) {
    state.token = saved;
    loadCatalog();
  } else {
    showScreen('accessScreen');
  }
})();
