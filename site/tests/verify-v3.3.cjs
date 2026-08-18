const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(html, /Math Practice V3\.3/);
assert.match(html, /Version 3\.3/);
assert.match(html, /id="analytics-learning-grid"/);
assert.match(html, /id="analytics-student-detail"/);
assert.match(html, /function aggregateLearning\(/);
assert.match(html, /function openStudentAnalytics\(/);
assert.match(html, /function exportLearningInsights\(/);
assert.match(html, /teacherAllAnswers\.filter\(a=>a\.review_status==='pending'\|\|a\.review_status==='reviewed'\)/);
assert.match(html, /session_answers'\)\.select\('\*, practice_sessions\(student_name,student_id,class_group,year_level,completed_at,practice_mode\)'\)/);
assert.doesNotMatch(html, /session_answers'\)[^\n]+\.in\('review_status'/);
assert.doesNotMatch(html, /\.limit\(500\)/);
assert.doesNotMatch(html, /service[_-]?role|SUPABASE_SERVICE_ROLE/i);

const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
assert.ok(inlineScripts.length);
inlineScripts.forEach((source, index) => new vm.Script(source, { filename: `index-inline-${index + 1}.js` }));

console.log('V3.3 upgrade verification passed.');
console.log('- Version, learning-insight UI and complete answer loading verified');
console.log(`- ${inlineScripts.length} inline application script block compiled`);
