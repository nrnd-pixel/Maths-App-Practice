const { expect } = require('@playwright/test');

const STUDENT = Object.freeze({
  id: 'E2E-001',
  pin: '4827',
  name: 'E2E Student',
  year: 6,
  className: '6A',
});

const TEACHER = Object.freeze({
  id: 'teacher-e2e-user',
  email: 'teacher.e2e@example.invalid',
  password: 'E2E-password-123!',
});

const QUESTION = Object.freeze({
  id: 'e2e-question-1',
  year_level: 6,
  strand: 'number',
  topic: 'Whole Numbers',
  subtopic: 'Addition',
  skill: 'Add small whole numbers',
  difficulty: 'foundation',
  marks: 1,
  source_type: 'practice',
  source: 'Phase 0 E2E fixture',
  question_number: 'E2E1',
  exam_year: null,
  paper: null,
  question_text: 'What is 3 + 4?',
  answer: '7',
  accepted_answers: ['7'],
  hint: 'Add three and four.',
  explanation: '3 + 4 = 7.',
  image_url: '',
  response_type: 'number',
  response_config: { tolerance: 0 },
  active: true,
});

const RESULT_CODE = 'E2E1-E2E2-E2E3-E2E4';

function corsHeaders(extra = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS,HEAD',
    'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info,prefer,accept-profile,content-profile,range',
    'access-control-expose-headers': 'content-range',
    ...extra,
  };
}

async function fulfillJson(route, body, status = 200, extraHeaders = {}) {
  await route.fulfill({
    status,
    headers: corsHeaders({
      'content-type': 'application/json; charset=utf-8',
      ...extraHeaders,
    }),
    body: JSON.stringify(body),
  });
}

function requestJson(request) {
  try {
    return request.postDataJSON() || {};
  } catch {
    return {};
  }
}

function teacherUser() {
  return {
    id: TEACHER.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: TEACHER.email,
    email_confirmed_at: '2026-01-01T00:00:00.000Z',
    phone: '',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function practiceReviewPayload() {
  return {
    session: {
      id: 'e2e-practice-session-1',
      result_code: RESULT_CODE,
      student_name: STUDENT.name,
      student_id: STUDENT.id,
      year_level: STUDENT.year,
      class_group: STUDENT.className,
      practice_mode: 'mixed',
      strand: 'mixed',
      topic: 'Mixed Practice',
      auto_total: 1,
      first_try_score: 1,
      mastery_score: 1,
      first_try_percent: 100,
      mastery_percent: 100,
      hints_used: 0,
      pending_review_count: 0,
      completed_at: '2026-09-07T03:30:00.000Z',
    },
    summary: {
      pending_count: 0,
      marks_awarded: 1,
      marks_possible: 1,
    },
    answers: [
      {
        id: 'e2e-answer-1',
        question_id: QUESTION.id,
        question_snapshot: QUESTION.question_text,
        response_type: 'number',
        response_payload: {},
        final_answer: '7',
        correct_answer_snapshot: '7',
        correct: true,
        first_try: true,
        attempts: 1,
        hint_used: false,
        review_status: 'auto',
        marks_possible: 1,
        marks_awarded: 1,
      },
    ],
  };
}

async function installSupabaseMock(page) {
  const state = {
    teacherSignedIn: false,
    practiceSubmissions: 0,
    unexpectedWrites: [],
    rpcCalls: [],
  };

  await page.route('**://*.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method().toUpperCase();

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }

    if (path === '/auth/v1/token' && method === 'POST') {
      const body = requestJson(request);
      if (body.email !== TEACHER.email || body.password !== TEACHER.password) {
        await fulfillJson(route, { message: 'Invalid login credentials' }, 400);
        return;
      }

      state.teacherSignedIn = true;
      await fulfillJson(route, {
        access_token: 'e2e-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'e2e-refresh-token',
        user: teacherUser(),
      });
      return;
    }

    if (path === '/auth/v1/user') {
      if (!state.teacherSignedIn) {
        await fulfillJson(route, { message: 'Auth session missing!' }, 401);
        return;
      }
      await fulfillJson(route, teacherUser());
      return;
    }

    if (path === '/auth/v1/logout' && method === 'POST') {
      state.teacherSignedIn = false;
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }

    if (path.startsWith('/rest/v1/rpc/')) {
      const rpc = path.slice('/rest/v1/rpc/'.length);
      const body = requestJson(request);
      state.rpcCalls.push({ rpc, body });

      if (rpc === 'get_student_access_policy') {
        await fulfillJson(route, {
          access_mode: 'student_pin',
          student_id_required: true,
          pin_required: true,
        });
        return;
      }

      if (rpc === 'get_student_class_options') {
        await fulfillJson(route, [
          { year_level: STUDENT.year, class_name: STUDENT.className },
        ], 200, { 'content-range': '0-0/1' });
        return;
      }

      if (rpc === 'validate_student_access') {
        const purpose = body.p_purpose === 'exam' ? 'exam' : 'practice';
        await fulfillJson(route, {
          allowed: true,
          message: 'Access granted',
          access_mode: 'student_pin',
          registered: true,
          roster_student_id: 'e2e-roster-student-1',
          class_id: 'e2e-class-1',
          student_name: STUDENT.name,
          student_id: STUDENT.id,
          year_level: STUDENT.year,
          class_name: STUDENT.className,
          purpose,
          access_token: `${purpose}-ticket-e2e`,
        });
        return;
      }

      if (rpc === 'get_student_practice_questions_v53d3') {
        await fulfillJson(route, [QUESTION], 200, { 'content-range': '0-0/1' });
        return;
      }

      if (rpc === 'submit_practice_session_v3') {
        state.practiceSubmissions += 1;
        await fulfillJson(route, {
          result_code: RESULT_CODE,
          summary: {
            first_try_score: 1,
            mastery_score: 1,
            auto_total: 1,
            pending_review_count: 0,
            first_try_percent: 100,
            mastery_percent: 100,
            hints_used: 0,
            second_try_successes: 0,
          },
        });
        return;
      }

      if (rpc === 'get_student_review') {
        await fulfillJson(route, practiceReviewPayload());
        return;
      }

      // Default all otherwise-unhandled RPCs to an empty successful response.
      // This keeps optional/new feature-layer reads isolated from production
      // without making the E2E safety net brittle every time a read RPC is added.
      await fulfillJson(route, []);
      return;
    }

    if (path === '/rest/v1/teacher_profiles' && method === 'GET') {
      const accept = request.headers().accept || '';
      const profile = { user_id: TEACHER.id };
      await fulfillJson(
        route,
        accept.includes('application/vnd.pgrst.object') ? profile : [profile],
        200,
        { 'content-range': '0-0/1' },
      );
      return;
    }

    if (path.startsWith('/rest/v1/') && (method === 'GET' || method === 'HEAD')) {
      await fulfillJson(route, [], 200, { 'content-range': '*/0' });
      return;
    }

    if (path.startsWith('/storage/v1/') && (method === 'GET' || method === 'HEAD')) {
      await fulfillJson(route, []);
      return;
    }

    // A core smoke flow should never mutate a production-like table directly.
    // Record and reject unexpected writes so the test can expose the regression.
    state.unexpectedWrites.push({ method, path, body: requestJson(request) });
    await fulfillJson(route, { message: `Unexpected E2E write: ${method} ${path}` }, 409);
  });

  return state;
}

async function openApp(page) {
  await page.goto('/');
  await expect(page.locator('#start')).toHaveClass(/active/);
  await expect(page.locator('#cloud-status')).toContainText('Cloud Connected');
  await expect(page.locator('#v40c-student-signin')).toBeVisible();
  await expect(page.locator('#student-access-note')).toBeVisible();
  await expect(page.locator('#student-pin-wrap')).toBeVisible();
}

async function signInStudent(page) {
  await page.locator('#student-id').fill(STUDENT.id);
  await expect(page.locator('#student-pin-wrap')).toBeVisible();
  await page.locator('#student-pin').fill(STUDENT.pin);
  await page.locator('#v40c-student-signin').click();

  await expect(page.locator('.v40c-session-panel')).toHaveClass(/v40c-authenticated/);
  await expect(page.locator('.v40c-session-identity-text')).toContainText(STUDENT.name);
  await expect(page.locator('#student-pin')).toHaveValue('');
}

async function startPractice(page) {
  const startButton = page.locator('#start-btn');
  if (!(await startButton.isVisible())) {
    const learnNav = page.locator('#start .v40-student-nav [data-v40-nav="learn"]');
    await expect(learnNav).toBeVisible();
    await learnNav.click();
    await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'learn');
  }

  await expect(startButton).toBeVisible();
  await startButton.click();
  await expect(page.locator('#quiz')).toHaveClass(/active/);
  await expect(page.locator('#q-text')).toHaveText(QUESTION.question_text);
}

async function answerPracticeCorrectly(page) {
  await expect(page.locator('#quiz-number')).toBeVisible();
  await page.locator('#quiz-number').fill('7');
  await page.locator('#check-btn').click();
  await expect(page.locator('#feedback')).toHaveClass(/correct/);
  await expect(page.locator('#feedback')).toContainText('Correct');
  await expect(page.locator('#next-btn')).toBeVisible();
}

async function loginTeacher(page) {
  const teacherButton = page.locator('#teacher-btn');
  if (!(await teacherButton.isVisible())) {
    const teacherAccess = page.locator('#start .v40-teacher-access');
    await expect(teacherAccess).toBeVisible();
    await teacherAccess.locator('summary').click();
    await expect(teacherButton).toBeVisible();
  }

  await teacherButton.click();
  await expect(page.locator('#login')).toHaveClass(/active/);
  await expect(page.getByRole('heading', { name: 'Teacher Login' })).toBeVisible();

  await page.locator('#teacher-email').fill(TEACHER.email);
  await page.locator('#teacher-password').fill(TEACHER.password);
  await page.locator('#login-btn').click();

  await expect(page.locator('#teacher')).toHaveClass(/active/);
  await expect(page.locator('#teacher-mode')).toContainText('Cloud Teacher');
  await expect(page.locator('#teacher-subtitle')).not.toHaveText('');
}

module.exports = {
  STUDENT,
  TEACHER,
  QUESTION,
  RESULT_CODE,
  installSupabaseMock,
  openApp,
  signInStudent,
  startPractice,
  answerPracticeCorrectly,
  loginTeacher,
};
