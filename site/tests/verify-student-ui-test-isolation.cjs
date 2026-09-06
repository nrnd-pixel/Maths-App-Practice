const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const site = path.join(__dirname, '..');
const prototypePath = path.join(site, 'student-ui-test', 'index.html');
const html = fs.readFileSync(prototypePath, 'utf8');
const config = fs.readFileSync(path.join(site, 'config.js'), 'utf8');
const productionIndex = fs.readFileSync(path.join(site, 'index.html'), 'utf8');

// Pin this first test release to the exact reviewed/uploaded prototype.
const bytes = Buffer.byteLength(html, 'utf8');
const gitBlobSha = crypto
  .createHash('sha1')
  .update(`blob ${bytes}\0`)
  .update(html, 'utf8')
  .digest('hex');
assert.equal(
  gitBlobSha,
  '4791200cc9ebab0e0430811d54d0a2e0d1663089',
  'student-ui-test/index.html changed from the reviewed prototype'
);

// Discoverability and test-only warning must remain explicit.
assert.match(html, /<meta\s+name=["']robots["']\s+content=["']noindex,nofollow["']\s*\/?>/i);
assert.match(html, /UI TEST · FICTIONAL DATA/);
assert.match(html, /Do not enter a real student ID or PIN\./);

// The prototype must stay network-isolated and self-contained.
assert.match(html, /Content-Security-Policy[^>]*connect-src 'none'/i);
assert.match(html, /Content-Security-Policy[^>]*default-src 'none'/i);
assert.match(html, /Content-Security-Policy[^>]*base-uri 'none'/i);
assert.match(html, /Content-Security-Policy[^>]*form-action 'none'/i);
assert.doesNotMatch(html, /\bfetch\s*\(/i);
assert.doesNotMatch(html, /\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|navigator\.sendBeacon/i);
assert.doesNotMatch(html, /createClient\s*\(|@supabase|https?:\/\/[^"'\s]+\.supabase\.co/i);
assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/i);
assert.doesNotMatch(html, /<link\b[^>]*\bhref\s*=\s*["']https?:/i);
assert.doesNotMatch(html, /<img\b[^>]*\bsrc\s*=\s*["']https?:/i);

// Browser persistence is confined to the dedicated demo key.
assert.match(html, /const KEY='maths-student-v2-demo-20260906'/);
assert.doesNotMatch(html, /sessionStorage/i);

// The production runtime must not load or advertise the experiment.
assert.doesNotMatch(config, /student-ui-test/i);
assert.doesNotMatch(productionIndex, /student-ui-test/i);
assert.doesNotMatch(html, /(?:src|href)=["'][^"']*(?:config\.js|v58[a-z0-9.-]*\.js)/i);

console.log('Student UI test isolation checks passed.');
console.log('- exact reviewed prototype retained');
console.log('- noindex/nofollow and fictional-data warning retained');
console.log('- network/Supabase access remains blocked');
console.log('- demo storage key remains isolated');
console.log('- production index/config do not reference the test route');
