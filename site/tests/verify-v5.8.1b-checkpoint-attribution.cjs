const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sql = fs.readFileSync(path.join(root, 'DATABASE-MIGRATIONS-V5.8.1B.txt'), 'utf8');

function expect(fragment, message) {
  if (!sql.includes(fragment)) throw new Error(message || `Missing expected fragment: ${fragment}`);
}

expect("set status='in_progress',question_target=v_count,updated_at=now()", 'Continuing an assignment must preserve the original started_at boundary.');
if (/set status='in_progress',question_target=v_count,practice_session_id=null,[\s\S]{0,120}started_at=now\(\)/.test(sql)) {
  throw new Error('V5.8.1B must not reset started_at when continuing an existing assignment.');
}

expect("v_mode<>'past_paper'", 'Legacy/mixed Past Paper sessions need server-derived attribution recovery.');
expect("v_inferred_year_count=1", 'Past Paper inference must require exactly one exam year.');
expect("v_inferred_paper_count=1", 'Past Paper inference must require exactly one paper.');
expect("v_non_past_rows,0)=0", 'Past Paper inference must reject non-past-paper question evidence.');
expect("lower(trim(v_inferred_year::text || ' · ' || v_inferred_paper))", 'Past Paper inference must match the visible paper topic label.');

expect('and c.assignment_id is null;', 'Generic Past Paper session cleanup must not delete teacher-assignment checkpoints.');
expect('clear_completed_assignment_checkpoint_v581b', 'Completed teacher assignments need an explicit checkpoint cleanup trigger.');
expect('where c.assignment_attempt_id=new.id;', 'Assignment checkpoint cleanup must be scoped to the exact attempt.');

expect('c.started_at < paa.started_at', 'Repair must detect attempts whose started_at was reset after the checkpoint began.');
expect('candidate_count=1', 'Historical repair must only auto-link an unambiguous completed session.');
expect(")>=greatest(1,paa.question_target)", 'Historical repair must require enough logical questions for the assignment target.');

console.log('V5.8.1B checkpoint + Past Paper attribution invariants verified.');
