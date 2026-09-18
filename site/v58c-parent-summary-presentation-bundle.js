(() => {
  // site/v58c-parent-friendly-student-report.js
  (() => {
    "use strict";
    const ROOT = typeof window !== "undefined" ? window : globalThis;
    if (ROOT.__v58cParentFriendlyStudentReportInstalled) return;
    ROOT.__v58cParentFriendlyStudentReportInstalled = true;
    const TRIGGER_ID = "v58c-open-parent-summary";
    const OVERLAY_ID = "v58c-parent-summary-overlay";
    const STYLE_ID = "v58c-parent-summary-style";
    let returnFocus = null;
    let previousOverflow = "";
    const byId = (id) => typeof document === "undefined" ? null : document.getElementById(id);
    const safe = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    const number = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
    function reportingApi() {
      return ROOT.V50ReportingExport || null;
    }
    function currentSnapshot() {
      try {
        return reportingApi()?.buildStudentSnapshot?.() || null;
      } catch {
        return null;
      }
    }
    function recordsOf(snapshot, type) {
      return (Array.isArray(snapshot?.records) ? snapshot.records : []).filter((row) => row?.record_type === type);
    }
    function metricMap(snapshot) {
      const map = /* @__PURE__ */ new Map();
      recordsOf(snapshot, "metric").forEach((row) => map.set(String(row.metric_name || ""), row.metric_value));
      return map;
    }
    function statusText(row) {
      return String(row?.topic_status || "").trim().toLowerCase();
    }
    function topicPercent(row) {
      const value = number(row?.topic_accuracy_percent);
      return value == null ? null : Math.round(value);
    }
    function strengthTopics(snapshot) {
      return recordsOf(snapshot, "topic").filter((row) => statusText(row).includes("secure")).sort((a, b) => (topicPercent(b) ?? -1) - (topicPercent(a) ?? -1) || String(a.topic || "").localeCompare(String(b.topic || ""))).slice(0, 2);
    }
    function focusRank(row) {
      const status = statusText(row);
      if (status.includes("needs attention")) return 0;
      if (status.includes("developing")) return 1;
      return 2;
    }
    function focusTopics(snapshot) {
      return recordsOf(snapshot, "topic").filter((row) => {
        const status = statusText(row);
        return status.includes("needs attention") || status.includes("developing");
      }).sort((a, b) => focusRank(a) - focusRank(b) || (topicPercent(a) ?? 101) - (topicPercent(b) ?? 101) || String(a.topic || "").localeCompare(String(b.topic || ""))).slice(0, 2);
    }
    function practiceActivities(snapshot) {
      return recordsOf(snapshot, "activity").filter((row) => String(row?.activity_mode || "").toLowerCase() === "practice").slice().sort((a, b) => Date.parse(b.activity_completed_at || 0) - Date.parse(a.activity_completed_at || 0));
    }
    function dateLabel(value, withYear = true) {
      if (!value) return "—";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleDateString(void 0, withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
    }
    function topicCard(row, kind) {
      if (!row) return "";
      const pct = topicPercent(row);
      return `<article class="v58c-topic-card ${kind}"><strong>${safe(row.topic || "Topic")}</strong><span>${safe(row.topic_status || "Learning evidence")}${pct == null ? "" : ` · ${pct}%`}</span></article>`;
    }
    function emptyTopicCard(message) {
      return `<article class="v58c-topic-card empty"><strong>${safe(message)}</strong><span>More completed Practice will provide clearer topic evidence.</span></article>`;
    }
    function nextStep(snapshot) {
      const focus = focusTopics(snapshot)[0];
      const strengths = strengthTopics(snapshot);
      const practice = practiceActivities(snapshot);
      if (focus?.topic) {
        return `A useful next step is to continue practising ${String(focus.topic)} and review progress again after more completed Practice.`;
      }
      if (strengths.length) {
        return "Keep practising regularly to maintain current strengths and build evidence across more Maths topics.";
      }
      if (practice.length) {
        return "Continue with short Practice sessions so the app can build a clearer picture of current strengths and focus areas.";
      }
      return "Complete a first Practice session so the app can begin building a useful progress picture.";
    }
    function recentPracticeMarkup(snapshot) {
      const rows = practiceActivities(snapshot).slice(0, 3);
      if (!rows.length) return '<div class="v58c-empty">No completed Practice activity is available in the selected Analytics view yet.</div>';
      return `<div class="v58c-activity-list">${rows.map((row) => {
        const mastery = number(row.practice_mastery_percent);
        return `<div class="v58c-activity"><div><strong>${safe(row.activity_name || "Practice")}</strong><span>${safe(dateLabel(row.activity_completed_at))}</span></div><strong class="v58c-result">${mastery == null ? "Completed" : `${Math.round(mastery)}% mastery`}</strong></div>`;
      }).join("")}</div>`;
    }
    function scopeLabel(snapshot) {
      const scope = snapshot?.scope || {};
      const parts = [];
      if (scope.period && !/^all$/i.test(String(scope.period))) parts.push(scope.period);
      if (scope.className && !/^all/i.test(String(scope.className))) parts.push(scope.className);
      if (scope.year && !/^all/i.test(String(scope.year))) parts.push(scope.year);
      return parts.join(" · ") || "Current Teacher Analytics view";
    }
    function studentYear(snapshot) {
      const row = (Array.isArray(snapshot?.records) ? snapshot.records : []).find((item) => item?.student_year !== void 0 && item?.student_year !== null && item?.student_year !== "");
      return row?.student_year ?? "—";
    }
    function buildSummary(snapshot) {
      const metrics = metricMap(snapshot);
      const strengths = strengthTopics(snapshot);
      const focus = focusTopics(snapshot);
      const practice = practiceActivities(snapshot);
      const latest = practice[0]?.activity_completed_at || "";
      const practiceCount = number(metrics.get("practice_sessions_completed")) ?? practice.length;
      const scored = number(metrics.get("scored_responses")) ?? 0;
      const topicCount = number(metrics.get("topics_with_evidence")) ?? recordsOf(snapshot, "topic").length;
      const generated = snapshot?.generatedAt ? new Date(snapshot.generatedAt) : /* @__PURE__ */ new Date();
      return `
      <div class="v58c-head">
        <div>
          <div class="v58c-kicker">Maths Practice App · Parent / Family Summary</div>
          <h2 id="v58c-parent-summary-title">${safe(snapshot?.studentName || "Student")} — Maths Progress</h2>
          <p>${safe(snapshot?.className || "Class")} · Year ${safe(studentYear(snapshot))}</p>
          <p class="v58c-scope">Based on: ${safe(scopeLabel(snapshot))} · Prepared ${safe(dateLabel(generated))}</p>
        </div>
        <div class="v58c-actions"><button id="v58c-print" class="primary" type="button">Print / Save PDF</button><button id="v58c-close" class="outline" type="button">Close</button></div>
      </div>

      <div class="v58c-note"><strong>Practice progress summary</strong><span>This is a simple family-facing view of saved Practice evidence. It is not an official grade.</span></div>

      <div class="v58c-stats">
        <article><strong>${practiceCount}</strong><span>Practice sessions</span></article>
        <article><strong>${scored}</strong><span>Scored responses</span></article>
        <article><strong>${topicCount}</strong><span>Topics with evidence</span></article>
        <article><strong>${safe(dateLabel(latest, false))}</strong><span>Latest Practice</span></article>
      </div>

      <div class="v58c-two-col">
        <section class="v58c-section">
          <h3>✅ Current strengths</h3>
          <p>Topics currently shown as secure by the existing Teacher Analytics evidence.</p>
          <div class="v58c-topic-list">${strengths.length ? strengths.map((row) => topicCard(row, "strength")).join("") : emptyTopicCard("No secure topic yet")}</div>
        </section>
        <section class="v58c-section">
          <h3>🎯 Areas to focus on</h3>
          <p>Topics currently shown as developing or needing attention.</p>
          <div class="v58c-topic-list">${focus.length ? focus.map((row) => topicCard(row, "focus")).join("") : emptyTopicCard("No current focus topic")}</div>
        </section>
      </div>

      <section class="v58c-section v58c-next-step">
        <h3>➡️ Suggested next step</h3>
        <p>${safe(nextStep(snapshot))}</p>
      </section>

      <section class="v58c-section">
        <h3>🕘 Recent Practice</h3>
        <p>The three most recent completed Practice activities in the selected Analytics view.</p>
        ${recentPracticeMarkup(snapshot)}
      </section>

      <div class="v58c-footer">This summary reuses the teacher's existing Student Performance Report evidence and mastery bands. Practice mastery is not an Exam mark or official grade, and V5.8C adds no AI-generated judgement or new learning threshold.</div>
    `;
    }
    function injectStyles() {
      if (typeof document === "undefined" || byId(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
      #${TRIGGER_ID}{white-space:nowrap}
      #${OVERLAY_ID}{position:fixed;inset:0;z-index:126;background:rgba(15,23,42,.72);overflow:auto;padding:18px}
      #${OVERLAY_ID}.hidden{display:none!important}
      #${OVERLAY_ID} .v58c-sheet{width:min(900px,100%);margin:0 auto;background:var(--card);color:var(--text);border-radius:20px;box-shadow:0 28px 90px rgba(0,0,0,.28);padding:24px}
      #${OVERLAY_ID} .v58c-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap}
      #${OVERLAY_ID} .v58c-head h2{margin:2px 0 4px;font-size:25px;line-height:1.2}
      #${OVERLAY_ID} .v58c-head p{margin:2px 0;color:var(--muted);font-size:12px}
      #${OVERLAY_ID} .v58c-kicker{font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.06em;color:var(--primary)}
      #${OVERLAY_ID} .v58c-scope{font-size:10px!important}
      #${OVERLAY_ID} .v58c-actions{display:flex;gap:8px;flex-wrap:wrap}
      #${OVERLAY_ID} .v58c-note{display:grid;gap:3px;margin:16px 0;padding:11px 12px;border:1px solid var(--border);border-radius:13px;background:color-mix(in srgb,var(--soft) 28%,var(--card))}
      #${OVERLAY_ID} .v58c-note strong{font-size:12px}#${OVERLAY_ID} .v58c-note span{font-size:10px;color:var(--muted);line-height:1.4}
      #${OVERLAY_ID} .v58c-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:14px 0 18px}
      #${OVERLAY_ID} .v58c-stats article{border:1px solid var(--border);border-radius:13px;padding:11px;background:var(--card)}
      #${OVERLAY_ID} .v58c-stats strong{display:block;font-size:20px;line-height:1.2;margin-bottom:3px}
      #${OVERLAY_ID} .v58c-stats span{display:block;font-size:9px;color:var(--muted);line-height:1.35}
      #${OVERLAY_ID} .v58c-two-col{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
      #${OVERLAY_ID} .v58c-section{border:1px solid var(--border);border-radius:14px;padding:14px;margin-top:11px;background:var(--card)}
      #${OVERLAY_ID} .v58c-section h3{margin:0 0 4px;font-size:15px}
      #${OVERLAY_ID} .v58c-section>p{margin:0 0 10px;color:var(--muted);font-size:10px;line-height:1.45}
      #${OVERLAY_ID} .v58c-topic-list{display:grid;gap:7px}
      #${OVERLAY_ID} .v58c-topic-card{border:1px solid var(--border);border-radius:11px;padding:9px 10px;display:grid;gap:2px}
      #${OVERLAY_ID} .v58c-topic-card strong{font-size:12px;line-height:1.3}#${OVERLAY_ID} .v58c-topic-card span{font-size:9px;color:var(--muted);line-height:1.4}
      #${OVERLAY_ID} .v58c-topic-card.strength{border-color:color-mix(in srgb,var(--success) 34%,var(--border));background:color-mix(in srgb,var(--successbg) 42%,var(--card))}
      #${OVERLAY_ID} .v58c-topic-card.focus{border-color:color-mix(in srgb,var(--warn) 36%,var(--border));background:color-mix(in srgb,var(--warnbg) 48%,var(--card))}
      #${OVERLAY_ID} .v58c-topic-card.empty{border-style:dashed}
      #${OVERLAY_ID} .v58c-next-step{border-color:color-mix(in srgb,var(--primary) 30%,var(--border));background:color-mix(in srgb,var(--soft) 30%,var(--card))}
      #${OVERLAY_ID} .v58c-next-step p{font-size:12px;color:var(--text);font-weight:700;margin:0}
      #${OVERLAY_ID} .v58c-activity-list{display:grid;gap:6px}
      #${OVERLAY_ID} .v58c-activity{display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid var(--border);padding:8px 2px 2px}
      #${OVERLAY_ID} .v58c-activity:first-child{border-top:0;padding-top:0}
      #${OVERLAY_ID} .v58c-activity>div{display:grid;gap:2px}#${OVERLAY_ID} .v58c-activity strong{font-size:11px}#${OVERLAY_ID} .v58c-activity span{font-size:9px;color:var(--muted)}
      #${OVERLAY_ID} .v58c-result{white-space:nowrap;color:var(--primary)}
      #${OVERLAY_ID} .v58c-empty{padding:11px;border:1px dashed var(--border);border-radius:10px;color:var(--muted);font-size:10px}
      #${OVERLAY_ID} .v58c-footer{margin-top:13px;padding-top:10px;border-top:1px solid var(--border);font-size:9px;color:var(--muted);line-height:1.45}
      @media(max-width:700px){#${OVERLAY_ID}{padding:8px}#${OVERLAY_ID} .v58c-sheet{padding:16px;border-radius:16px}#${OVERLAY_ID} .v58c-stats{grid-template-columns:repeat(2,minmax(0,1fr))}#${OVERLAY_ID} .v58c-two-col{grid-template-columns:1fr}}
      @media(max-width:430px){#${OVERLAY_ID} .v58c-stats{grid-template-columns:1fr}#${OVERLAY_ID} .v58c-actions{width:100%}#${OVERLAY_ID} .v58c-actions button{flex:1}#${OVERLAY_ID} .v58c-activity{align-items:flex-start;flex-direction:column}}
      @media print{
        @page{size:A4 portrait;margin:11mm}
        body.v58c-printing>*:not(#${OVERLAY_ID}){display:none!important}
        body.v58c-printing{background:#fff!important;color:#111!important}
        body.v58c-printing #${OVERLAY_ID}{display:block!important;position:static!important;inset:auto!important;overflow:visible!important;padding:0!important;background:#fff!important}
        body.v58c-printing #${OVERLAY_ID} .v58c-sheet{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;color:#111!important}
        body.v58c-printing #${OVERLAY_ID} .v58c-actions{display:none!important}
        body.v58c-printing #${OVERLAY_ID} .v58c-stats{grid-template-columns:repeat(4,1fr)!important}
        body.v58c-printing #${OVERLAY_ID} .v58c-two-col{grid-template-columns:repeat(2,1fr)!important}
        body.v58c-printing #${OVERLAY_ID} .v58c-section,body.v58c-printing #${OVERLAY_ID} .v58c-note{break-inside:avoid;page-break-inside:avoid;background:#fff!important;color:#111!important}
        body.v58c-printing #${OVERLAY_ID} .v58c-topic-card,body.v58c-printing #${OVERLAY_ID} .v58c-stats article{background:#fff!important;color:#111!important}
        body.v58c-printing #${OVERLAY_ID} .v58c-head h2{font-size:22px!important}
      }
    `;
      document.head.appendChild(style);
    }
    function ensureOverlay() {
      if (typeof document === "undefined" || byId(OVERLAY_ID)) return;
      const overlay = document.createElement("section");
      overlay.id = OVERLAY_ID;
      overlay.className = "hidden";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", "v58c-parent-summary-title");
      overlay.innerHTML = '<div class="v58c-sheet"></div>';
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeSummary();
      });
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          closeSummary();
        }
      });
      document.body.appendChild(overlay);
    }
    function closeSummary() {
      const overlay = byId(OVERLAY_ID);
      if (!overlay || overlay.classList.contains("hidden")) return;
      overlay.classList.add("hidden");
      document.body.style.overflow = previousOverflow;
      const target = returnFocus;
      returnFocus = null;
      if (target && typeof target.focus === "function" && document.contains(target)) target.focus({ preventScroll: true });
    }
    function printSummary() {
      const snapshot = currentSnapshot();
      if (!snapshot) return;
      const previousTitle = document.title;
      const student = String(snapshot.studentName || "Student").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "Student";
      document.body.classList.add("v58c-printing");
      document.title = `Maths Progress Summary - ${student}`;
      let cleared = false;
      const clear = () => {
        if (cleared) return;
        cleared = true;
        document.body.classList.remove("v58c-printing");
        document.title = previousTitle;
      };
      window.addEventListener("afterprint", clear, { once: true });
      window.print();
      window.setTimeout(clear, 1500);
    }
    function openSummary() {
      const snapshot = currentSnapshot();
      const overlay = byId(OVERLAY_ID);
      const sheet = overlay?.querySelector(".v58c-sheet");
      if (!snapshot || !overlay || !sheet) {
        return;
      }
      returnFocus = document.activeElement;
      sheet.innerHTML = buildSummary(snapshot);
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      overlay.classList.remove("hidden");
      byId("v58c-print")?.addEventListener("click", printSummary);
      byId("v58c-close")?.addEventListener("click", closeSummary);
      byId("v58c-close")?.focus({ preventScroll: true });
    }
    function ensureTrigger() {
      if (typeof document === "undefined" || byId(TRIGGER_ID)) return;
      const detailed = byId("v50c2-open-student-report");
      const closeButton = byId("close-student-insight");
      const anchor = detailed || closeButton;
      if (!anchor) return;
      const button = document.createElement("button");
      button.id = TRIGGER_ID;
      button.type = "button";
      button.className = "secondary";
      button.textContent = "👪 Parent summary";
      button.title = "Open a simple parent-friendly Practice progress summary";
      button.addEventListener("click", openSummary);
      anchor.insertAdjacentElement("beforebegin", button);
    }
    function wire() {
      injectStyles();
      ensureOverlay();
      ensureTrigger();
      document.querySelector('[data-panel="analytics-panel"]')?.addEventListener("click", () => window.setTimeout(ensureTrigger, 0));
      const teacher = byId("teacher");
      if (teacher) {
        const observer = new MutationObserver(() => ensureTrigger());
        observer.observe(teacher, { childList: true, subtree: true });
      }
    }
    const api = Object.freeze({ open: openSummary, buildSummary, nextStep });
    Object.defineProperty(ROOT, "V58CParentFriendlyStudentReport", { value: api, writable: false, configurable: false });
    if (typeof document === "undefined") return;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire, { once: true });
    else wire();
  })();

  // site/v58c-parent-summary-workspace-shortcut.js
  (() => {
    "use strict";
    const ROOT = typeof window !== "undefined" ? window : globalThis;
    if (ROOT.__v58cParentSummaryWorkspaceShortcutInstalled) return;
    ROOT.__v58cParentSummaryWorkspaceShortcutInstalled = true;
    const SHORTCUT_ID = "v58c-workspace-parent-summary";
    let timer = 0;
    function workspaceTools() {
      return typeof document === "undefined" ? null : document.querySelector('#v58b-teacher-workspace [data-v58b-group="reports-support"] .v58b-tools');
    }
    function showStatus(message) {
      const status = document.getElementById("v58b-teacher-workspace-status");
      if (!status) return;
      status.className = "";
      status.textContent = message;
      window.setTimeout(() => {
        if (document.getElementById("v58b-teacher-workspace-status") === status && status.textContent === message) status.textContent = "";
      }, 3600);
    }
    function openLearnerSelection() {
      const tab = document.querySelector('#teacher .tab[data-panel="analytics-panel"]');
      if (!tab) {
        showStatus("Analytics is still loading. Try again after Refresh.");
        return;
      }
      tab.click();
      window.setTimeout(() => {
        document.getElementById("analytics-students-body")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        showStatus("Choose a student in Analytics, then use 👪 Parent summary in that learner profile.");
      }, 90);
    }
    function ensureShortcut() {
      if (typeof document === "undefined" || document.getElementById(SHORTCUT_ID)) return true;
      const tools = workspaceTools();
      if (!tools) return false;
      const button = document.createElement("button");
      button.id = SHORTCUT_ID;
      button.type = "button";
      button.className = "v58b-tool";
      button.innerHTML = "<strong>Parent Summary</strong><span>Simple printable family progress view</span>";
      button.title = "Choose a learner and open the parent-friendly progress summary";
      button.addEventListener("click", openLearnerSelection);
      const studentReports = tools.querySelector('[data-v58b-tool="student-reports"]');
      if (studentReports) studentReports.insertAdjacentElement("afterend", button);
      else tools.appendChild(button);
      return true;
    }
    function schedule() {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = 0;
        ensureShortcut();
      }, 60);
    }
    function wire() {
      ensureShortcut();
      const teacher = document.getElementById("teacher");
      if (teacher) {
        const observer = new MutationObserver(schedule);
        observer.observe(teacher, { childList: true, subtree: true });
      }
    }
    if (typeof document === "undefined") return;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire, { once: true });
    else wire();
  })();
})();
