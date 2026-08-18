const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows.filter(values => values.some(value => value !== ''));
}

function recordsFromCsv(file) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const headers = rows.shift();
  return { headers, records: rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))) };
}

async function run() {
  assert.match(html, /Math Practice V3\.2G\.3/);
  assert.match(html, /Version 3\.2G\.3/);
  assert.doesNotMatch(html, /\.limit\(500\)/, 'Obsolete 500-row teacher-data caps must not remain.');
  assert.match(html, /async function fetchAllTeacherRows\(/);
  assert.ok((html.match(/\.range\(from,to\)/g) || []).length >= 7, 'Every teacher dataset should use ranged pagination.');
  assert.match(html, /function questionValidationErrors\(/);
  assert.match(html, /function multipartImportErrors\(/);
  assert.match(html, /earlier valid row[\s\S]*already imported; no later rows were attempted/);
  assert.match(html, /math-practice-v3\.2G\.3-question-import-template\.csv/);

  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  assert.ok(inlineScripts.length, 'No inline application script was found.');
  inlineScripts.forEach((source, index) => new vm.Script(source, { filename: `index-inline-${index + 1}.js` }));

  const paginationSource = html.match(/async function fetchAllTeacherRows\(makePage,pageSize=500\)\{[^\n]+\}/)?.[0];
  assert.ok(paginationSource, 'Pagination helper could not be extracted for testing.');
  const fetchAllTeacherRows = vm.runInNewContext(`(${paginationSource})`);
  const sourceRows = Array.from({ length: 1001 }, (_, id) => ({ id }));
  const calls = [];
  const pagedRows = await fetchAllTeacherRows(async (from, to) => {
    calls.push([from, to]);
    return { data: sourceRows.slice(from, to + 1), error: null };
  }, 500);
  assert.equal(pagedRows.length, 1001);
  assert.deepEqual(calls, [[0, 499], [500, 999], [1000, 1499]]);

  const bankPath = path.join(root, 'question-bank', 'PSR_2025_Mathematics_Paper1_Q1-Q40.csv');
  const templatePath = path.join(root, 'question-import-template.csv');
  const bank = recordsFromCsv(bankPath);
  const template = recordsFromCsv(templatePath);
  assert.deepEqual(template.headers, bank.headers, 'Template and bank headers must stay aligned.');
  assert.equal(bank.headers.length, 25);
  assert.equal(bank.records.length, 42, 'Multipart questions should produce 42 physical rows.');

  const active = bank.records.filter(record => /^(true|1|yes)$/i.test(record.active));
  const logicalQuestions = new Set(active.map(record => record.parent_question_number || record.question_number));
  const marks = active.reduce((sum, record) => sum + Number(record.marks), 0);
  assert.equal(active.length, 42);
  assert.equal(logicalQuestions.size, 40);
  assert.equal(marks, 90);

  const q29 = bank.records.find(record => record.question_number === '29');
  assert.ok(q29);
  assert.equal(q29.active.toLowerCase(), 'true');
  assert.equal(q29.response_type, 'drawing');
  assert.equal(Number(q29.marks), 2);
  assert.match(q29.response_config, /rubric/);

  for (const [number, parent, label, order] of [['9(a)', '9', 'a', '1'], ['9(b)', '9', 'b', '2'], ['31(a)', '31', 'a', '1'], ['31(b)', '31', 'b', '2']]) {
    const record = bank.records.find(row => row.question_number === number);
    assert.ok(record, `${number} is missing.`);
    assert.equal(record.parent_question_number, parent);
    assert.equal(record.part_label, label);
    assert.equal(record.part_order, order);
    assert.ok(record.group_prompt);
  }
  assert.equal(bank.records.find(record => record.question_number === '9(a)').answer, '=');

  active.filter(record => record.image_url).forEach(record => {
    assert.match(record.image_url, /^images\/[A-Za-z0-9._-]+\.(png|jpe?g|webp)$/i);
    assert.ok(fs.existsSync(path.join(root, ...record.image_url.split('/'))), `Missing image: ${record.image_url}`);
  });

  for (const file of ['index.html', 'config.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(source, /service[_-]?role|SUPABASE_SERVICE_ROLE/i, `${file} contains a service-role reference.`);
  }

  console.log('V3.2G.3 verification passed.');
  console.log(`- ${inlineScripts.length} inline script block compiled`);
  console.log(`- ${pagedRows.length} mocked teacher rows loaded across ${calls.length} pages`);
  console.log(`- ${active.length} active records, ${logicalQuestions.size} logical questions, ${marks} marks`);
  console.log('- Q29 drawing/manual review and multipart metadata verified');
  console.log('- CSV headers and referenced image assets verified');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
