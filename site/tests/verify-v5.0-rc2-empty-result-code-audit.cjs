const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const read = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

const release = read('site/v40-release.js');
const polish = read('site/v50-rc2-empty-result-code-polish.js');
const sql = read('supabase/v50rc2_result_code_empty_audit_hotfix.sql');

new vm.Script(polish,{filename:'v50-rc2-empty-result-code-polish.js'});

assert.match(release,/v50-rc2-empty-result-code-polish\.js\?v=50rc2-empty-1/,
  'Release loader must include the empty-result-code audit polish.');
assert.match(release,/assignment-interventions\.js\?v=44a-\d+', 'data-v44a-action-center-practice'/,
  'The established V44 action-center loader identity must remain unchanged across asset revisions.');
assert.match(release,/assignment-intervention-history\.js\?v=47a-1/,
  'The established V47 history loader must remain unchanged.');

assert.match(sql,/v_result_code_count integer := 0/i);
assert.match(sql,/select count\(\*\)::integer,[\s\S]*?coalesce\(min\(length\(result_code\)\),0\)::integer,[\s\S]*?count\(distinct result_code\)/i,
  'RC2 must distinguish an empty result-code population from a short code.');
assert.match(sql,/v_result_code_count = 0 or v_result_code_min_len >= 19/i,
  'An empty population may pass, but real codes must still be at least 19 characters.');
assert.match(sql,/'result_code_count',v_result_code_count/i,
  'RC2 summary must expose the actual result-code sample size.');
assert.match(sql,/v_result_code_duplicates = 0/i,
  'Duplicate result codes must still fail RC2.');
assert.match(sql,/set search_path to ''/i);
assert.match(sql,/revoke all on function public\.get_teacher_release_audit_v50rc2\(\) from public/i);
assert.match(sql,/revoke all on function public\.get_teacher_release_audit_v50rc2\(\) from anon/i);
assert.match(sql,/grant execute on function public\.get_teacher_release_audit_v50rc2\(\) to authenticated/i);

assert.match(polish,/Security pass/,
  'Browser polish must only reinterpret the empty sample after the server says RC2 passes.');
assert.match(polish,/Minimum code length 0\\s\*·\\s\*0 duplicate code\\\(s\\\)/,
  'Browser polish must target only the exact empty-sample display state.');
assert.match(polish,/19-character UUID-derived codes/,
  'Empty-sample explanation must state the generator strength instead of inventing a measured code.');
assert.doesNotMatch(polish,/cloud\.rpc|cloud\.from|fetch\(/,
  'Display polish must not make additional network or database calls.');
assert.doesNotMatch(sql,/\btruncate\b|delete\s+from/i,
  'RC2 audit hotfix must remain read-only.');

console.log('V5.0RC2 empty-result-code audit verification passed.');
console.log('- zero saved result codes are treated as an empty sample, not a weak code');
console.log('- any real saved code must still be >=19 characters and unique');
console.log('- browser display changes only when the server-side RC2 result already passes');
