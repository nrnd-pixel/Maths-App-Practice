const { expect } = require('@playwright/test');

const STUDENT = Object.freeze({
  id: 'E2E-001',
  pin: '4827',
  name: 'E2E Student',
  year: 6,
  className: '6A',
});

const STUDENT_META = Object.freeze({
  roster_student_id: 'e2e-roster-student-1',
  class_id: 'e2e-class-1',
  student_id: STUDENT.id,
  student_name: STUDENT.name,
  year_level: STUDENT.year,
  class_name: STUDENT.className,
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

const REQUIRED_STUDENT_READ_RPCS = Object.freeze([
  'get_student_practice_questions_v53d3',
  'get_student_gamification_v571a',
  'get_student_gamification_achievements_v571b',
  'get_student_weekly_missions_v572',
  'get_student_class_challenge_v573',
  'get_student_class_challenge_v574',
  'get_student_learning_dashboard',
  'get_student_motivation',
  'get_student_motivation_messages',
  'get_student_practice_recommendation_v53d4',
  'get_student_practice_assignments_v56b',
  'get_student_assignments',
  'get_available_exam_papers',
  'get_student_past_paper_checkpoints_v57a',
  'get_student_past_paper_completion_watermarks_v57a',
]);

function studentIdentity() {
  return {
    student_name: STUDENT.name,
    student_id: STUDENT.id,
    year_level: STUDENT.year,
    class_name: STUDENT.className,
  };
}

function gamificationPayload() {
  return {
    student: studentIdentity(),
    xp: {
      total: 0,
      answer_xp: 0,
      session_bonus_xp: 0,
      past_paper_bonus_xp: 0,
      assignment_bonus_xp: 0,
    },
    level: {
      number: 1,
      title: 'Maths Starter',
      start_xp: 0,
      next_level_xp: 100,
      progress_percent: 0,
    },
    activity: {
      first_try_correct: 0,
      second_try_correct: 0,
      completed_sessions: 0,
      completed_past_papers: 0,
      completed_assignments: 0,
    },
    rules: {
      first_try_correct_xp: 10,
      second_try_correct_xp: 6,
      completed_session_xp: 10,
      past_paper_extra_xp: 20,
      completed_assignment_xp: 20,
    },
  };
}

function achievementsPayload() {
  return {
    streak: {
      current: 0,
      longest: 0,
      days_this_week: 0,
      meaningful_days: 0,
      today_qualified: false,
      today_questions: 0,
      last_qualified_day: null,
    },
    badges: [
      {
        id: 'first_practice',
        title: 'First Practice',
        description: 'Complete your first Practice session.',
        icon: '🌱',
        earned: false,
        earned_at: null,
      },
    ],
    latest_badge: null,
    rules: {
      meaningful_questions_per_day: 5,
      past_paper_completes_day: true,
      assignment_completes_day: true,
      timezone: 'Asia/Brunei',
    },
  };
}

function weeklyMissionsPayload() {
  return {
    week: {
      start_date: '2026-09-07',
      end_date: '2026-09-13',
      today: '2026-09-07',
      timezone: 'Asia/Brunei',
    },
    summary: {
      completed: 0,
      total: 3,
      all_complete: false,
    },
    missions: [
      {
        id: 'question_quest',
        title: 'Question Quest',
        description: 'Complete 10 Practice questions this week.',
        icon: '🎯',
        progress: 0,
        raw_progress: 0,
        target: 10,
        unit: 'questions',
        complete: false,
        action: 'learn',
      },
      {
        id: 'practice_days',
        title: 'Keep It Going',
        description: 'Complete meaningful Practice on 2 different days this week.',
        icon: '🔥',
        progress: 0,
        raw_progress: 0,
        target: 2,
        unit: 'days',
        complete: false,
        action: 'learn',
      },
      {
        id: 'challenge_complete',
        title: 'Challenge Complete',
        description: 'Finish a teacher assignment or a Past Paper Practice this week.',
        icon: '🏁',
        progress: 0,
        raw_progress: 0,
        target: 1,
        unit: 'challenge',
        complete: false,
        action: 'challenge',
        assignment_completions: 0,
        past_paper_completions: 0,
      },
    ],
    rules: {
      question_target: 10,
      practice_day_target: 2,
      meaningful_questions_per_day: 5,
      challenge_target: 1,
      week_starts: 'Monday',
      timezone: 'Asia/Brunei',
      exam_activity_counts: false,
    },
  };
}

function classChallengePayload(enabled = true) {
  return {
    class: {
      class_id: STUDENT_META.class_id,
      class_name: STUDENT.className,
      year_level: STUDENT.year,
      active_students: 1,
    },
    week: {
      start_date: '2026-09-07',
      end_date: '2026-09-13',
      today: '2026-09-07',
      timezone: 'Asia/Brunei',
    },
    challenge: {
      title: 'Class Question Quest',
      description: enabled
        ? 'Work together to complete Practice questions this week.'
        : 'Your teacher has paused this class challenge.',
      questions_completed: 0,
      target_questions: 10,
      contributors: 0,
      progress_percent: 0,
      complete: false,
      enabled,
    },
    rules: {
      questions_per_active_student: 10,
      week_starts: 'Monday',
      timezone: 'Asia/Brunei',
      exam_activity_counts: false,
      student_rankings: false,
      teacher_configurable: true,
    },
  };
}

function learningDashboardPayload() {
  return {
    student: studentIdentity(),
    summary: {
      completed_sessions: 0,
      scored_responses: 0,
      pending_review: 0,
    },
    topics: [],
    recent: [],
  };
}

function motivationPayload() {
  return {
    student: studentIdentity(),
    streak: { current: 0, longest: 0 },
    weekly_goal: { completed_days: 0, goal_days: 3 },
    summary: { message: '', status: 'new' },
  };
}

function motivationMessagesPayload() {
  return {
    student: studentIdentity(),
    unread_count: 0,
    messages: [],
  };
}

function recommendationPayload() {
  return {
    student: studentIdentity(),
    recommended_count: 0,
    practice_scope: 'mixed',
    focus_strand: null,
    focus_topic: null,
    reason: '',
  };
}

function emptyPracticeAssignmentsPayload() {
  return {
    student: studentIdentity(),
    assignments: [],
  };
}

function checkpointPayload() {
  return {
    student: studentIdentity(),
    checkpoints: [],
  };
}

function completionWatermarksPayload() {
  return {
    student: studentIdentity(),
    completions: [],
  };
}

function studentReadRpcPayload(rpc) {
  const builders = {
    get_student_practice_questions_v53d3: () => [QUESTION],
    get_student_gamification_v571a: gamificationPayload,
    get_student_gamification_achievements_v571b: achievementsPayload,
    get_student_weekly_missions_v572: weeklyMissionsPayload,
    get_student_class_challenge_v573: () => classChallengePayload(true),
    get_student_class_challenge_v574: () => classChallengePayload(false),
    get_student_learning_dashboard: learningDashboardPayload,
    get_student_motivation: motivationPayload,
    get_student_motivation_messages: motivationMessagesPayload,
    get_student_practice_recommendation_v53d4: recommendationPayload,
    get_student_practice_assignments_v56b: emptyPracticeAssignmentsPayload,
    get_student_assignments: () => [],
    get_available_exam_papers: () => [],
    get_student_past_paper_checkpoints_v57a: checkpointPayload,
    get_student_past_paper_completion_watermarks_v57a: completionWatermarksPayload,
  };
  const build = builders[rpc];
  return build ? { handled: true, body: build() } : { handled: false, body: null };
}

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
    unhandledRpcCalls: [],
    restReads: [],
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
          roster_student_id: STUDENT_META.roster_student_id,
          class_id: STUDENT_META.class_id,
          student_name: STUDENT.name,
          student_id: STUDENT.id,
          year_level: STUDENT.year,
          class_name: STUDENT.className,
          purpose,
          access_token: `${purpose}-ticket-e2e`,
        });
        return;
      }

      const studentFixture = studentReadRpcPayload(rpc);
      if (studentFixture.handled) {
        const headers = Array.isArray(studentFixture.body)
          ? { 'content-range': studentFixture.body.length ? `0-${studentFixture.body.length - 1}/${studentFixture.body.length}` : '*/0' }
          : {};
        await fulfillJson(route, studentFixture.body, 200, headers);
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

      // Keep genuinely optional/unknown read RPCs isolated, but record them so
      // Phase 0 can expose route drift instead of silently pretending they were
      // part of the maintained fixture contract.
      state.unhandledRpcCalls.push({ rpc, body });
      await fulfillJson(route, []);
      return;
    }

    if (path === '/rest/v1/teacher_profiles' && method === 'GET') {
      state.restReads.push(path);
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
      state.restReads.push(path);
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
  REQUIRED_STUDENT_READ_RPCS,
  installSupabaseMock,
  openApp,
  signInStudent,
  startPractice,
  answerPracticeCorrectly,
  loginTeacher,
};
