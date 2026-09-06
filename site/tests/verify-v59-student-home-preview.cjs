'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..', '..');
const site = path.join(root, 'site');
const indexPath = path.join(site, 'index.html');
const configPath = path.join(site, 'config.js');
const previewPath = path.join(site, 'v59-student-home-preview.js');
const entryPath = path.join(site, 'student-v59-preview', 'index.html');

function read(file){ return fs.readFileSync(file, 'utf8'); }
function ok(condition, message){ if (!condition) throw new Error(message); }
function gitBlobSha(text){
  const body = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${body.length}\0`), body])).digest('hex');
}

const index = read(indexPath);
const config = read(configPath);
const preview = read(previewPath);
const entry = read(entryPath);

// Exact V5.8 stable root HTML must remain unchanged on the integration branch.
ok(gitBlobSha(index) === '607f3d950a88117b496aa158fea30ce3994b918c', 'site/index.html differs from the V5.8 stable blob.');

// The friendly route is test-only and forwards to an explicit guarded preview flag.
ok(/name=["']robots["'][^>]+noindex,nofollow/i.test(entry), 'Preview entry route must keep noindex,nofollow.');
ok(entry.includes("searchParams.set('v59-student-home-preview','1')"), 'Preview entry route must set the V5.9 preview flag.');
ok(entry.includes('TEST PREVIEW · NOT PRODUCTION'), 'Preview entry route must visibly identify itself as non-production.');

// V5.8 config may load the presentation layer only when the explicit query flag is present.
ok(config.includes("get('v59-student-home-preview') === '1'"), 'config.js must guard V5.9 preview loading behind the explicit query flag.');
ok(config.includes("stagedScripts.push('./v59-student-home-preview.js')"), 'config.js must add the preview module only inside the guarded path.');
ok((config.match(/v59-student-home-preview\.js/g) || []).length === 1, 'Preview module should be referenced exactly once from config.js.');

// The preview module is presentation/delegation only: no new network or persistence path.
ok(preview.includes("get(PARAM) !== '1'"), 'Preview module must self-guard against accidental default loading.');
ok(preview.includes("meta.content = 'noindex,nofollow'"), 'Preview module must mark the query preview noindex,nofollow.');
ok(preview.includes('Real signed-in V5.8 data'), 'Preview must visibly state that it is using existing V5.8 data.');
[
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bsendBeacon\b/,
  /\bcloud\s*\./,
  /\.rpc\s*\(/,
  /\.from\s*\(/,
  /localStorage\.setItem/,
  /sessionStorage\.setItem/
].forEach(pattern => ok(!pattern.test(preview), `Preview module contains forbidden direct data/network behavior: ${pattern}`));

// All interactive preview actions must delegate into accepted V5.8 controls.
['.v57c-primary','.v57c-assignments','.v57c-progress','.v57c-learn','#my-assignments-btn','#my-progress-btn','#v40c-student-logout']
  .forEach(selector => ok(preview.includes(selector), `Missing V5.8 delegation selector: ${selector}`));

console.log('V5.9 student home preview isolation checks passed.');