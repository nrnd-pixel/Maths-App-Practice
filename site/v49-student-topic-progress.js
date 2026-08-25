/* V4.9B — Student Topic Progress.
   Read-only drill-down for the existing secure My Progress topic cards.
   Reuses already-rendered mastery/evidence, topic-specific improvement milestone,
   and recent Practice activity. No second progress request or recalculation. */
(() => {
  'use strict';

  const STYLE_ID = 'v49b-topic-progress-style';
  const PANEL_ID = 'v49b-topic-progress-panel';
  const SNAPSHOT_ID = 'v49a-progress-snapshot';
  const ROOT_IDS = ['student-progress-strengths','student-progress-focus'];
  const RECENT_ID = 'student-progress-recent';
  const MILESTONE_ID = 'student-motivation-milestone';

  let selectedTopic = '';
  let queued = false;

  function text(value){ return String(value ?? '').replace(/\s+/g,' ').trim(); }
  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .v49b-topic-actions{margin-top:10px;display:flex;justify-content:flex-start}
      .v49b-topic-open{min-height:36px;padding:7px 11px;font-size:12px}
      #${PANEL_ID}{margin:0 0 18px;padding:15px;border:1px solid var(--border);border-radius:18px;background:var(--card);scroll-margin-top:78px}
      #${PANEL_ID}.hidden{display:none!important}
      #${PANEL_ID} .v49b-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
      #${PANEL_ID} h2{margin:0 0 4px;font-size:20px}
      #${PANEL_ID} .v49b-sub{margin:0;color:var(--muted);font-size:12px;line-height:1.45}
      #${PANEL_ID} .v49b-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:12px}
      #${PANEL_ID} .v49b-stat{border:1px solid var(--border);border-radius:13px;padding:11px;background:color-mix(in srgb,var(--soft) 18%,var(--card))}
      #${PANEL_ID} .v49b-stat small{display:block;color:var(--muted);font-size:11px;font-weight:700;margin-bottom:5px}
      #${PANEL_ID} .v49b-stat strong{display:block;line-height:1.3;overflow-wrap:anywhere}
      #${PANEL_ID} .v49b-section{margin-top:12px;border-top:1px solid var(--border);padding-top:12px}
      #${PANEL_ID} .v49b-section h3{margin:0 0 7px;font-size:15px}
      #${PANEL_ID} .v49b-improvement{padding:10px 11px;border:1px solid color-mix(in srgb,var(--success) 32%,var(--border));border-radius:12px;background:var(--successbg);line-height:1.45}
      #${PANEL_ID} .v49b-recent{display:grid;gap:7px}
      #${PANEL_ID} .v49b-recent-item{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border:1px solid var(--border);border-radius:11px;padding:9px 10px}
      #${PANEL_ID} .v49b-recent-item .help{margin-top:2px}
      #${PANEL_ID} .v49b-empty{color:var(--muted);font-size:12px;line-height:1.45}
      #${PANEL_ID} .v49b-note{margin-top:10px;color:var(--muted);font-size:11px;line-height:1.45}
      @media(max-width:700px){#${PANEL_ID}{scroll-margin-top:70px}#${PANEL_ID} .v49b-summary{grid-template-columns:1fr}#${PANEL_ID} .v49b-recent-item{display:block}}
    `;
    document.head.appendChild(style);
  }

  function topicFromCard(card){ return text(card?.querySelector('.row strong')?.textContent); }
  function stateFromCard(card){ return text(card?.querySelector('.tag')?.textContent) || 'Learning evidence'; }
  function percentFromCard(card){
    return [...(card?.querySelectorAll('strong') || [])].map(node => text(node.textContent)).find(value => /^\d+(?:\.\d+)?%$/.test(value)) || '—';
  }
  function evidenceFromCard(card){
    const helps = [...(card?.querySelectorAll('.help') || [])].map(node => text(node.textContent));
    return helps.find(value => /scored response/i.test(value)) || 'No scored-response count available';
  }
  function interpretation(state){
    const s = text(state).toLowerCase();
    if (s.includes('secure')) return 'Strong current performance. Keep using this topic so the skill stays secure.';
    if (s.includes('needs attention')) return 'This is a useful topic to prioritise next.';
    if (s.includes('developing')) return 'Keep practising to build consistency.';
    return 'More scored work will make this topic picture clearer.';
  }

  function milestoneFor(topic){
    const root = document.getElementById(MILESTONE_ID);
    if (!root || root.classList.contains('hidden')) return null;
    const full = text(root.textContent);
    if (!full || !topic || !full.toLowerCase().includes(topic.toLowerCase())) return null;
    const match = full.match(/from\s+(\d+(?:\.\d+)?)%\s+to\s+(\d+(?:\.\d+)?)%/i);
    if (!match) return {text:full};
    const previous = Number(match[1]);
    const recent = Number(match[2]);
    const gain = recent - previous;
    return {text:full,previous,recent,gain:Number.isFinite(gain)?gain:null};
  }

  function recentPracticeFor(topic){
    const root = document.getElementById(RECENT_ID);
    if (!root || !topic) return [];
    return [...root.querySelectorAll('.student-insight-activity')].map(item => {
      const strongs = [...item.querySelectorAll('strong')].map(node => text(node.textContent)).filter(Boolean);
      const helps = [...item.querySelectorAll('.help')].map(node => text(node.textContent)).filter(Boolean);
      return {title:strongs[0]||'',result:strongs[1]||'',detail:helps[0]||''};
    }).filter(row => row.title.toLowerCase() === topic.toLowerCase() && /\bPractice\b/i.test(row.detail)).slice(0,3);
  }

  function findCard(topic){
    for (const id of ROOT_IDS){
      const root = document.getElementById(id);
      const card = [...(root?.querySelectorAll('.insight-card') || [])].find(node => topicFromCard(node).toLowerCase() === topic.toLowerCase());
      if (card) return card;
    }
    return null;
  }

  function ensurePanel(){
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    const anchor = document.getElementById(SNAPSHOT_ID) || document.getElementById('student-dashboard-summary');
    if (!anchor) return null;
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'hidden';
    panel.setAttribute('aria-label','Topic progress details');
    anchor.insertAdjacentElement('afterend',panel);
    return panel;
  }

  function renderPanel(topic){
    const panel = ensurePanel();
    const card = findCard(topic);
    if (!panel || !card){ panel?.classList.add('hidden'); return; }
    const state = stateFromCard(card);
    const percent = percentFromCard(card);
    const evidence = evidenceFromCard(card);
    const milestone = milestoneFor(topic);
    const recent = recentPracticeFor(topic);
    const improvementHtml = milestone
      ? `<div class="v49b-improvement"><strong>📈 Existing improvement milestone</strong><div style="margin-top:4px">${escapeHtml(milestone.text)}</div>${Number.isFinite(milestone.gain)&&milestone.gain>0?`<div class="help" style="margin-top:4px">Improvement shown by the existing milestone: +${Math.round(milestone.gain)} percentage points.</div>`:''}</div>`
      : '<div class="v49b-empty">No current topic-specific improvement milestone is recorded for this topic.</div>';
    const recentHtml = recent.length
      ? recent.map(row => `<div class="v49b-recent-item"><div><strong>${escapeHtml(row.title)}</strong><div class="help">${escapeHtml(row.detail)}</div></div><strong>${escapeHtml(row.result||'Completed')}</strong></div>`).join('')
      : '<div class="v49b-empty">No matching recent Practice activity is visible in the current Recent Activity list.</div>';

    panel.innerHTML = `
      <div class="v49b-head"><div><h2>📚 ${escapeHtml(topic)}</h2><p class="v49b-sub">Topic progress using the same secure evidence already shown on My Progress.</p></div><button id="v49b-topic-close" class="outline" type="button">Close topic</button></div>
      <div class="v49b-summary"><div class="v49b-stat"><small>Current state</small><strong>${escapeHtml(state)}</strong></div><div class="v49b-stat"><small>Current mastery</small><strong>${escapeHtml(percent)}</strong></div><div class="v49b-stat"><small>Evidence</small><strong>${escapeHtml(evidence)}</strong></div></div>
      <div class="v49b-section"><h3>What this means</h3><div>${escapeHtml(interpretation(state))}</div></div>
      <div class="v49b-section"><h3>Improvement</h3>${improvementHtml}</div>
      <div class="v49b-section"><h3>Recent Practice in this topic</h3><div class="v49b-recent">${recentHtml}</div></div>
      <div class="v49b-note">Topic mastery may include scored evidence from Practice and Exam work. The recent list above only mirrors matching Practice items already visible in Recent Activity; it does not reconstruct hidden or paper-level Exam topic history.</div>
    `;
    panel.classList.remove('hidden');
    document.getElementById('v49b-topic-close')?.addEventListener('click',()=>{selectedTopic='';panel.classList.add('hidden');});
  }

  function openTopic(topic){
    selectedTopic = topic;
    renderPanel(topic);
    document.getElementById(PANEL_ID)?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function decorateCards(){
    ROOT_IDS.forEach(id => {
      const root = document.getElementById(id);
      root?.querySelectorAll('.insight-card').forEach(card => {
        const topic = topicFromCard(card);
        if (!topic || card.querySelector('.v49b-topic-open')) return;
        const actions = document.createElement('div');
        actions.className = 'v49b-topic-actions';
        const button = document.createElement('button');
        button.className = 'outline v49b-topic-open';
        button.type = 'button';
        button.textContent = 'View topic progress';
        button.setAttribute('aria-label',`View topic progress for ${topic}`);
        button.addEventListener('click',()=>openTopic(topic));
        actions.appendChild(button);
        card.appendChild(actions);
      });
    });
    if (selectedTopic) renderPanel(selectedTopic);
  }

  function schedule(){
    if (queued) return;
    queued = true;
    requestAnimationFrame(()=>{queued=false;decorateCards();});
  }

  function observe(){
    ROOT_IDS.concat([RECENT_ID,MILESTONE_ID]).forEach(id => {
      const root = document.getElementById(id);
      if (!root || root.dataset.v49bTopicWatch === '1') return;
      root.dataset.v49bTopicWatch = '1';
      const options = {childList:true,subtree:true,characterData:true};
      if (id === MILESTONE_ID){ options.attributes = true; options.attributeFilter = ['class']; }
      new MutationObserver(schedule).observe(root,options);
    });
  }

  function wire(){
    injectStyles();
    observe();
    ensurePanel();
    schedule();
    document.getElementById('my-progress-btn')?.addEventListener('click',()=>{setTimeout(()=>{observe();schedule();},80);setTimeout(schedule,350);});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
