'use strict';

const RELEASE_OWNER = 'v40-release.js';

function cleanSrc(src){
  return String(src || '').replace(/^\.\//, '');
}

function fileOf(src){
  return cleanSrc(src).split('?')[0];
}

function assert(condition,message){
  if (!condition) throw new Error(message);
}

function buildFlatPlan(loaderManifest,authorityMap){
  assert(loaderManifest && Array.isArray(loaderManifest.tiers), 'loader manifest is required');
  assert(authorityMap && Array.isArray(authorityMap.entries), 'authority map is required');

  const tier1 = loaderManifest.tiers.find(row => row.source === 'site/config.js');
  const tier2 = loaderManifest.tiers.find(row => row.source === 'site/v40-release.js');

  assert(tier1 && tier1.entries.length === 45, 'expected the accepted 45-entry tier-1 loader');
  assert(tier2 && tier2.entries.length === 41, 'expected the accepted 41-entry tier-2 loader');
  assert(authorityMap.entries.length === 41, 'expected the accepted 41-entry tier-2 authority map');

  const steps = [];

  tier1.entries.forEach((entry,index) => {
    const src = cleanSrc(entry.src);
    const file = fileOf(src);

    if (file === RELEASE_OWNER){
      steps.push(Object.freeze({
        position:steps.length + 1,
        tier:1,
        kind:'release-presentation-boundary',
        src,
        file,
        parent:null,
        async:false,
        dataKey:null,
        originalTierIndex:index + 1
      }));
      return;
    }

    steps.push(Object.freeze({
      position:steps.length + 1,
      tier:1,
      kind:'script',
      src,
      file,
      parent:'body',
      async:false,
      dataKey:null,
      originalTierIndex:index + 1
    }));
  });

  tier2.entries.forEach((entry,index) => {
    const src = cleanSrc(entry.src);
    steps.push(Object.freeze({
      position:steps.length + 1,
      tier:2,
      kind:'script',
      src,
      file:fileOf(src),
      parent:'head',
      async:false,
      dataKey:String(entry.dataKey || ''),
      originalTierIndex:index + 1
    }));
  });

  validateFlatPlan(steps,loaderManifest,authorityMap);
  return Object.freeze(steps.slice());
}

function validateFlatPlan(plan,loaderManifest,authorityMap){
  assert(Array.isArray(plan) && plan.length === 86, 'flat plan must contain exactly 86 symbolic execution steps');

  const boundaries = plan.filter(step => step.kind === 'release-presentation-boundary');
  assert(boundaries.length === 1, 'flat plan must contain exactly one release-presentation boundary');
  assert(boundaries[0].file === RELEASE_OWNER, 'release-presentation boundary must replace only v40-release.js transport');
  assert(boundaries[0].tier === 1, 'release-presentation boundary must remain inside tier 1');

  const tier1Steps = plan.filter(step => step.tier === 1);
  const tier2Steps = plan.filter(step => step.tier === 2);
  assert(tier1Steps.length === 45, 'flat plan must preserve 45 symbolic tier-1 positions');
  assert(tier2Steps.length === 41, 'flat plan must preserve all 41 tier-2 scripts');

  assert(plan.slice(0,45).every(step => step.tier === 1), 'all tier-1 positions must precede tier 2');
  assert(plan.slice(45).every(step => step.tier === 2), 'all tier-2 positions must follow the complete tier-1 chain');

  const manifestTier1 = loaderManifest.tiers.find(row => row.source === 'site/config.js');
  const manifestTier2 = loaderManifest.tiers.find(row => row.source === 'site/v40-release.js');
  const symbolic = plan.map(step => step.file);
  const expected = [
    ...manifestTier1.entries.map(entry => fileOf(entry.src)),
    ...manifestTier2.entries.map(entry => fileOf(entry.src))
  ];
  assert(JSON.stringify(symbolic) === JSON.stringify(expected), 'flat symbolic order must exactly preserve the accepted 45 -> 41 manifest order');

  for (const step of tier1Steps){
    if (step.kind === 'script') {
      assert(step.parent === 'body', `${step.file}: tier-1 script parent must remain body`);
      assert(step.dataKey === null, `${step.file}: tier-1 script must not gain a tier-2 data key`);
    }
    assert(step.async === false, `${step.file}: async=false contract must be preserved`);
  }

  for (const step of tier2Steps){
    assert(step.kind === 'script', `${step.file}: tier-2 entry must remain a script step`);
    assert(step.parent === 'head', `${step.file}: tier-2 script parent must remain head`);
    assert(step.async === false, `${step.file}: async=false contract must be preserved`);
    assert(/^data-[a-z0-9-]+$/.test(step.dataKey), `${step.file}: exact tier-2 duplicate-guard key is required`);
  }

  const positionByFile = new Map(plan.map(step => [step.file,step.position]));

  for (const row of authorityMap.entries){
    const current = positionByFile.get(row.file);
    assert(current > 45, `${row.file}: every mapped tier-2 owner must remain after all tier-1 positions`);

    for (const predecessor of row.requiresEarlier || []){
      const earlier = positionByFile.get(predecessor);
      assert(Number.isInteger(earlier) && earlier < current, `${row.file}: mapped predecessor ${predecessor} must remain earlier`);
    }

    for (const external of row.externalPredecessors || []){
      if (!external.startsWith('tier1:')) continue;
      const predecessor = external.slice('tier1:'.length);
      const earlier = positionByFile.get(predecessor);
      assert(Number.isInteger(earlier) && earlier <= 45 && earlier < current,
        `${row.file}: cross-tier predecessor ${predecessor} must remain in the completed tier-1 chain`);
    }
  }

  const releasePosition = positionByFile.get(RELEASE_OWNER);
  const v581aPosition = positionByFile.get('v581a-practice-cloud-result-reconciliation.js');
  assert(releasePosition === manifestTier1.entries.findIndex(entry => fileOf(entry.src) === RELEASE_OWNER) + 1,
    'release presentation boundary must preserve the original v40-release symbolic position');
  assert(v581aPosition > releasePosition && v581aPosition <= 45,
    'V581A must remain after the release-presentation boundary but before every tier-2 owner');

  return true;
}

async function executeFlatPlan(doc,plan,options = {}){
  assert(doc && doc.createElement && doc.head && doc.body, 'a live document with head/body is required');
  assert(Array.isArray(plan), 'flat plan is required');

  const trace = [];
  const onReleasePresentation = typeof options.onReleasePresentation === 'function'
    ? options.onReleasePresentation
    : null;

  for (const step of plan){
    if (step.kind === 'release-presentation-boundary'){
      trace.push({position:step.position,tier:step.tier,kind:'release-presentation-boundary',src:step.src,file:step.file,status:'boundary'});
      if (onReleasePresentation) await onReleasePresentation(step);
      continue;
    }

    if (step.tier === 2 && step.dataKey && doc.querySelector(`script[${step.dataKey}="1"]`)){
      trace.push({position:step.position,tier:step.tier,kind:'script',src:step.src,file:step.file,status:'skipped-existing',parent:step.parent,dataKey:step.dataKey});
      continue;
    }

    const script = doc.createElement('script');
    script.src = step.src;
    script.async = false;
    if (step.dataKey) script.setAttribute(step.dataKey,'1');

    const parent = step.parent === 'head' ? doc.head : doc.body;

    const result = await new Promise(resolve => {
      script.addEventListener('load',() => resolve({status:'loaded'}),{once:true});
      script.addEventListener('error',() => resolve({status:'error'}),{once:true});
      parent.appendChild(script);
    });

    trace.push({
      position:step.position,
      tier:step.tier,
      kind:'script',
      src:step.src,
      file:step.file,
      status:result.status,
      parent:step.parent,
      dataKey:step.dataKey
    });
  }

  return trace;
}

const api = Object.freeze({
  RELEASE_OWNER,
  cleanSrc,
  fileOf,
  buildFlatPlan,
  validateFlatPlan,
  executeFlatPlan
});

if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') {
  Object.defineProperty(window,'Phase7DFlatLoaderPrototype',{
    value:api,
    writable:false,
    configurable:false
  });
}
