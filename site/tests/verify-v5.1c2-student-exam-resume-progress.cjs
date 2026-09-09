const {section}=require('./v51-owner-section-helper.cjs');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const source = section('student-exam-ui.js','/* V5.1C2 — Student Exam Resume & Progress Clarity.',null);

assert(source.includes('Student Exam Resume & Progress Clarity'),'C2 feature identity missing');
assert(source.includes("const ACTIVE_ATTEMPTS_KEY = 'mathV32F1ActiveAttempts'"),'C2 must read the established recoverable-attempt storage key');
assert(source.includes('localStorage.getItem(ACTIVE_ATTEMPTS_KEY)'),'C2 must read existing device recovery state');
assert(source.includes("typeof attemptIdentityKey === 'function'"),'C2 must reuse the existing attempt identity rule when available');
assert(source.includes('snapshot?.answeredItems'),'C2 must surface saved answered-question progress');
assert(source.includes('snapshot?.flags'),'C2 must surface saved flagged-question progress');
assert(source.includes('snapshot?.lastSavedAt'),'C2 must surface last-save clarity');
assert(source.includes('snapshot?.deadlineAt'),'C2 must surface saved deadline/timer state');
assert(source.includes("'Continue Exam'"),'C2 must distinguish a resumable attempt from a fresh start');
assert(source.includes("'Recover Exam'"),'C2 must avoid promising normal continuation after a saved deadline has passed');
assert(source.includes("document.getElementById('start-btn')"),'C2 must reuse the normal Exam Mode start control');
assert(source.includes('existing secure resume and autosave checks still apply'),'C2 must explain that existing Exam safeguards remain authoritative');
assert(source.includes('role="progressbar"'),'C2 progress must be accessible');
assert(source.includes("event.key === ACTIVE_ATTEMPTS_KEY"),'C2 must refresh when another tab changes recovery state');
assert(source.includes("const startScreen = document.getElementById('start')"),'C2 must watch the start-screen transition after leaving an unfinished Exam');
assert(source.includes("new MutationObserver(scheduleRender).observe(startScreen,{attributes:true,attributeFilter:['class']})"),'C2 must refresh immediately when the start screen becomes active in the same tab');
assert(source.includes("const accessNote = document.getElementById('student-access-note')"),'C2 must refresh after registered-student verification updates identity programmatically');
assert(source.includes("window.addEventListener('pageshow',scheduleRender)"),'C2 must refresh after browser page restoration');
assert(source.includes("window.addEventListener('focus',scheduleRender)"),'C2 must refresh when the app regains focus');
assert(source.includes("document.addEventListener('visibilitychange'"),'C2 must refresh when the page becomes visible again');

assert(!source.includes('localStorage.setItem'),'C2 must not write attempt state');
assert(!source.includes('localStorage.removeItem'),'C2 must not delete attempt state');
assert(!source.includes('cloud.from('),'C2 must not query or mutate database tables directly');
assert(!source.includes('cloud.rpc('),'C2 must not call RPCs directly');
assert(!/\.insert\s*\(/.test(source),'C2 must not insert data');
assert(!/\.update\s*\(/.test(source),'C2 must not update data');
assert(!/\.delete\s*\(/.test(source),'C2 must not delete data');
assert(!/\.upsert\s*\(/.test(source),'C2 must not upsert data');
assert(!source.includes('start_or_resume_exam_attempt_v3'),'C2 must not alter secure attempt creation/resume');
assert(!source.includes('get_student_questions'),'C2 must not alter secure question retrieval');
assert(!source.includes('save_exam_attempt'),'C2 must not alter autosave');
assert(!source.includes('submit_exam'),'C2 must not alter submission');
assert(!source.includes('correctResponse'),'C2 must not alter grading');

console.log('V5.1C2 Student Exam Resume & Progress Clarity checks passed.');
