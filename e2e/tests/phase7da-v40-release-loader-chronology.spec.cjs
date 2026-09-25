'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const SITE = path.join(ROOT, 'site');
const TOOLING = path.join(ROOT, 'tooling', 'phase7b');

const configSource = fs.readFileSync(path.join(SITE, 'config.js'), 'utf8');
const releaseSource = fs.readFileSync(path.join(SITE, 'v40-release.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(TOOLING, 'loader-manifest.json'), 'utf8'));

const tier1 = manifest.tiers.find(row => row.source === 'site/config.js');
const tier2 = manifest.tiers.find(row => row.source === 'site/v40-release.js');

function normalize(src){
  return String(src || '').replace(/^\.\//, '');
}

function probeSource(label, release = false){
  const prefix = `
    (() => {
      const current = document.currentScript;
      const u = new URL(current.src, location.href);
      const label = u.pathname.replace(/^\\//,'') + u.search;
      window.__phase7d.executions.push({
        src: label,
        readyState: document.readyState,
        parent: current.parentElement?.tagName || ''
      });
      if (label.startsWith('v40-release.js')) window.__phase7d.releaseReadyState = document.readyState;
    })();
  `;
  return release ? prefix + '\n' + releaseSource : prefix;
}

async function installRoutes(page){
  await page.route('http://phase7d.test/**', async route => {
    const url = new URL(route.request().url());

    if (url.pathname === '/') {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script>
    window.__phase7d = {
      insertions: [],
      loads: [],
      executions: [],
      identityCalls: 0,
      releaseReadyState: ''
    };
    window.MathAppVersion = {
      applyIdentity(){ window.__phase7d.identityCalls += 1; }
    };

    const nativeAppend = Element.prototype.appendChild;
    Element.prototype.appendChild = function(node){
      if (node && node.tagName === 'SCRIPT') {
        const u = new URL(node.src || '', location.href);
        const dataAttrs = {};
        for (const attr of Array.from(node.attributes || [])) {
          if (attr.name.startsWith('data-')) dataAttrs[attr.name] = attr.value;
        }
        window.__phase7d.insertions.push({
          src: u.pathname.replace(/^\\//,'') + u.search,
          parent: this.tagName,
          async: node.async,
          dataAttrs
        });
        node.addEventListener('load', () => {
          window.__phase7d.loads.push(u.pathname.replace(/^\\//,'') + u.search);
        });
      }
      return nativeAppend.call(this,node);
    };
  </script>
  <script src="/config.js"></script>
</head>
<body>
  <section id="start"><div class="info">Initial release note</div></section>
</body>
</html>`
      });
      return;
    }

    if (url.pathname === '/config.js') {
      await route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: configSource
      });
      return;
    }

    if (url.pathname === '/v40-release.js') {
      await route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: probeSource('v40-release.js', true)
      });
      return;
    }

    if (url.pathname.endsWith('.js')) {
      await route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: probeSource(url.pathname)
      });
      return;
    }

    await route.fulfill({ status: 404, body: 'not found' });
  });
}

test.describe('Phase 7D-A — frozen nested-loader chronology', () => {
  test('manifest still describes the exact frozen two-tier loader boundary', async () => {
    expect(manifest.schemaVersion).toBe(2);
    expect(tier1).toBeTruthy();
    expect(tier2).toBeTruthy();
    expect(tier1.entries).toHaveLength(57);
    expect(tier2.entries).toHaveLength(41);

    expect(configSource).toContain("window.addEventListener('load'");
    expect(configSource).toContain('script.async = false');
    expect(configSource).toContain('document.body.appendChild(script)');

    expect(releaseSource).toContain('function loadScriptOnce(src, dataKey)');
    expect(releaseSource).toContain('script.async = false');
    expect(releaseSource).toContain('document.head.appendChild(script)');
    expect(releaseSource).toContain("if (document.readyState === 'loading')");
    expect(releaseSource).toContain("document.addEventListener('DOMContentLoaded', applyV51StableRelease, { once:true })");
  });

  test('actual current loaders insert and execute 45 then 41 scripts in exact manifest order', async ({ page }) => {
    await installRoutes(page);
    await page.goto('http://phase7d.test/');

    await expect.poll(
      () => page.evaluate(() => window.__phase7d?.executions?.length || 0),
      { timeout: 15_000 }
    ).toBe(98);

    await expect.poll(
      () => page.evaluate(() => window.__phase7d?.loads?.length || 0),
      { timeout: 15_000 }
    ).toBe(98);

    const result = await page.evaluate(() => ({
      insertions: window.__phase7d.insertions,
      executions: window.__phase7d.executions,
      loads: window.__phase7d.loads,
      identityCalls: window.__phase7d.identityCalls,
      releaseReadyState: window.__phase7d.releaseReadyState,
      releaseText: document.querySelector('#start > .info')?.textContent || ''
    }));

    const expectedTier1 = tier1.entries.map(row => normalize(row.src));
    const expectedTier2 = tier2.entries.map(row => normalize(row.src));
    const expectedAll = [...expectedTier1, ...expectedTier2];

    expect(result.insertions).toHaveLength(98);
    expect(result.insertions.map(row => row.src)).toEqual(expectedAll);
    expect(result.executions.map(row => row.src)).toEqual(expectedAll);
    expect(result.loads).toEqual(expectedAll);

    expect(result.insertions.slice(0, 57).every(row => row.parent === 'BODY')).toBe(true);
    expect(result.insertions.slice(57).every(row => row.parent === 'HEAD')).toBe(true);
    expect(result.insertions.every(row => row.async === false)).toBe(true);

    const tier2Insertions = result.insertions.slice(57);
    expect(tier2Insertions.map(row => row.dataAttrs)).toEqual(
      tier2.entries.map(row => ({ [row.dataKey]: '1' }))
    );

    expect(result.releaseReadyState).toBe('complete');
    expect(result.executions.every(row => row.readyState === 'complete')).toBe(true);
    expect(result.identityCalls).toBe(1);
    expect(result.releaseText).toContain('V5.1 Stable Release');
  });

  test('re-executing v40-release preserves the 41-script duplicate guard and does not reinstall tier 2', async ({ page }) => {
    await installRoutes(page);
    await page.goto('http://phase7d.test/');

    await expect.poll(
      () => page.evaluate(() => window.__phase7d?.executions?.length || 0),
      { timeout: 15_000 }
    ).toBe(98);

    const before = await page.evaluate(() => ({
      insertionCount: window.__phase7d.insertions.length,
      tier2Tagged: document.head.querySelectorAll('script[data-v41-signin-guard="1"],script[data-v49b-student-topic-progress="1"],script[data-resource-bank-bulk="1"]').length,
      identityCalls: window.__phase7d.identityCalls
    }));
    expect(before).toEqual({ insertionCount: 98, tier2Tagged: 3, identityCalls: 1 });

    await page.evaluate(() => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/v40-release.js?phase7d-reload=1';
      script.async = false;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    }));

    await expect.poll(
      () => page.evaluate(() => window.__phase7d.identityCalls),
      { timeout: 5_000 }
    ).toBe(2);

    const after = await page.evaluate(() => ({
      insertionCount: window.__phase7d.insertions.length,
      tier2Tagged: document.head.querySelectorAll('script[data-v41-signin-guard="1"],script[data-v49b-student-topic-progress="1"],script[data-resource-bank-bulk="1"]').length,
      executions: window.__phase7d.executions.map(row => row.src),
      identityCalls: window.__phase7d.identityCalls
    }));

    // One extra insertion/execution is the deliberately reloaded release owner itself.
    // No tier-2 child is appended again because every existing data key is detected.
    expect(after.insertionCount).toBe(99);
    expect(after.tier2Tagged).toBe(3);
    expect(after.executions).toHaveLength(99);
    expect(after.executions.at(-1)).toBe('v40-release.js?phase7d-reload=1');
    expect(after.identityCalls).toBe(2);

    for (const row of tier2.entries) {
      const selector = `script[${row.dataKey}="1"]`;
      expect(await page.locator(selector).count(), selector).toBe(1);
    }
  });
});
