'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const prototypeSource = fs.readFileSync(path.join(ROOT,'tooling','phase7d','flat-loader-prototype.cjs'),'utf8');
const loaderManifest = JSON.parse(fs.readFileSync(path.join(ROOT,'tooling','phase7b','loader-manifest.json'),'utf8'));
const authorityMap = JSON.parse(fs.readFileSync(path.join(ROOT,'tooling','phase7d','tier2-authority-map.json'),'utf8'));
const prototype = require('../../tooling/phase7d/flat-loader-prototype.cjs');
const plan = prototype.buildFlatPlan(loaderManifest,authorityMap);
const tier1 = loaderManifest.tiers.find(row => row.source === 'site/config.js');
const tier2 = loaderManifest.tiers.find(row => row.source === 'site/v40-release.js');

function labelFromUrl(url){
  const parsed = new URL(url);
  return parsed.pathname.replace(/^\//,'') + parsed.search;
}

async function installProbeRoutes(page,{failFile=''} = {}){
  await page.route('http://phase7dc.test/**', async route => {
    const url = new URL(route.request().url());

    if (url.pathname === '/') {
      await route.fulfill({
        status:200,
        contentType:'text/html',
        body:`<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <section id="start"><div class="info">Initial release note</div></section>
  <script>
    window.__phase7dc = {
      executions:[],
      timeline:[],
      identityCalls:0
    };
    window.MathAppVersion = Object.freeze({
      marker:'identity-owner',
      applyIdentity(){ window.__phase7dc.identityCalls += 1; }
    });
    window.__phase7dc.identityRef = window.MathAppVersion;
    window.MATH_APP_STAGED_SCRIPTS = Object.freeze(${JSON.stringify(tier1.entries.map(row => row.src))});
    window.__phase7dc.stagedRef = window.MATH_APP_STAGED_SCRIPTS;
  </script>
</body>
</html>`
      });
      return;
    }

    if (url.pathname.endsWith('.js')) {
      const file = url.pathname.replace(/^\//,'');
      if (file === failFile) {
        await route.fulfill({status:404,contentType:'text/javascript',body:'/* deliberate Phase 7D-C failure probe */'});
        return;
      }

      await route.fulfill({
        status:200,
        contentType:'text/javascript',
        body:`(() => {
          const u = new URL(document.currentScript.src, location.href);
          const label = u.pathname.replace(/^\\//,'') + u.search;
          window.__phase7dc.executions.push(label);
          window.__phase7dc.timeline.push('exec:' + label);
        })();`
      });
      return;
    }

    await route.fulfill({status:404,body:'not found'});
  });
}

async function bootPrototype(page){
  await page.goto('http://phase7dc.test/');
  await page.addScriptTag({content:prototypeSource});
  await expect.poll(() => page.evaluate(() => !!window.Phase7DFlatLoaderPrototype)).toBe(true);
}

async function execute(page,customPlan=plan){
  return page.evaluate(async flatPlan => {
    const api = window.Phase7DFlatLoaderPrototype;
    return api.executeFlatPlan(document,flatPlan,{
      onReleasePresentation(step){
        window.__phase7dc.timeline.push('boundary:' + step.file);
        window.MathAppVersion.applyIdentity();
        document.querySelector('#start > .info').textContent = 'Prototype release presentation applied';
      }
    });
  },customPlan);
}

test.describe('Phase 7D-C — dormant flat-loader prototype', () => {
  test('prototype plan preserves 88 symbolic positions while replacing only v40-release transport with a presentation boundary', async () => {
    expect(plan).toHaveLength(99);
    expect(plan.filter(step => step.tier === 1)).toHaveLength(58);
    expect(plan.filter(step => step.tier === 2)).toHaveLength(41);
    expect(plan.filter(step => step.kind === 'script')).toHaveLength(98);
    expect(plan.filter(step => step.kind === 'release-presentation-boundary')).toHaveLength(1);

    const boundary = plan.find(step => step.kind === 'release-presentation-boundary');
    expect(boundary.file).toBe('v40-release.js');
    expect(boundary.position).toBe(14);

    expect(plan.slice(0,58).every(step => step.tier === 1)).toBe(true);
    expect(plan.slice(58).every(step => step.tier === 2)).toBe(true);

    const symbolic = plan.map(step => step.file);
    expect(symbolic).toEqual([
      ...tier1.entries.map(row => prototype.fileOf(row.src)),
      ...tier2.entries.map(row => prototype.fileOf(row.src))
    ]);
  });

  test('browser executor reproduces the accepted 47 -> 41 chronology without executing the nested release transport', async ({ page }) => {
    await installProbeRoutes(page);
    await bootPrototype(page);

    const trace = await execute(page);

    expect(trace).toHaveLength(99);
    expect(trace.filter(row => row.status === 'loaded')).toHaveLength(98);
    expect(trace.filter(row => row.status === 'boundary')).toHaveLength(1);
    expect(trace.some(row => row.status === 'error')).toBe(false);

    const result = await page.evaluate(() => ({
      executions:window.__phase7dc.executions,
      timeline:window.__phase7dc.timeline,
      identityCalls:window.__phase7dc.identityCalls,
      stagedStable:window.MATH_APP_STAGED_SCRIPTS === window.__phase7dc.stagedRef,
      stagedEntries:Array.from(window.MATH_APP_STAGED_SCRIPTS),
      identityStable:window.MathAppVersion === window.__phase7dc.identityRef,
      releaseText:document.querySelector('#start > .info')?.textContent || '',
      bodyScripts:Array.from(document.body.querySelectorAll('script[src]')).map(node => ({
        src:new URL(node.src,location.href).pathname.replace(/^\//,'') + new URL(node.src,location.href).search,
        async:node.async
      })),
      headScripts:Array.from(document.head.querySelectorAll('script[src]')).map(node => {
        const u = new URL(node.src,location.href);
        return {
          src:u.pathname.replace(/^\//,'') + u.search,
          async:node.async,
          dataAttrs:Array.from(node.attributes).filter(attr => attr.name.startsWith('data-')).map(attr => [attr.name,attr.value])
        };
      })
    }));

    const expectedTimeline = plan.map(step =>
      step.kind === 'release-presentation-boundary'
        ? 'boundary:v40-release.js'
        : 'exec:' + step.src
    );

    expect(result.timeline).toEqual(expectedTimeline);
    expect(result.executions).not.toContain('v40-release.js');
    expect(result.executions).toHaveLength(98);

    expect(result.bodyScripts).toHaveLength(56);
    expect(result.headScripts).toHaveLength(41);
    expect(result.bodyScripts.every(row => row.async === false)).toBe(true);
    expect(result.headScripts.every(row => row.async === false)).toBe(true);

    expect(result.headScripts.map(row => row.src)).toEqual(tier2.entries.map(row => row.src));
    expect(result.headScripts.map(row => Object.fromEntries(row.dataAttrs))).toEqual(
      tier2.entries.map(row => ({[row.dataKey]:'1'}))
    );

    expect(result.identityCalls).toBe(1);
    expect(result.identityStable).toBe(true);
    expect(result.stagedStable).toBe(true);
    expect(result.stagedEntries).toEqual(tier1.entries.map(row => row.src));
    expect(result.releaseText).toBe('Prototype release presentation applied');

    const v581aExec = result.timeline.indexOf('exec:v581a-practice-cloud-result-reconciliation.js');
    const firstTier2Exec = result.timeline.indexOf('exec:' + tier2.entries[0].src);
    expect(v581aExec).toBeGreaterThan(result.timeline.indexOf('boundary:v40-release.js'));
    expect(v581aExec).toBeLessThan(firstTier2Exec);
  });

  test('existing tier-2 data key causes only that child to be skipped while later children still load in order', async ({ page }) => {
    await installProbeRoutes(page);
    await bootPrototype(page);

    await page.evaluate(() => {
      const existing = document.createElement('script');
      existing.setAttribute('data-v41-signin-guard','1');
      existing.dataset.phase7dcPreexisting = '1';
      document.head.appendChild(existing);
    });

    const trace = await execute(page);
    const skipped = trace.filter(row => row.status === 'skipped-existing');

    expect(skipped).toHaveLength(1);
    expect(skipped[0].file).toBe('v41-signin-guard.js');

    const result = await page.evaluate(() => ({
      executions:window.__phase7dc.executions,
      tagged:document.head.querySelectorAll('script[data-v41-signin-guard="1"]').length,
      last:window.__phase7dc.executions.at(-1)
    }));

    expect(result.executions).not.toContain('v41-signin-guard.js');
    expect(result.tagged).toBe(1);
    expect(result.last).toBe(tier2.entries.at(-1).src);
  });

  test('a child load failure is recorded but does not prevent later authority owners from loading', async ({ page }) => {
    const failFile = 'v50-accessibility-polish.js';
    await installProbeRoutes(page,{failFile});
    await bootPrototype(page);

    const trace = await execute(page);
    const failed = trace.filter(row => row.status === 'error');

    expect(failed).toHaveLength(1);
    expect(failed[0].file).toBe(failFile);

    const result = await page.evaluate(() => ({
      executions:window.__phase7dc.executions,
      last:window.__phase7dc.executions.at(-1)
    }));

    expect(result.executions).not.toContain(failFile);
    expect(result.executions).toContain('teacher-reporting.js');
    expect(result.executions).toContain('practice-selection-engine.js');
    expect(result.last).toBe(tier2.entries.at(-1).src);
  });
});
