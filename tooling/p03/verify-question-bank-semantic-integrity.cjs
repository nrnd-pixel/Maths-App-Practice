#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const sourcePath = path.join(REPO_ROOT, 'site', 'question-bank-selection-qa.js');
const source = fs.readFileSync(sourcePath, 'utf8');

const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: sourcePath });

const qa = sandbox.window.V51QuestionBankQA;
const bulk = sandbox.window.V51QuestionBankBulkStatus;
assert.ok(qa, 'V51QuestionBankQA API must be exposed');
assert.ok(bulk, 'V51QuestionBankBulkStatus API must be exposed');

function row(overrides = {}) {
  return {
    id: 'fixture',
    year_level: 6,
    strand: 'number',
    topic: 'Number',
    subtopic: '',
    skill: 'Solve',
    difficulty: 'standard',
    marks: 3,
    exam_year: 2025,
    paper: 'Paper 2',
    question_number: '1',
    parent_question_number: null,
    part_label: null,
    part_order: null,
    group_prompt: null,
    source_type: 'past_paper',
    source: '2025 Paper 2',
    question_text: 'Fixture question',
    answer: '1',
    accepted_answers: [],
    response_type: 'text',
    response_config: {},
    hint: '',
    explanation: '',
    image_url: '',
    active: false,
    review_status: 'none',
    review_note: '',
    practice_eligible: false,
    ...overrides,
  };
}

function keys(item) {
  return qa.qaFlags(item, qa.buildQaContext([item])).map(flag => flag.key);
}

const clean = row();
assert.deepEqual(Array.from(qa.responseContractIssues(clean)), []);
assert.deepEqual(Array.from(qa.sourceAttributionIssues(clean)), []);
assert.ok(!keys(clean).includes('response'), 'clean row must not have a response-contract flag');
assert.ok(!keys(clean).includes('source'), 'clean row must not have a source-attribution flag');

assert.deepEqual(
  Array.from(qa.responseContractIssues({
    response_type: 'text',
    answer: '1',
  })),
  [],
  'partial rows must not be blocked merely because non-required response fields were not projected'
);

assert.ok(
  qa.responseContractIssues(row({ accepted_answers: {} })).includes('accepted answers'),
  'accepted_answers must remain an array'
);
assert.ok(
  qa.responseContractIssues(row({ response_type: 'mystery' })).includes('response type'),
  'unknown response type must be flagged'
);

const missingUnit = row({ response_type: 'number_unit', response_config: {} });
assert.ok(qa.responseContractIssues(missingUnit).includes('unit'), 'number_unit must declare a unit contract');

const badAcceptedUnits = row({
  response_type: 'number_unit',
  response_config: { accepted_units: 'cm' },
});
assert.ok(
  qa.responseContractIssues(badAcceptedUnits).includes('accepted units'),
  'number_unit accepted_units must be an array'
);

const validAcceptedUnits = row({
  response_type: 'number_unit',
  response_config: { accepted_units: ['cm', 'centimetres'] },
});
assert.deepEqual(Array.from(qa.responseContractIssues(validAcceptedUnits)), []);

const badFraction = row({
  response_type: 'fraction',
  response_config: { simplest_form: 'true' },
});
assert.ok(
  qa.responseContractIssues(badFraction).includes('simplest form'),
  'fraction simplest_form must be boolean when present'
);

const missingBlanks = row({ response_type: 'multi_blank', response_config: { blanks: [] } });
assert.ok(qa.responseContractIssues(missingBlanks).includes('blanks'), 'multi_blank must define blanks');

const missingBlankTarget = row({
  response_type: 'multi_blank',
  response_config: { blanks: [{ label: 'Blank 1', accepted: [] }] },
});
assert.ok(
  qa.responseContractIssues(missingBlankTarget).includes('blank answers'),
  'each multi_blank entry must define an answer or accepted alternatives'
);

const validMultiBlank = row({
  response_type: 'multi_blank',
  response_config: { blanks: [{ label: 'Blank 1', answer: '4', accepted: ['4'] }] },
});
assert.deepEqual(Array.from(qa.responseContractIssues(validMultiBlank)), []);

const duplicateChoiceValues = row({
  response_type: 'multiple_choice',
  answer: 'A',
  response_config: {
    correct: 'A',
    options: [{ label: 'A1', value: 'A' }, { label: 'A2', value: 'A' }],
  },
});
assert.ok(
  qa.responseContractIssues(duplicateChoiceValues).includes('options'),
  'choice option values must be unique'
);

const missingCorrectChoice = row({
  response_type: 'multiple_choice',
  answer: 'C',
  response_config: {
    options: [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }],
  },
});
assert.ok(
  qa.responseContractIssues(missingCorrectChoice).includes('correct option'),
  'multiple_choice correct value must exist in options'
);

const validChoice = row({
  response_type: 'multiple_choice',
  answer: 'B',
  response_config: {
    correct: 'B',
    options: [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }],
  },
});
assert.deepEqual(Array.from(qa.responseContractIssues(validChoice)), []);

const invalidMultiSelect = row({
  response_type: 'multi_select',
  answer: 'A,C',
  response_config: {
    correct: ['A', 'C'],
    options: [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }],
  },
});
assert.ok(
  qa.responseContractIssues(invalidMultiSelect).includes('correct options'),
  'every multi_select correct value must exist in options'
);

const validMultiSelect = row({
  response_type: 'multi_select',
  answer: 'A,B',
  response_config: {
    correct: ['A', 'B'],
    options: [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }],
  },
});
assert.deepEqual(Array.from(qa.responseContractIssues(validMultiSelect)), []);

const validMultiSelectString = row({
  response_type: 'multi_select',
  answer: 'legacy fallback',
  response_config: {
    correct: 'A,B',
    options: [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }],
  },
});
assert.deepEqual(
  Array.from(qa.responseContractIssues(validMultiSelectString)),
  [],
  'comma-separated multi_select.correct must match the server grading fallback'
);

assert.deepEqual(
  Array.from(qa.sourceAttributionIssues(row({ source: 'PSR' }))),
  [],
  'generic legacy source labels are not contradictions when they contain no explicit year or paper claim'
);

assert.ok(
  qa.sourceAttributionIssues(row({ source: '2024 Paper 2' })).includes('source year'),
  'past-paper source must not contradict the exam year when an explicit year is present'
);
assert.ok(
  qa.sourceAttributionIssues(row({ source: '2025 Paper 1' })).includes('source paper'),
  'past-paper source must not contradict the paper number when an explicit paper is present'
);
assert.deepEqual(
  Array.from(qa.sourceAttributionIssues(row({ source_type: 'teacher', source: 'Teacher set' }))),
  [],
  'non-past-paper source labels must not be over-constrained'
);

assert.ok(
  qa.metadataIssues(row({ marks: 4 })).includes('marks'),
  'Paper 1/2 physical rows above 3 marks must be flagged'
);

const responseBlocked = row({ id: 'response-bad', response_type: 'number_unit', response_config: {} });
const sourceBlocked = row({ id: 'source-bad', source: '2024 Paper 2' });
const responseContext = qa.buildQaContext([responseBlocked]);
const sourceContext = qa.buildQaContext([sourceBlocked]);
assert.ok(
  bulk.directActivationBlockers(responseBlocked, responseContext).some(flag => flag.key === 'response'),
  'response-contract QA must block activation'
);
assert.ok(
  bulk.directActivationBlockers(sourceBlocked, sourceContext).some(flag => flag.key === 'source'),
  'source-attribution QA must block activation'
);

assert.ok(source.includes('<option value="response">Response contract</option>'), 'response QA filter must be visible');
assert.ok(source.includes('<option value="source">Source attribution</option>'), 'source QA filter must be visible');

console.log('PASS: P0.3 Question Bank semantic integrity QA is fail-closed and activation-safe.');
