/* Platform V0.1 — preview-only Year 4 launch credential preparation.
   Generates missing PINs for inactive classes only and keeps plaintext only in
   this page's in-memory response until the teacher copies/downloads it. */
(() => {
  'use strict';

  const host = String(location.hostname || '').toLowerCase();
  const isDeployPreview = host.startsWith('deploy-preview-') &&
    host.endsWith('--magical-pixie-a61111.netlify.app');
  if (!isDeployPreview) return;

  const YEAR_LEVEL = 4;
  const SECTION_ID = 'platform-v01-year-launch';
  const STYLE_ID = 'platform-v01-year-launch-style';
  let credentialRows = [];
  let credentialsSaved = false;
  let busy = false;

  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function cloudAvailable(){
    try { return !!cloudReady && !!cloud && !!teacherUser; }
    catch { return false; }
  }

  function injectStyles(){
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${SECTION_ID}{border:1px solid color-mix(in srgb,var(--primary) 30%,var(--border));background:color-mix(in srgb,var(--soft) 52%,var(--card))}
      #${SECTION_ID} .platform-launch-banner{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1px solid #ead47e;border-radius:13px;background:#fff8dc;color:#594500;margin:10px 0 14px;line-height:1.45}
      html[data-theme="dark"] #${SECTION_ID} .platform-launch-banner{background:#3a321a;color:#fff0aa;border-color:#796727}
      #${SECTION_ID} .platform-launch-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:12px 0}
      #${SECTION_ID} .platform-launch-card{border:1px solid var(--border);border-radius:14px;padding:13px;background:var(--card)}
      #${SECTION_ID} .platform-launch-card strong{display:block;font-size:17px;margin-bottom:5px}
      #${SECTION_ID} .platform-launch-meta{display:grid;gap:3px;color:var(--muted);font-size:12px;line-height:1.4}
      #${SECTION_ID} .platform-launch-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}
      #${SECTION_ID} .platform-launch-output{margin-top:14px;border-top:1px solid var(--border);padding-top:14px}
      #${SECTION_ID} .platform-launch-table{max-height:360px;overflow:auto;border:1px solid var(--border);border-radius:12px;margin-top:10px;background:var(--card)}
      #${SECTION_ID} .platform-launch-table table{width:100%;border-collapse:collapse;font-size:12px}
      #${SECTION_ID} .platform-launch-table th,#${SECTION_ID} .platform-launch-table td{padding:8px 9px;border-bottom:1px solid var(--border);text-align:left;white-space:nowrap}
      #${SECTION_ID} .platform-launch-table th{position:sticky;top:0;background:var(--card);z-index:1}
      #${SECTION_ID} .platform-launch-ready{color:var(--success);font-weight:850}
      #${SECTION_ID} .platform-launch-wait{color:var(--muted);font-weight:800}
      #${SECTION_ID} .platform-launch-danger{color:var(--danger);font-weight:850}
      #${SECTION_ID} .platform-launch-note{margin-top:9px;color:var(--muted);font-size:11px;line-height:1.45}
    `;
    document.head.appendChild(style);
  }

  function ensureSection(){
    injectStyles();
    const panel = byId('platform-v01-subject-access-panel');
    if (!panel) return null;

    let section = byId(SECTION_ID);
    if (section) return section;

    section = document.createElement('section');
    section.id = SECTION_ID;
    section.className = 'platform-v01-section';
    section.innerHTML = `
      <h3>Year 4 credential setup</h3>
      <p class="muted">Prepare Student IDs + PINs for the staged Year 4 Science launch without activating the classes.</p>
      <div class="platform-launch-banner">
        <span aria-hidden="true">🔐</span>
        <span><strong>One-time PIN list.</strong> Generate only when you are ready to save it. Plain PINs are shown only in the generation response; the database stores hashes. 4A and 4B remain inactive after generation.</span>
      </div>
      <div id="platform-v01-year-launch-status" class="platform-launch-grid"><div class="empty">Checking Year 4 setup…</div></div>
      <div class="platform-launch-actions">
        <button id="platform-v01-year-launch-generate" class="primary" type="button">Generate 6-digit Year 4 PINs</button>
        <button id="platform-v01-year-launch-refresh" class="secondary" type="button">Refresh status</button>
      </div>
      <p class="platform-launch-note">This step does not activate Year 4. Student access remains blocked until a later deliberate release step.</p>
      <div id="platform-v01-year-launch-output" class="platform-launch-output hidden" aria-live="polite"></div>
    `;

    const quick = panel.querySelector('.platform-v01-section');
    if (quick) panel.insertBefore(section,quick);
    else panel.appendChild(section);

    byId('platform-v01-year-launch-generate')?.addEventListener('click',generatePins);
    byId('platform-v01-year-launch-refresh')?.addEventListener('click',loadStatus);
    return section;
  }

  function renderStatus(payload){
    const root = byId('platform-v01-year-launch-status');
    if (!root) return;
    const rows = Array.isArray(payload?.classes) ? payload.classes : [];
    if (!rows.length) {
      root.innerHTML = '<div class="empty">No Year 4 class scaffolds were found.</div>';
      return;
    }

    root.innerHTML = rows.map(row => {
      const missing = Number(row.missing_pins || 0);
      const ready = row.credentials_ready === true;
      const subject = [row.maths_allowed?'Maths':'',row.science_allowed?'Science':''].filter(Boolean).join(' + ') || 'No subject';
      return `<div class="platform-launch-card">
        <strong>${esc(row.class_name)}</strong>
        <div class="platform-launch-meta">
          <span>${Number(row.active_students||0)} staged students</span>
          <span>${missing ? `${missing} PIN${missing===1?'':'s'} still missing` : 'All PIN hashes are set'}</span>
          <span>Future subjects: ${esc(subject)}</span>
          <span>Class status: ${row.active ? '<b class="platform-launch-danger">ACTIVE</b>' : '<b class="platform-launch-wait">Inactive</b>'}</span>
          <span class="${ready?'platform-launch-ready':'platform-launch-wait'}">${ready?'Credentials ready':'Credentials not ready'}</span>
        </div>
      </div>`;
    }).join('');

    const generate = byId('platform-v01-year-launch-generate');
    if (generate) {
      const missingTotal = rows.reduce((sum,row) => sum + Number(row.missing_pins||0),0);
      const anyActive = rows.some(row => row.active === true);
      generate.disabled = busy || missingTotal === 0 || anyActive;
      generate.textContent = missingTotal > 0
        ? `Generate ${missingTotal} Year 4 PIN${missingTotal===1?'':'s'} (6 digits)`
        : 'Year 4 PINs already generated';
    }
  }

  async function loadStatus(){
    ensureSection();
    const root = byId('platform-v01-year-launch-status');
    if (!cloudAvailable()) {
      if (root) root.innerHTML='<div class="empty">Sign in as a teacher to view Year 4 launch readiness.</div>';
      return;
    }
    try {
      const { data, error } = await cloud.rpc('teacher_year_launch_overview_v01', { p_year_level:YEAR_LEVEL });
      if (error) throw error;
      renderStatus(data || { classes:[] });
    } catch (error) {
      console.warn('Could not load Year 4 launch status.',error);
      if (root) root.innerHTML=`<div class="empty">Year 4 setup could not be loaded. ${esc(error?.message||'')}</div>`;
    }
  }

  function csvEscape(value){
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"','""')}"` : text;
  }

  function credentialsCsv(){
    const lines = [['Class','Student Name','Student ID','PIN']];
    credentialRows.forEach(row => lines.push([
      row.class_name,row.student_name,row.student_id,row.pin
    ]));
    return lines.map(row => row.map(csvEscape).join(',')).join('\r\n');
  }

  async function copyCredentials(){
    if (!credentialRows.length) return;
    try {
      await navigator.clipboard.writeText(credentialsCsv());
      credentialsSaved = true;
      alert('Year 4 credentials copied as CSV. Save them somewhere secure before leaving this page.');
    } catch {
      alert('Copy was not available in this browser. Use Download CSV instead.');
    }
  }

  function downloadCredentials(){
    if (!credentialRows.length) return;
    const blob = new Blob([credentialsCsv()], { type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'year_4_science_student_credentials.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url),1000);
    credentialsSaved = true;
  }

  function clearCredentials(){
    if (!credentialRows.length) return;
    if (!credentialsSaved && !confirm('These PINs cannot be recovered from the database in plain text. Clear them from this page anyway?')) return;
    credentialRows = [];
    credentialsSaved = false;
    byId('platform-v01-year-launch-output')?.classList.add('hidden');
  }

  function renderCredentials(result){
    const root = byId('platform-v01-year-launch-output');
    if (!root) return;
    credentialRows = Array.isArray(result?.pins) ? [...result.pins] : [];
    credentialRows.sort((a,b) => String(a.class_name).localeCompare(String(b.class_name)) || String(a.student_name).localeCompare(String(b.student_name)));
    credentialsSaved = false;

    if (!credentialRows.length) {
      root.classList.remove('hidden');
      root.innerHTML = '<div class="feedback try">No new plaintext PINs were returned. If PINs already exist, they cannot be recovered; reset them individually if the saved list was lost.</div>';
      return;
    }

    root.classList.remove('hidden');
    root.innerHTML = `
      <div class="feedback correct"><strong>${credentialRows.length} Year 4 credentials generated.</strong> Save or download this list now. The classes are still inactive.</div>
      <div class="platform-launch-actions">
        <button id="platform-v01-year-launch-copy" class="secondary" type="button">Copy CSV</button>
        <button id="platform-v01-year-launch-download" class="primary" type="button">Download CSV</button>
        <button id="platform-v01-year-launch-clear" class="outline" type="button">Clear from screen</button>
      </div>
      <div class="platform-launch-table"><table><thead><tr><th>Class</th><th>Student</th><th>Student ID</th><th>PIN</th></tr></thead><tbody>${credentialRows.map(row => `<tr><td>${esc(row.class_name)}</td><td>${esc(row.student_name)}</td><td>${esc(row.student_id)}</td><td><strong>${esc(row.pin)}</strong></td></tr>`).join('')}</tbody></table></div>
      <p class="platform-launch-note">For security, this page does not put the plaintext PIN list into localStorage or sessionStorage.</p>`;

    byId('platform-v01-year-launch-copy')?.addEventListener('click',copyCredentials);
    byId('platform-v01-year-launch-download')?.addEventListener('click',downloadCredentials);
    byId('platform-v01-year-launch-clear')?.addEventListener('click',clearCredentials);
  }

  async function generatePins(){
    if (busy || !cloudAvailable()) return;
    const ok = confirm('Generate all missing Year 4 student PINs now?\n\nThe PINs will be shown only once. Download or copy the list before leaving this page. 4A and 4B will remain inactive.');
    if (!ok) return;

    busy = true;
    const button = byId('platform-v01-year-launch-generate');
    if (button) { button.disabled=true; button.textContent='Generating securely…'; }
    try {
      const { data, error } = await cloud.rpc('teacher_generate_year_pins_v01', {
        p_year_level:YEAR_LEVEL,
        p_digits:6
      });
      if (error) throw error;
      renderCredentials(data || {});
      await loadStatus();
    } catch (error) {
      console.warn('Could not generate Year 4 PINs.',error);
      const root = byId('platform-v01-year-launch-output');
      if (root) {
        root.classList.remove('hidden');
        root.innerHTML=`<div class="feedback incorrect">PIN generation did not complete. ${esc(error?.message||'')}</div>`;
      }
    } finally {
      busy=false;
      await loadStatus();
    }
  }

  function warnUnsaved(event){
    if (!credentialRows.length || credentialsSaved) return;
    event.preventDefault();
    event.returnValue = '';
  }

  function apply(){
    ensureSection();
    loadStatus();
  }

  window.addEventListener('beforeunload',warnUnsaved);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();
