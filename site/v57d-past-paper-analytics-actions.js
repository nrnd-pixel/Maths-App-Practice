/* V5.7D — Past Paper Analytics Actions.
   Turns the accepted V5.6D read-only analytics into safe teacher next steps.
   This layer never creates an assignment by itself: it prepares the existing
   V5.6B assignment form for a data-derived cohort, opens V5.7B management, or
   copies a teaching focus plan. Exam Mode, grading and answer data are unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v57dPastPaperAnalyticsActionsInstalled) return;
  ROOT.__v57dPastPaperAnalyticsActionsInstalled = true;

  const RPC_NAME = 'get_teacher_past_paper_analytics_v56d';
  const PANEL_ID = 'v57d-analytics-actions';
  const STYLE_ID = 'v57d-analytics-actions-style';
  const FEEDBACK_ID = 'v57d-analytics-actions-feedback';
  const FIRST_TRY_SUPPORT_THRESHOLD = 60;
  const MASTERY_SUPPORT_THRESHOLD = 70;

  let currentData = null;
  let currentSignature = '';
  let loading = false;
  let refreshTimer = 0;
  let renderNonce = 0;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const html = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const pct = value => Number.isFinite(Number(value)) ? `${Math.round(Number(value))}%` : '—';

  function paperKey(examYear,paper){
    return `${Number(examYear)||0}|${norm(paper)}`;
  }

  function latestMetric(row,key){
    const value = Number(row?.latest_session?.[key]);
    return Number.isFinite(value) ? value : null;
  }

  function hasUnfinishedTeacherAssignment(row){
    const status = norm(row?.teacher_assignment?.status);
    return !!row?.teacher_assignment && status !== 'completed';
  }

  function unassignedCandidate(row){
    return row?.progress_status !== 'completed' && !row?.teacher_assignment;
  }

  function supportCandidate(row){
    if (Number(row?.session_count || 0) < 1) return false;
    if (hasUnfinishedTeacherAssignment(row)) return false;
    const first = latestMetric(row,'first_try_percent');
    const mastery = latestMetric(row,'mastery_percent');
    return (first !== null && first < FIRST_TRY_SUPPORT_THRESHOLD)
      || (mastery !== null && mastery < MASTERY_SUPPORT_THRESHOLD);
  }

  function weakQuestions(rows,limit=5){
    return Array.from(rows || [])
      .filter(row => Number(row?.attempts || 0) > 0 && Number.isFinite(Number(row?.first_try_percent)))
      .sort((a,b)=>Number(a.first_try_percent)-Number(b.first_try_percent)
        || Number(a.mastery_percent ?? 101)-Number(b.mastery_percent ?? 101)
        || String(a.question_number||'').localeCompare(String(b.question_number||''),undefined,{numeric:true}))
      .slice(0,limit);
  }

  function weakTopics(rows,limit=5){
    return Array.from(rows || [])
      .filter(row => Number(row?.attempts || 0) > 0 && Number.isFinite(Number(row?.first_try_percent)))
      .sort((a,b)=>Number(a.first_try_percent)-Number(b.first_try_percent)
        || Number(a.mastery_percent ?? 101)-Number(b.mastery_percent ?? 101)
        || trim(a.topic).localeCompare(trim(b.topic)))
      .slice(0,limit);
  }

  function cohortsFromData(data){
    const students = Array.from(data?.students || []);
    return {
      unassigned:students.filter(unassignedCandidate),
      support:students.filter(supportCandidate),
      assigned:students.filter(row=>!!row?.teacher_assignment)
    };
  }

  function focusPlanText(data){
    const selected = data?.selected || {};
    const cls = data?.class || {};
    const summary = data?.summary || {};
    const cohorts = cohortsFromData(data);
    const questions = weakQuestions(data?.questions,5);
    const topics = weakTopics(data?.topics,5);
    const lines = [
      `Past Paper Action Plan — ${trim(cls.class_name)||'Class'} — ${Number(selected.exam_year)||''} ${trim(selected.paper)}`.trim(),
      '',
      `Class coverage: ${Number(summary.completed_students||0)}/${Number(summary.total_students||0)} fully covered (${pct(summary.completion_percent)})`,
      `Latest class averages: ${pct(summary.average_first_try_percent)} first try · ${pct(summary.average_mastery_percent)} mastery`,
      `Unassigned incomplete learners: ${cohorts.unassigned.length}`,
      `Support re-practice learners: ${cohorts.support.length}`,
      ''
    ];

    if (cohorts.unassigned.length){
      lines.push('Unassigned incomplete learners:');
      cohorts.unassigned.forEach(row=>lines.push(`- ${trim(row.student_name)} (${trim(row.student_id)}) · ${Number(row.questions_practised||0)}/${Number(row.available_questions||0)} covered`));
      lines.push('');
    }

    if (cohorts.support.length){
      lines.push(`Support re-practice (<${FIRST_TRY_SUPPORT_THRESHOLD}% first try or <${MASTERY_SUPPORT_THRESHOLD}% mastery):`);
      cohorts.support.forEach(row=>lines.push(`- ${trim(row.student_name)} (${trim(row.student_id)}) · ${pct(row?.latest_session?.first_try_percent)} first try · ${pct(row?.latest_session?.mastery_percent)} mastery`));
      lines.push('');
    }

    if (questions.length){
      lines.push('Weakest questions:');
      questions.forEach(row=>lines.push(`- Q${trim(row.question_number)} · ${pct(row.first_try_percent)} first try · ${pct(row.mastery_percent)} mastery · ${trim(row.topic||'Other')} · ${trim(row.skill||'Unclassified')}`));
      lines.push('');
    }

    if (topics.length){
      lines.push('Topic & skill focus:');
      topics.forEach(row=>lines.push(`- ${trim(row.topic||'Other')} · ${trim(row.skill||'Unclassified')} · ${pct(row.first_try_percent)} first try · ${pct(row.mastery_percent)} mastery`));
    }

    return lines.join('\n').trim();
  }

  function selectionFromUi(){
    if (typeof document === 'undefined') return null;
    const classId = trim(document.getElementById('v56d-class')?.value);
    const option = document.getElementById('v56d-paper')?.selectedOptions?.[0];
    const examYear = Number(option?.dataset?.year || 0);
    const paper = trim(option?.dataset?.paper);
    if (!classId || !examYear || !paper) return null;
    return {classId,examYear,paper,signature:`${classId}|${paperKey(examYear,paper)}`};
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}{margin:14px 0 18px;border:1px solid color-mix(in srgb,var(--primary) 32%,var(--border));border-radius:15px;padding:13px;background:color-mix(in srgb,var(--soft) 24%,var(--card))}
      #${PANEL_ID} .v57d-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
      #${PANEL_ID} .v57d-head h3{margin:0 0 4px;font-size:17px}
      #${PANEL_ID} .v57d-head p{margin:0;color:var(--muted);font-size:11px;line-height:1.45}
      #${PANEL_ID} .v57d-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:11px}
      #${PANEL_ID} .v57d-card{border:1px solid var(--border);border-radius:12px;padding:11px;background:var(--card);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}
      #${PANEL_ID} .v57d-card strong{display:block;margin-bottom:3px}
      #${PANEL_ID} .v57d-card p{margin:0;color:var(--muted);font-size:10px;line-height:1.4}
      #${PANEL_ID} .v57d-card button{min-height:38px;padding:7px 10px;font-size:11px;white-space:nowrap}
      #${PANEL_ID} .v57d-count{font-size:20px;font-weight:900;color:var(--primary);margin-right:5px}
      #${PANEL_ID} .v57d-safety{margin-top:10px;font-size:10px;line-height:1.4;color:var(--muted)}
      #${FEEDBACK_ID}{margin-top:9px;padding:9px 10px;border-radius:10px;font-size:11px;line-height:1.4}
      #${FEEDBACK_ID}.hidden{display:none!important}
      #${FEEDBACK_ID}.ok{background:var(--successbg);color:var(--success)}
      #${FEEDBACK_ID}.warn{background:var(--warnbg);color:var(--warn)}
      #v56b-past-paper-assignment-admin .v57d-prepared-note{margin:10px 0;padding:10px 12px;border:1px solid color-mix(in srgb,var(--primary) 32%,var(--border));border-radius:12px;background:color-mix(in srgb,var(--soft) 35%,var(--card));color:var(--primary);font-size:12px;font-weight:750;line-height:1.45}
      @media(max-width:760px){#${PANEL_ID} .v57d-grid{grid-template-columns:1fr}}
      @media(max-width:520px){#${PANEL_ID} .v57d-card{grid-template-columns:1fr}#${PANEL_ID} .v57d-card button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function setFeedback(message,kind='ok'){
    const node = document.getElementById(FEEDBACK_ID);
    if (!node) return;
    node.textContent = String(message || '');
    node.className = message ? kind : 'hidden';
  }

  function actionPanelHtml(data){
    const cohorts = cohortsFromData(data);
    const selected = data?.selected || {};
    const hasFocus = weakQuestions(data?.questions,5).length || weakTopics(data?.topics,5).length;
    return `
      <div class="v57d-head">
        <div><h3>🎯 Take action from this paper</h3><p>Turn the class evidence into a prepared Practice assignment or a teaching focus plan.</p></div>
        <span class="tag">V5.7D</span>
      </div>
      <div class="v57d-grid">
        <article class="v57d-card"><div><strong><span class="v57d-count">${cohorts.unassigned.length}</span>unassigned incomplete</strong><p>Not fully covered and no current teacher assignment for ${Number(selected.exam_year)} · ${html(selected.paper)}.</p></div><button type="button" class="primary" data-v57d-prepare="unassigned" ${cohorts.unassigned.length?'':'disabled'}>Prepare assignment</button></article>
        <article class="v57d-card"><div><strong><span class="v57d-count">${cohorts.support.length}</span>support re-practice</strong><p>Latest first try below ${FIRST_TRY_SUPPORT_THRESHOLD}% or mastery below ${MASTERY_SUPPORT_THRESHOLD}%; unfinished assignments are excluded.</p></div><button type="button" class="secondary" data-v57d-prepare="support" ${cohorts.support.length?'':'disabled'}>Prepare re-practice</button></article>
        <article class="v57d-card"><div><strong><span class="v57d-count">${cohorts.assigned.length}</span>teacher assigned</strong><p>Open the existing V5.7B manager to review completion, dates, close/reopen or reassign as new.</p></div><button type="button" class="outline" data-v57d-manage ${cohorts.assigned.length?'':'disabled'}>Manage assignments</button></article>
        <article class="v57d-card"><div><strong>📋 Teaching focus plan</strong><p>Copy the current coverage, support learners, weakest questions and topic/skill focus for lesson planning.</p></div><button type="button" class="outline" data-v57d-copy ${hasFocus?'':'disabled'}>Copy focus plan</button></article>
      </div>
      <div class="v57d-safety">Preparation only: V5.7D does not create or modify an assignment automatically. Review the students, session length and dates in the existing assignment form, then click <strong>Assign Past Paper Practice</strong> yourself.</div>
      <div id="${FEEDBACK_ID}" class="hidden" role="status" aria-live="polite"></div>`;
  }

  function decorate(data,nonce=renderNonce){
    if (typeof document === 'undefined' || !data?.selected) return false;
    injectStyles();
    const content = document.getElementById('v56d-content');
    const note = content?.querySelector('.v56d-note');
    if (!content || !note || !content.querySelector('.v56d-summary')) return false;
    let panel = document.getElementById(PANEL_ID);
    if (panel?.dataset?.v57dNonce === String(nonce)) return true;
    if (!panel){
      panel = document.createElement('section');
      panel.id = PANEL_ID;
      panel.setAttribute('aria-label','Past Paper analytics actions');
      note.insertAdjacentElement('afterend',panel);
    }
    panel.dataset.v57dNonce = String(nonce);
    panel.innerHTML = actionPanelHtml(data);
    return true;
  }

  async function refresh(force=false){
    if (loading || typeof document === 'undefined') return;
    const overlay = document.getElementById('v56d-past-paper-analytics-overlay');
    if (!overlay || overlay.classList.contains('hidden')) return;
    if (!document.querySelector('#v56d-content .v56d-summary')) return;
    const selected = selectionFromUi();
    if (!selected) return;
    if (!force && currentData && currentSignature === selected.signature){
      decorate(currentData,renderNonce);
      return;
    }
    if (typeof cloud === 'undefined' || !cloud?.rpc) return;
    loading = true;
    try {
      const {data,error} = await cloud.rpc(RPC_NAME,{
        p_class_id:selected.classId,
        p_exam_year:selected.examYear,
        p_paper:selected.paper
      });
      if (error) throw error;
      currentData = data || null;
      currentSignature = selected.signature;
      renderNonce += 1;
      decorate(currentData,renderNonce);
    } catch(error){
      console.warn('V5.7D analytics actions could not load teacher evidence.',error);
    } finally { loading = false; }
  }

  function scheduleRefresh(force=false,delay=140){
    if (typeof window === 'undefined') return;
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(()=>refresh(force),delay);
  }

  function waitFor(fn,tries=70,delay=80){
    return new Promise(resolve=>{
      let count=0;
      const tick=()=>{
        count += 1;
        let value=null;
        try { value=fn(); } catch {}
        if (value || count>=tries){ resolve(value||null); return; }
        window.setTimeout(tick,delay);
      };
      tick();
    });
  }

  function activateTeacherClass(classId){
    document.querySelector('.tab[data-panel="classes-panel"]')?.click();
    try {
      selectedClassId = classId;
      if (typeof renderClassAdmin === 'function') renderClassAdmin();
    } catch {}
    const button = [...document.querySelectorAll('.class-select[data-class-id]')]
      .find(node=>String(node.dataset.classId)===String(classId));
    button?.click();
  }

  function closeAnalytics(){
    document.getElementById('v56d-close')?.click();
  }

  function addPreparedNotice(section,count,label,data){
    section.querySelector('.v57d-prepared-note')?.remove();
    const note = document.createElement('div');
    note.className = 'v57d-prepared-note';
    note.textContent = `Prepared from Past Paper Analytics: ${count} ${label} selected for ${Number(data?.selected?.exam_year)||''} · ${trim(data?.selected?.paper)}. Review the session length and dates, then click Assign Past Paper Practice.`;
    section.querySelector('.v56b-grid')?.insertAdjacentElement('beforebegin',note);
  }

  async function prepareAssignment(rows,label){
    const data = currentData;
    const classId = trim(data?.class?.class_id);
    const selected = data?.selected || {};
    const ids = new Set(Array.from(rows || []).map(row=>String(row?.roster_student_id||'')).filter(Boolean));
    if (!classId || !selected.exam_year || !trim(selected.paper) || !ids.size){
      setFeedback('No eligible students are available for this action.','warn');
      return false;
    }

    closeAnalytics();
    activateTeacherClass(classId);

    const section = await waitFor(()=>document.getElementById('v56b-past-paper-assignment-admin'));
    const studentRoot = await waitFor(()=>{
      const root=document.getElementById('v56b-student-options');
      return root && String(root.dataset.classId)===String(classId) ? root : null;
    });
    const paper = await waitFor(()=>{
      const select=document.getElementById('v56b-paper');
      return select && [...select.options].some(option=>option.value===paperKey(selected.exam_year,selected.paper)) ? select : null;
    });

    if (!section || !studentRoot || !paper){
      window.alert('The Past Paper assignment form could not be prepared. Select the class in Classes & Assignments and try again.');
      return false;
    }

    const audience = document.getElementById('v56b-audience');
    if (audience){ audience.value='students'; audience.dispatchEvent(new Event('change',{bubbles:true})); }
    paper.value = paperKey(selected.exam_year,selected.paper);
    paper.dispatchEvent(new Event('change',{bubbles:true}));

    const scope = document.getElementById('v56b-scope');
    if (scope){ scope.value='quick'; scope.dispatchEvent(new Event('change',{bubbles:true})); }
    const count = document.getElementById('v56b-count');
    if (count && [...count.options].some(option=>Number(option.value)===5)){
      count.value='5'; count.dispatchEvent(new Event('change',{bubbles:true}));
    }

    let matched=0;
    studentRoot.querySelectorAll('input[type="checkbox"]').forEach(input=>{
      input.checked=ids.has(String(input.value));
      if (input.checked) matched += 1;
    });
    if (!matched){
      window.alert('The selected analytics students could not be matched to the current active roster.');
      return false;
    }

    document.getElementById('v56b-feedback')?.classList.add('hidden');
    addPreparedNotice(section,matched,label,data);
    section.scrollIntoView({behavior:'smooth',block:'start'});
    document.getElementById('v56b-closes')?.focus();
    return true;
  }

  async function manageAssignments(){
    const data=currentData;
    const classId=trim(data?.class?.class_id);
    if (!classId) return false;
    closeAnalytics();
    activateTeacherClass(classId);
    const api=ROOT.V57BTeacherAssignmentManagement;
    if (!api?.openOverlay){
      window.alert('Assignment management is not ready yet.');
      return false;
    }
    await Promise.resolve(api.openOverlay());
    const label=`${Number(data?.selected?.exam_year)||0} · ${trim(data?.selected?.paper)}`;
    window.setTimeout(()=>{
      const card=[...document.querySelectorAll('#v57b-assignment-management-overlay .v57b-card')]
        .find(node=>norm(node.querySelector('h3')?.textContent).includes(norm(label)));
      card?.scrollIntoView?.({behavior:'smooth',block:'center'});
    },180);
    return true;
  }

  async function copyText(text){
    if (navigator?.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
      return true;
    }
    const area=document.createElement('textarea');
    area.value=text;
    area.setAttribute('readonly','');
    area.style.position='fixed'; area.style.opacity='0';
    document.body.appendChild(area); area.select();
    const ok=document.execCommand?.('copy'); area.remove();
    return !!ok;
  }

  async function copyFocusPlan(){
    const text=focusPlanText(currentData);
    if (!text){ setFeedback('There is not enough Past Paper evidence to copy yet.','warn'); return false; }
    try {
      await copyText(text);
      setFeedback('Teaching focus plan copied to the clipboard.','ok');
      return true;
    } catch(error){
      console.warn('V5.7D focus plan copy failed.',error);
      setFeedback('Could not copy automatically. Try again or use your browser clipboard permissions.','warn');
      return false;
    }
  }

  function handleClick(event){
    const prepare=event.target?.closest?.('[data-v57d-prepare]');
    if (prepare){
      const cohorts=cohortsFromData(currentData);
      const key=prepare.dataset.v57dPrepare;
      if (key==='unassigned') void prepareAssignment(cohorts.unassigned,'unassigned incomplete learners');
      if (key==='support') void prepareAssignment(cohorts.support,'support re-practice learners');
      return;
    }
    if (event.target?.closest?.('[data-v57d-manage]')){ void manageAssignments(); return; }
    if (event.target?.closest?.('[data-v57d-copy]')){ void copyFocusPlan(); }
  }

  function install(){
    if (typeof document === 'undefined') return false;
    injectStyles();
    document.addEventListener('click',handleClick,true);
    document.addEventListener('click',event=>{
      if (event.target?.closest?.('#v56d-open-past-paper-analytics,#v56d-refresh')) scheduleRefresh(true,220);
    },true);
    document.addEventListener('change',event=>{
      if (event.target?.matches?.('#v56d-class,#v56d-paper')){
        currentSignature=''; currentData=null; scheduleRefresh(true,220);
      }
    });
    const content=document.getElementById('v56d-content');
    if (content && typeof MutationObserver!=='undefined'){
      new MutationObserver(()=>{
        if (!document.getElementById(PANEL_ID) && content.querySelector('.v56d-summary')) scheduleRefresh(false,80);
      }).observe(content,{childList:true,subtree:true});
    }
    const overlay=document.getElementById('v56d-past-paper-analytics-overlay');
    if (overlay && typeof MutationObserver!=='undefined'){
      new MutationObserver(()=>{
        if (!overlay.classList.contains('hidden')) scheduleRefresh(true,180);
      }).observe(overlay,{attributes:true,attributeFilter:['class']});
    }
    scheduleRefresh(false,300);
    return true;
  }

  const api=Object.freeze({
    RPC_NAME,FIRST_TRY_SUPPORT_THRESHOLD,MASTERY_SUPPORT_THRESHOLD,paperKey,
    latestMetric,unassignedCandidate,supportCandidate,cohortsFromData,
    weakQuestions,weakTopics,focusPlanText,prepareAssignment,manageAssignments
  });

  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V57DPastPaperAnalyticsActions',{value:api,writable:false,configurable:false});
    const start=()=>{
      if (document.getElementById('v56d-past-paper-analytics-overlay')) install();
      else window.setTimeout(start,100);
    };
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
    else start();
  }
})();
