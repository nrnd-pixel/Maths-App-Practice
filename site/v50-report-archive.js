/* V5.0C3B — Teacher Report Archive.
   Saves immutable structured Class/Student report snapshots to the teacher-owned
   report_archives table. Snapshots remain until the creating teacher deletes
   them. Student-facing flows and report calculations are unchanged. */
(() => {
  'use strict';

  if (window.__v50ReportArchiveInstalled) return;
  window.__v50ReportArchiveInstalled = true;

  const TAB_ID = 'v50c3b-report-archive-tab';
  const PANEL_ID = 'report-archive-panel';
  const COUNT_ID = 'v50c3b-report-archive-count';
  const FEEDBACK_ID = 'v50c3b-report-archive-feedback';
  const LIST_ID = 'v50c3b-report-archive-body';
  const FILTER_ID = 'v50c3b-report-archive-filter';
  const SEARCH_ID = 'v50c3b-report-archive-search';
  const CLASS_SAVE_ID = 'v50c3b-save-class-report';
  const STUDENT_SAVE_ID = 'v50c3b-save-student-report';
  const STYLE_ID = 'v50c3b-report-archive-style';
  let archiveRows = [];
  let loading = false;

  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');

  function cloudAvailable(){
    try { return !!cloudReady && !!cloud && !!teacherUser; }
    catch { return false; }
  }

  function reportingApi(){ return window.V50ReportingExport || null; }

  function injectStyles(){
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} .v50c3b-retention{margin:14px 0}
      #${PANEL_ID} .v50c3b-type{font-weight:800}
      #${PANEL_ID} .v50c3b-actions{display:flex;gap:7px;flex-wrap:wrap}
      #${PANEL_ID} .v50c3b-actions button{min-height:36px;padding:7px 10px;font-size:12px}
      #${PANEL_ID} .v50c3b-title{white-space:normal;min-width:220px}
      #${PANEL_ID} .v50c3b-scope{white-space:normal;min-width:180px;max-width:300px}
      #${PANEL_ID} .v50c3b-date{white-space:nowrap}
      #${CLASS_SAVE_ID},#${STUDENT_SAVE_ID}{white-space:nowrap}
    `;
    document.head.appendChild(style);
  }

  function ensureArchivePanel(){
    const tabs = document.querySelector('#teacher .tabs');
    const analyticsPanel = byId('analytics-panel');
    if (!tabs || !analyticsPanel) return;

    let tab = byId(TAB_ID);
    if (!tab){
      tab = document.createElement('button');
      tab.id = TAB_ID;
      tab.type = 'button';
      tab.className = 'tab';
      tab.dataset.panel = PANEL_ID;
      tab.innerHTML = `Report Archive <span id="${COUNT_ID}" class="tag">0</span>`;
      const analyticsTab = tabs.querySelector('[data-panel="analytics-panel"]');
      analyticsTab?.insertAdjacentElement('afterend',tab);
    }

    if (!byId(PANEL_ID)){
      const panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.className = 'panel';
      panel.innerHTML = `
        <div class="header">
          <div><h2>Report Archive</h2><p class="muted">Saved Class and Student Performance Report snapshots.</p></div>
          <button id="v50c3b-refresh-archive" class="secondary" type="button">Refresh Archive</button>
        </div>
        <div class="info v50c3b-retention"><strong>Retention:</strong> archived reports are private to the teacher account that saved them and remain stored until that teacher deletes them. V5.0C3B does not automatically purge archives.</div>
        <div id="${FEEDBACK_ID}" class="feedback hidden" aria-live="polite"></div>
        <div class="teachertools">
          <select id="${FILTER_ID}" aria-label="Filter archived reports"><option value="all">All report types</option><option value="class">Class reports</option><option value="student">Student reports</option></select>
          <input id="${SEARCH_ID}" type="search" placeholder="Search report, class, student or ID" aria-label="Search archived reports">
        </div>
        <div class="tablewrap">
          <table>
            <thead><tr><th>Saved</th><th>Type</th><th>Report</th><th>Scope</th><th>Records</th><th>Actions</th></tr></thead>
            <tbody id="${LIST_ID}"><tr><td colspan="6" class="empty">Open Report Archive to load saved reports.</td></tr></tbody>
          </table>
        </div>
      `;
      analyticsPanel.insertAdjacentElement('afterend',panel);
    }
  }

  function feedback(kind,message){
    const root = byId(FEEDBACK_ID);
    if (!root) return;
    root.className = `feedback ${kind}`;
    root.textContent = message;
    root.classList.remove('hidden');
  }

  function clearFeedback(){ byId(FEEDBACK_ID)?.classList.add('hidden'); }

  function formatDate(value){
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
  }

  function scopeText(row){
    const scope = row.scope && typeof row.scope === 'object' ? row.scope : {};
    const parts = [scope.period,scope.className,scope.year,scope.mode].filter(Boolean);
    if (scope.search) parts.push(`Search: ${scope.search}`);
    return parts.join(' · ') || 'Saved report scope';
  }

  function visibleArchiveRows(){
    const filter = byId(FILTER_ID)?.value || 'all';
    const search = String(byId(SEARCH_ID)?.value || '').trim().toLowerCase();
    return archiveRows.filter(row=>{
      if (filter !== 'all' && row.report_type !== filter) return false;
      if (!search) return true;
      return [row.title,row.subject_name,row.class_name,row.student_name,row.student_id,scopeText(row)]
        .some(value=>String(value||'').toLowerCase().includes(search));
    });
  }

  function renderArchives(){
    const body = byId(LIST_ID);
    if (!body) return;
    const rows = visibleArchiveRows();
    const count = byId(COUNT_ID);
    if (count) count.textContent = String(archiveRows.length);

    if (!rows.length){
      body.innerHTML = `<tr><td colspan="6" class="empty">${archiveRows.length?'No archived reports match these filters.':'No reports have been archived yet.'}</td></tr>`;
      return;
    }

    body.innerHTML = rows.map(row=>`
      <tr>
        <td class="v50c3b-date">${esc(formatDate(row.created_at))}</td>
        <td><span class="tag v50c3b-type">${row.report_type==='student'?'Student':'Class'}</span></td>
        <td class="v50c3b-title"><strong>${esc(row.title||'Archived report')}</strong><div class="help">${esc(row.subject_name||'')}</div></td>
        <td class="v50c3b-scope">${esc(scopeText(row))}</td>
        <td>${Number(row.record_count||0)}</td>
        <td><div class="v50c3b-actions"><button class="outline" type="button" data-archive-download="${esc(row.id)}">Download CSV</button><button class="danger" type="button" data-archive-delete="${esc(row.id)}">Delete</button></div></td>
      </tr>
    `).join('');
  }

  async function loadArchives(){
    if (loading) return;
    clearFeedback();
    if (!cloudAvailable()){
      archiveRows = [];
      renderArchives();
      feedback('try','Sign in as a teacher with cloud access to use Report Archive.');
      return;
    }
    loading = true;
    try {
      const {data,error} = await cloud
        .from('report_archives')
        .select('id,report_type,title,subject_name,class_name,student_id,student_name,scope,record_count,snapshot_version,retention_policy,created_at')
        .order('created_at',{ascending:false})
        .limit(250);
      if (error) throw error;
      archiveRows = Array.isArray(data) ? data : [];
      renderArchives();
    } catch (error){
      console.warn('Could not load report archive.',error);
      archiveRows = [];
      renderArchives();
      feedback('incorrect',`Report Archive could not be loaded. ${error?.message||''}`.trim());
    } finally {
      loading = false;
    }
  }

  function snapshotFor(kind){
    const api = reportingApi();
    if (!api) return null;
    return kind==='student' ? api.buildStudentSnapshot() : api.buildClassSnapshot();
  }

  async function saveSnapshot(kind,button){
    if (!cloudAvailable()){
      alert('Sign in as a teacher with cloud access before archiving a report.');
      return;
    }
    const snapshot = snapshotFor(kind);
    if (!snapshot || !Array.isArray(snapshot.headers) || !Array.isArray(snapshot.records)){
      alert('This report snapshot is not available yet. Refresh Analytics and try again.');
      return;
    }
    if (snapshot.records.length > 5000){
      alert('This report is too large to archive safely in one snapshot. Narrow the Analytics scope and try again.');
      return;
    }

    const original = button?.textContent || 'Save to Archive';
    if (button){ button.disabled = true; button.textContent = 'Saving…'; }
    try {
      const payload = {
        report_type:snapshot.reportType,
        title:snapshot.title,
        subject_name:snapshot.subjectName || null,
        class_name:snapshot.className || null,
        student_id:snapshot.studentId || null,
        student_name:snapshot.studentName || null,
        scope:snapshot.scope || {},
        snapshot:{
          schema_version:1,
          generated_at:snapshot.generatedAt,
          filename:snapshot.filename,
          headers:snapshot.headers,
          records:snapshot.records
        },
        record_count:snapshot.records.length,
        snapshot_version:1,
        retention_policy:'manual_delete'
      };
      const {error} = await cloud.from('report_archives').insert(payload);
      if (error) throw error;
      if (button) button.textContent = 'Saved ✓';
      await loadArchives();
      setTimeout(()=>{ if (button && document.contains(button)) button.textContent = original; },1400);
    } catch (error){
      console.warn('Could not archive report.',error);
      alert(`Report could not be archived. ${error?.message||''}`.trim());
      if (button) button.textContent = original;
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function downloadArchive(id){
    if (!cloudAvailable()) return;
    const api = reportingApi();
    if (!api) return;
    try {
      const {data,error} = await cloud
        .from('report_archives')
        .select('title,snapshot,snapshot_version')
        .eq('id',id)
        .single();
      if (error) throw error;
      if (Number(data?.snapshot_version||0)!==1) throw new Error('Unsupported archived snapshot version.');
      const snapshot = data?.snapshot || {};
      if (!Array.isArray(snapshot.headers) || !Array.isArray(snapshot.records)) throw new Error('Archived snapshot is incomplete.');
      api.downloadSnapshot({
        filename:snapshot.filename || `${data.title||'Archived Performance Report'}.csv`,
        headers:snapshot.headers,
        records:snapshot.records
      });
    } catch (error){
      console.warn('Could not download archived report.',error);
      feedback('incorrect',`Archived report could not be downloaded. ${error?.message||''}`.trim());
    }
  }

  async function deleteArchive(id){
    if (!cloudAvailable()) return;
    const row = archiveRows.find(item=>String(item.id)===String(id));
    const label = row?.title || 'this archived report';
    if (!confirm(`Delete ${label}? This removes only the saved snapshot and does not change student results.`)) return;
    try {
      const {error} = await cloud.from('report_archives').delete().eq('id',id);
      if (error) throw error;
      archiveRows = archiveRows.filter(item=>String(item.id)!==String(id));
      renderArchives();
      feedback('correct','Archived report deleted. Student results and live Analytics were not changed.');
    } catch (error){
      console.warn('Could not delete archived report.',error);
      feedback('incorrect',`Archived report could not be deleted. ${error?.message||''}`.trim());
    }
  }

  function insertSaveButton(anchorId,buttonId,kind){
    const anchor = byId(anchorId);
    if (!anchor || byId(buttonId)) return;
    const button = document.createElement('button');
    button.id = buttonId;
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = 'Save to Archive';
    button.title = 'Save an immutable teacher-only snapshot of this report';
    button.addEventListener('click',()=>saveSnapshot(kind,button));
    anchor.insertAdjacentElement('beforebegin',button);
  }

  function ensureReportButtons(){
    insertSaveButton('v50c3a-export-class-csv',CLASS_SAVE_ID,'class');
    if (!byId(CLASS_SAVE_ID)) insertSaveButton('v50c1-print',CLASS_SAVE_ID,'class');
    insertSaveButton('v50c3a-export-student-csv',STUDENT_SAVE_ID,'student');
    if (!byId(STUDENT_SAVE_ID)) insertSaveButton('v50c2-print',STUDENT_SAVE_ID,'student');
  }

  function activateArchive(){
    const tab = byId(TAB_ID);
    const panel = byId(PANEL_ID);
    if (!tab || !panel) return;
    document.querySelectorAll('#teacher .tab').forEach(item=>item.classList.remove('active'));
    document.querySelectorAll('#teacher .panel').forEach(item=>item.classList.remove('active'));
    tab.classList.add('active');
    panel.classList.add('active');
    loadArchives();
  }

  function wireArchivePanel(){
    ensureArchivePanel();
    const tabs = document.querySelector('#teacher .tabs');
    tabs?.addEventListener('click',event=>{
      const clicked = event.target.closest('.tab');
      if (!clicked) return;
      if (clicked.id===TAB_ID){
        event.preventDefault();
        activateArchive();
      } else {
        byId(TAB_ID)?.classList.remove('active');
        byId(PANEL_ID)?.classList.remove('active');
      }
    });
    byId('v50c3b-refresh-archive')?.addEventListener('click',loadArchives);
    byId(FILTER_ID)?.addEventListener('change',renderArchives);
    byId(SEARCH_ID)?.addEventListener('input',renderArchives);
    byId(LIST_ID)?.addEventListener('click',event=>{
      const download = event.target.closest('[data-archive-download]');
      if (download){ downloadArchive(download.dataset.archiveDownload); return; }
      const remove = event.target.closest('[data-archive-delete]');
      if (remove) deleteArchive(remove.dataset.archiveDelete);
    });
  }

  function wire(){
    injectStyles();
    wireArchivePanel();
    ensureReportButtons();
    const observer = new MutationObserver(()=>ensureReportButtons());
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
