(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // site/v58a-student-first-use-experience.js
  var require_v58a_student_first_use_experience = __commonJS({
    "site/v58a-student-first-use-experience.js"(exports, module) {
      (() => {
        "use strict";
        const ROOT = typeof window !== "undefined" ? window : globalThis;
        if (ROOT.__v58aStudentFirstUseExperienceInstalled) return;
        ROOT.__v58aStudentFirstUseExperienceInstalled = true;
        const CARD_ID = "v58a-first-use-card";
        const STYLE_ID = "v58a-first-use-style";
        const BADGE_SELECTOR = '#v571b-latest-achievement .v571b-badge[data-badge-id="first_practice"]';
        const HOME_SELECTOR = "#start .v40c3-home-dashboard";
        const BLOCKING_PRIORITIES = /* @__PURE__ */ new Set(["assignment", "checkpoint"]);
        let retryTimer = 0;
        let installed = false;
        function signedIn() {
          if (typeof document === "undefined") return false;
          return !!document.querySelector("#start .v40c-session-panel.v40c-authenticated");
        }
        function dashboard() {
          return typeof document === "undefined" ? null : document.querySelector(HOME_SELECTOR);
        }
        function firstPracticeState() {
          if (typeof document === "undefined") return "unknown";
          const badge = document.querySelector(BADGE_SELECTOR);
          if (!badge) return "unknown";
          return badge.classList.contains("earned") ? "earned" : "not_earned";
        }
        function priorityKind() {
          return String(dashboard()?.querySelector(".v57c-continue-card")?.dataset?.v57cKind || "").trim().toLowerCase();
        }
        function studentName() {
          try {
            const access = typeof activeStudentAccess !== "undefined" ? activeStudentAccess : ROOT.activeStudentAccess;
            const direct = String(access?.student_name || access?.studentName || "").trim();
            if (direct) return direct;
          } catch {
          }
          const heading = document.querySelector("#start .v40-learning-hub-hero h2")?.textContent || "";
          const match = String(heading).match(/^Welcome back,\s*(.+?)\.?$/i);
          return String(match?.[1] || "").replace(/\.$/, "").trim();
        }
        function injectStyles() {
          if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
          const style = document.createElement("style");
          style.id = STYLE_ID;
          style.textContent = `
      #start #${CARD_ID}{
        border:1px solid color-mix(in srgb,#7c3aed 42%,var(--border));
        border-radius:21px;
        padding:18px;
        background:linear-gradient(135deg,color-mix(in srgb,#f3e8ff 72%,var(--card)),var(--card));
        display:grid;
        grid-template-columns:auto minmax(0,1fr) auto;
        gap:15px;
        align-items:center;
      }
      #start #${CARD_ID} .v58a-icon{
        width:54px;height:54px;border-radius:17px;display:grid;place-items:center;
        background:linear-gradient(145deg,#8b5cf6,#6d28d9);font-size:27px;
        box-shadow:inset 0 0 0 3px rgba(255,255,255,.16)
      }
      #start #${CARD_ID} .v58a-main{min-width:0}
      #start #${CARD_ID} .v58a-kicker{
        color:#6d28d9;font-size:10px;font-weight:950;letter-spacing:.07em;
        text-transform:uppercase;margin-bottom:4px
      }
      #start #${CARD_ID} h2{margin:0 0 5px;font-size:clamp(19px,2.6vw,25px);line-height:1.25}
      #start #${CARD_ID} p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}
      #start #${CARD_ID} .v58a-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
      #start #${CARD_ID} .v58a-meta span{
        display:inline-flex;align-items:center;min-height:28px;padding:5px 8px;
        border:1px solid var(--border);border-radius:999px;background:var(--card);
        font-size:10px;font-weight:850
      }
      #start #${CARD_ID} .v58a-start{min-width:190px;min-height:49px;white-space:nowrap}
      html[data-theme="dark"] #start #${CARD_ID}{
        background:linear-gradient(135deg,color-mix(in srgb,#6d28d9 17%,var(--card)),var(--card))
      }
      html[data-theme="dark"] #start #${CARD_ID} .v58a-kicker{color:#c4b5fd}
      @media(max-width:720px){
        #start #${CARD_ID}{grid-template-columns:48px minmax(0,1fr)}
        #start #${CARD_ID} .v58a-icon{width:48px;height:48px;border-radius:15px;font-size:24px}
        #start #${CARD_ID} .v58a-start{grid-column:1/-1;width:100%;min-width:0}
      }
    `;
          document.head.appendChild(style);
        }
        function setSelectValue(id, value) {
          const select = document.getElementById(id);
          if (!select) return false;
          const option = [...select.options].find((row) => String(row.value) === String(value));
          if (!option) return false;
          select.value = String(value);
          select.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        function configureFirstPractice() {
          try {
            ROOT.V561PracticeFirstStudentExperience?.ensurePracticeSelection?.();
          } catch {
          }
          const strandOk = setSelectValue("strand-filter", "all");
          const topicOk = setSelectValue("topic-filter", "all");
          const countOk = setSelectValue("question-count", "5");
          const difficultyOk = setSelectValue("difficulty-filter", "all");
          return strandOk && topicOk && countOk && difficultyOk;
        }
        function openLearnFallback() {
          const open = document.querySelector("#start .v40c-open-learn");
          if (open) {
            open.click();
            return;
          }
          document.querySelector("#start .v40c-learn-setup")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        }
        function restoreStartButton(button, original) {
          if (!button || !document.contains(button)) return;
          button.disabled = false;
          button.textContent = original || "Start My First 5 Questions";
        }
        function startFirstPractice(button) {
          if (!signedIn()) return;
          const original = button?.textContent || "";
          if (button) {
            button.disabled = true;
            button.textContent = "Starting…";
          }
          try {
            const configured = configureFirstPractice();
            const start = document.getElementById("start-btn");
            if (!configured || !start) throw new Error("Practice setup is not ready yet.");
            start.click();
            window.setTimeout(() => {
              if (document.getElementById("start")?.classList.contains("active")) restoreStartButton(button, original);
            }, 1400);
          } catch (error) {
            console.warn("V5.8A first Practice could not start directly.", error);
            openLearnFallback();
            restoreStartButton(button, original);
          }
        }
        function ensureCard() {
          let card = document.getElementById(CARD_ID);
          if (card) return card;
          card = document.createElement("article");
          card.id = CARD_ID;
          card.className = "hidden";
          card.setAttribute("aria-label", "First Practice");
          card.innerHTML = `
      <div class="v58a-icon" aria-hidden="true">👋</div>
      <div class="v58a-main">
        <div class="v58a-kicker">Your first step</div>
        <h2>Ready for your first short Practice?</h2>
        <p>Start with a short Mixed Practice. Hints and a second try are available, and finishing unlocks your First Practice achievement.</p>
        <div class="v58a-meta"><span>5 questions</span><span>Mixed Practice</span><span>Hints available</span><span>Earn XP + first badge</span></div>
      </div>
      <button type="button" class="primary v58a-start">Start My First 5 Questions</button>`;
          return card;
        }
        function removeCard() {
          const card = document.getElementById(CARD_ID);
          if (!card) return;
          if (!card.hasAttribute("data-v40-static-card")) {
            card.remove();
            return;
          }
          card.classList.add("hidden");
          const heading = card.querySelector("h2");
          if (heading) heading.textContent = "Ready for your first short Practice?";
        }
        function eligible() {
          if (!signedIn()) return false;
          if (firstPracticeState() !== "not_earned") return false;
          const kind = priorityKind();
          if (BLOCKING_PRIORITIES.has(kind)) return false;
          return !!dashboard()?.querySelector(".v57c-continue-card");
        }
        function render() {
          injectStyles();
          const root = dashboard();
          const anchor = root?.querySelector(".v57c-continue-card");
          if (!root || !anchor || !eligible()) {
            removeCard();
            return false;
          }
          const card = ensureCard();
          const staticCard = card.hasAttribute("data-v40-static-card");
          if (!staticCard && card.nextElementSibling !== anchor) anchor.insertAdjacentElement("beforebegin", card);
          const name = studentName();
          const heading = card.querySelector("h2");
          if (heading) heading.textContent = `${name ? `Welcome, ${name}! ` : ""}Ready for 5 quick questions?`;
          const paragraph = card.querySelector("p");
          if (paragraph) paragraph.textContent = "Start with a short Mixed Practice. Hints and a second try are available, and finishing unlocks your First Practice achievement.";
          const button = card.querySelector(".v58a-start");
          if (button && button.dataset.v58aBound !== "true") {
            button.dataset.v58aBound = "true";
            button.addEventListener("click", (event) => startFirstPractice(event.currentTarget));
          }
          card.classList.remove("hidden");
          return true;
        }
        function escapeHtml(value) {
          return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        }
        function scheduleRender(attempt = 0) {
          if (typeof window === "undefined") return;
          if (retryTimer) window.clearTimeout(retryTimer);
          retryTimer = window.setTimeout(() => {
            retryTimer = 0;
            if (!signedIn()) {
              removeCard();
              return;
            }
            const state = firstPracticeState();
            if (state === "unknown" && attempt < 35) {
              scheduleRender(attempt + 1);
              return;
            }
            render();
          }, attempt ? 140 : 50);
        }
        function wire() {
          if (installed || typeof document === "undefined") return installed;
          installed = true;
          injectStyles();
          window.addEventListener("v57c:home-updated", () => scheduleRender());
          window.addEventListener("v571b:achievements-updated", () => scheduleRender());
          window.addEventListener("pageshow", () => scheduleRender());
          window.addEventListener("focus", () => {
            if (document.getElementById("start")?.classList.contains("active")) scheduleRender();
          });
          document.addEventListener("click", (event) => {
            if (event.target?.closest?.('[data-v40-nav="home"],.back-home')) scheduleRender();
            if (event.target?.closest?.("#v40c-student-logout")) removeCard();
          }, true);
          scheduleRender();
          return true;
        }
        const api = Object.freeze({
          CARD_ID,
          BADGE_SELECTOR,
          BLOCKING_PRIORITIES,
          firstPracticeState,
          priorityKind,
          eligible,
          configureFirstPractice,
          render
        });
        if (typeof module !== "undefined" && module.exports) module.exports = api;
        if (typeof window !== "undefined") {
          Object.defineProperty(window, "V58AStudentFirstUseExperience", { value: api, writable: false, configurable: false });
          if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire, { once: true });
          else wire();
        }
      })();
    }
  });

  // site/v58b-teacher-workspace-consolidation.js
  var require_v58b_teacher_workspace_consolidation = __commonJS({
    "site/v58b-teacher-workspace-consolidation.js"(exports, module) {
      (() => {
        "use strict";
        const ROOT = typeof window !== "undefined" ? window : globalThis;
        if (ROOT.__v58bTeacherWorkspaceInstalled) return;
        ROOT.__v58bTeacherWorkspaceInstalled = true;
        const WORKSPACE_ID = "v58b-teacher-workspace";
        const STYLE_ID = "v58b-teacher-workspace-style";
        const STATUS_ID = "v58b-teacher-workspace-status";
        const ALL_TOOLS_ID = "v58b-all-tools-label";
        const SUBTITLE = "Plan, monitor, support and manage learning in one workspace.";
        let retryTimer = 0;
        let statusTimer = 0;
        let installed = false;
        const GROUPS = Object.freeze([
          Object.freeze({
            key: "monitor",
            icon: "📊",
            title: "Monitor",
            description: "See participation, learning evidence and priority follow-up.",
            tools: Object.freeze([
              Object.freeze({ key: "analytics", label: "Analytics", description: "Participation and learning evidence", panel: "analytics-panel" }),
              Object.freeze({ key: "action-center", label: "Action Center", description: "Priority learners and next actions", panel: "analytics-panel", anchor: ".v42-action-center" }),
              Object.freeze({ key: "past-paper-analytics", label: "Past Paper Analytics", description: "Practice-mode paper evidence", trigger: "v56d-open-past-paper-analytics" })
            ])
          }),
          Object.freeze({
            key: "teach",
            icon: "🎯",
            title: "Teach",
            description: "Assign work, review responses and support motivation.",
            tools: Object.freeze([
              Object.freeze({ key: "assignments", label: "Classes & Assignments", description: "Class and assignment tools", panel: "classes-panel" }),
              Object.freeze({ key: "review", label: "Review Queue", description: "Teacher-marked responses", panel: "review-panel" }),
              Object.freeze({ key: "motivation", label: "Class Motivation", description: "XP, streaks and weekly missions", trigger: "v573-open-class-motivation" })
            ])
          }),
          Object.freeze({
            key: "students",
            icon: "👥",
            title: "Students",
            description: "Manage access, roster operations and launch preparation.",
            tools: Object.freeze([
              Object.freeze({ key: "student-access", label: "Student Access", description: "Access mode and PIN controls", panel: "access-panel" }),
              Object.freeze({ key: "operations", label: "Teacher Operations", description: "Roster, transfers and assignment admin", panel: "teacher-operations-panel" }),
              Object.freeze({ key: "launch-readiness", label: "Launch Readiness", description: "Roster, PIN and launch checks", panel: "launch-readiness-panel" })
            ])
          }),
          Object.freeze({
            key: "content",
            icon: "🧩",
            title: "Content",
            description: "Maintain the existing question and import workflows.",
            tools: Object.freeze([
              Object.freeze({ key: "question-bank", label: "Question Bank", description: "Questions, QA and publication controls", panel: "questions-panel" }),
              Object.freeze({ key: "bulk-import", label: "Bulk Import", description: "Import paper and exercise content", panel: "import-panel" })
            ])
          }),
          Object.freeze({
            key: "reports-support",
            icon: "📄",
            title: "Reports & Support",
            description: "Open established reports, archive and feedback tools.",
            tools: Object.freeze([
              Object.freeze({ key: "class-report", label: "Class Report", description: "Current Analytics scope", trigger: "v50c1-open-class-report" }),
              Object.freeze({ key: "student-reports", label: "Student Reports", description: "Choose a learner from Analytics", custom: "student-reports" }),
              Object.freeze({ key: "report-archive", label: "Report Archive", description: "Saved report snapshots", panel: "report-archive-panel" }),
              Object.freeze({ key: "feedback", label: "Feedback Inbox", description: "Student problems, questions and suggestions", trigger: "v5763-teacher-feedback-icon", fallbackTrigger: "v576-feedback-inbox" })
            ])
          })
        ]);
        function teacherRoot() {
          return typeof document === "undefined" ? null : document.getElementById("teacher");
        }
        function injectStyles() {
          if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
          const style = document.createElement("style");
          style.id = STYLE_ID;
          style.textContent = `
      #teacher #${WORKSPACE_ID}{
        margin:18px 0 12px;border:1px solid color-mix(in srgb,var(--primary) 24%,var(--border));
        border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--soft) 34%,var(--card)),var(--card));
        overflow:hidden
      }
      #teacher #${WORKSPACE_ID}>summary{
        list-style:none;cursor:pointer;display:flex;justify-content:space-between;gap:14px;align-items:center;
        padding:15px 16px;font-weight:900
      }
      #teacher #${WORKSPACE_ID}>summary::-webkit-details-marker{display:none}
      #teacher .v58b-summary-main{display:grid;gap:2px;min-width:0}
      #teacher .v58b-summary-main strong{font-size:16px;line-height:1.3}
      #teacher .v58b-summary-main span{font-size:11px;color:var(--muted);font-weight:650;line-height:1.4}
      #teacher .v58b-summary-toggle{font-size:11px;color:var(--primary);white-space:nowrap}
      #teacher #${WORKSPACE_ID}[open] .v58b-summary-toggle::after{content:'Hide'}
      #teacher #${WORKSPACE_ID}:not([open]) .v58b-summary-toggle::after{content:'Show'}
      #teacher .v58b-body{padding:0 14px 14px}
      #teacher .v58b-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}
      #teacher .v58b-group{border:1px solid var(--border);border-radius:15px;padding:13px;background:var(--card);min-width:0}
      #teacher .v58b-group-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px;align-items:start;margin-bottom:10px}
      #teacher .v58b-group-icon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:var(--soft);font-size:17px}
      #teacher .v58b-group h3{margin:0 0 2px;font-size:14px;line-height:1.25}
      #teacher .v58b-group p{margin:0;color:var(--muted);font-size:10px;line-height:1.4}
      #teacher .v58b-tools{display:grid;gap:7px}
      #teacher .v58b-tool{width:100%;min-height:48px;padding:9px 10px;text-align:left;border:1px solid var(--border);background:color-mix(in srgb,var(--soft) 12%,var(--card));color:var(--text);display:grid;gap:2px}
      #teacher .v58b-tool:hover{border-color:color-mix(in srgb,var(--primary) 45%,var(--border));background:color-mix(in srgb,var(--soft) 42%,var(--card))}
      #teacher .v58b-tool strong{font-size:11px;line-height:1.3}
      #teacher .v58b-tool span{font-size:9px;color:var(--muted);font-weight:600;line-height:1.35}
      #teacher .v58b-tool[data-v58b-ready="false"]{opacity:.72}
      #teacher #${STATUS_ID}{min-height:18px;margin-top:9px;font-size:10px;color:var(--muted);font-weight:700}
      #teacher #${STATUS_ID}.v58b-warn{color:var(--warn)}
      #teacher .v58b-workspace-note{margin:8px 2px 0;color:var(--muted);font-size:9px;line-height:1.45}
      #teacher #${ALL_TOOLS_ID}{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:15px 0 5px;font-size:10px;color:var(--muted);font-weight:750}
      #teacher #${ALL_TOOLS_ID} strong{color:var(--text);font-size:11px}
      #teacher> .tabs.v58b-all-tools-tabs{margin-top:7px}
      html[data-theme="dark"] #teacher #${WORKSPACE_ID}{background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 9%,var(--card)),var(--card))}
      @media(max-width:760px){
        #teacher #${WORKSPACE_ID}>summary{padding:13px}
        #teacher .v58b-body{padding:0 11px 11px}
        #teacher .v58b-grid{grid-template-columns:1fr}
        #teacher #${ALL_TOOLS_ID}{align-items:flex-start;flex-direction:column;gap:2px}
      }
      @media(max-width:480px){
        #teacher .v58b-summary-main span{display:none}
        #teacher .v58b-group{padding:11px}
      }
    `;
          document.head.appendChild(style);
        }
        function toolButtonMarkup(tool) {
          return `<button type="button" class="v58b-tool" data-v58b-tool="${tool.key}"><strong>${tool.label}</strong><span>${tool.description}</span></button>`;
        }
        function workspaceMarkup() {
          return `
      <summary aria-label="Teacher Workspace shortcuts">
        <span class="v58b-summary-main"><strong>Teacher Workspace</strong><span>Quick access grouped by what you want to do.</span></span>
        <span class="v58b-summary-toggle" aria-hidden="true"></span>
      </summary>
      <div class="v58b-body">
        <div class="v58b-grid">${GROUPS.map((group) => `
          <section class="v58b-group" data-v58b-group="${group.key}">
            <div class="v58b-group-head"><span class="v58b-group-icon" aria-hidden="true">${group.icon}</span><div><h3>${group.title}</h3><p>${group.description}</p></div></div>
            <div class="v58b-tools">${group.tools.map(toolButtonMarkup).join("")}</div>
          </section>`).join("")}</div>
        <div id="${STATUS_ID}" role="status" aria-live="polite"></div>
        <div class="v58b-workspace-note">These are shortcuts to existing teacher tools. Exam Settings and other specialist tools remain available in the full tab row below.</div>
      </div>`;
        }
        function ensureWorkspace() {
          const root = teacherRoot();
          const header = root?.querySelector(":scope > .header");
          const tabs = root?.querySelector(":scope > .tabs");
          if (!root || !header || !tabs) return false;
          let workspace = document.getElementById(WORKSPACE_ID);
          if (!workspace) {
            workspace = document.createElement("details");
            workspace.id = WORKSPACE_ID;
            workspace.open = true;
            workspace.innerHTML = workspaceMarkup();
            header.insertAdjacentElement("afterend", workspace);
          } else if (workspace.previousElementSibling !== header) {
            header.insertAdjacentElement("afterend", workspace);
          }
          tabs.classList.add("v58b-all-tools-tabs");
          let label = document.getElementById(ALL_TOOLS_ID);
          if (!label) {
            label = document.createElement("div");
            label.id = ALL_TOOLS_ID;
            label.innerHTML = "<strong>All teacher tools</strong><span>Use the original tabs anytime for the complete toolset.</span>";
            tabs.insertAdjacentElement("beforebegin", label);
          } else if (label.nextElementSibling !== tabs) {
            tabs.insertAdjacentElement("beforebegin", label);
          }
          const subtitle = document.getElementById("teacher-subtitle");
          if (subtitle && subtitle.textContent !== SUBTITLE) subtitle.textContent = SUBTITLE;
          refreshAvailability();
          return true;
        }
        function allTools() {
          return GROUPS.flatMap((group) => Array.from(group.tools));
        }
        function toolByKey(key) {
          return allTools().find((tool) => tool.key === key) || null;
        }
        function triggerElement(tool) {
          if (!tool) return null;
          return tool.trigger && document.getElementById(tool.trigger) || tool.fallbackTrigger && document.getElementById(tool.fallbackTrigger) || null;
        }
        function panelTab(tool) {
          if (!tool?.panel) return null;
          return document.querySelector(`#teacher .tab[data-panel="${tool.panel}"]`);
        }
        function toolReady(tool) {
          if (!tool) return false;
          if (tool.custom === "student-reports") return !!panelTab({ panel: "analytics-panel" });
          if (tool.trigger || tool.fallbackTrigger) return !!triggerElement(tool);
          if (tool.panel) return !!panelTab(tool);
          return false;
        }
        function refreshAvailability() {
          if (typeof document === "undefined") return;
          document.querySelectorAll(`#${WORKSPACE_ID} [data-v58b-tool]`).forEach((button) => {
            const tool = toolByKey(button.dataset.v58bTool || "");
            const ready = toolReady(tool);
            button.dataset.v58bReady = ready ? "true" : "false";
            button.title = ready ? `${tool?.label || "Tool"} — open existing teacher workflow` : `${tool?.label || "Tool"} is still loading`;
          });
        }
        function setStatus(message, kind = "") {
          const root = document.getElementById(STATUS_ID);
          if (!root) return;
          if (statusTimer) window.clearTimeout(statusTimer);
          root.className = kind === "warn" ? "v58b-warn" : "";
          root.textContent = message || "";
          if (message) {
            statusTimer = window.setTimeout(() => {
              if (document.getElementById(STATUS_ID) === root) {
                root.textContent = "";
                root.className = "";
              }
            }, 3200);
          }
        }
        function scrollToTarget(selector) {
          if (!selector) return;
          window.setTimeout(() => {
            document.querySelector(selector)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
          }, 90);
        }
        function openPanel(tool) {
          const tab = panelTab(tool);
          if (!tab) return false;
          tab.click();
          scrollToTarget(tool.anchor || `#${tool.panel}`);
          return true;
        }
        function openStudentReports() {
          const analytics = toolByKey("analytics");
          if (!openPanel(analytics)) return false;
          scrollToTarget("#analytics-students-body");
          setStatus("Choose a student in Analytics, then open the existing Student report from that learner profile.");
          return true;
        }
        function invokeTool(tool, attempt = 0) {
          if (!tool) return;
          if (tool.custom === "student-reports") {
            if (openStudentReports()) return;
          } else if (tool.trigger || tool.fallbackTrigger) {
            const trigger = triggerElement(tool);
            if (trigger) {
              trigger.click();
              return;
            }
          } else if (tool.panel && openPanel(tool)) {
            return;
          }
          if (attempt < 12) {
            window.setTimeout(() => invokeTool(tool, attempt + 1), 100);
            return;
          }
          setStatus(`${tool.label} is not ready yet. Use the full teacher tabs below or try again after Refresh.`, "warn");
          refreshAvailability();
        }
        function wireWorkspace() {
          const workspace = document.getElementById(WORKSPACE_ID);
          if (!workspace || workspace.dataset.v58bWired === "1") return;
          workspace.dataset.v58bWired = "1";
          workspace.addEventListener("click", (event) => {
            const button = event.target.closest("[data-v58b-tool]");
            if (!button || !workspace.contains(button)) return;
            invokeTool(toolByKey(button.dataset.v58bTool || ""));
          });
        }
        function scheduleEnsure() {
          if (typeof window === "undefined") return;
          if (retryTimer) window.clearTimeout(retryTimer);
          retryTimer = window.setTimeout(() => {
            retryTimer = 0;
            if (ensureWorkspace()) wireWorkspace();
            refreshAvailability();
          }, 60);
        }
        function wire() {
          if (installed || typeof document === "undefined") return installed;
          installed = true;
          injectStyles();
          ensureWorkspace();
          wireWorkspace();
          const root = teacherRoot();
          if (root) {
            const observer = new MutationObserver(scheduleEnsure);
            observer.observe(root, { childList: true, subtree: true });
          }
          window.addEventListener("pageshow", scheduleEnsure);
          document.addEventListener("click", (event) => {
            if (event.target?.closest?.("#teacher-btn,.back-home,#refresh-btn")) scheduleEnsure();
          }, true);
          scheduleEnsure();
          return true;
        }
        const api = Object.freeze({ WORKSPACE_ID, GROUPS, toolByKey, toolReady, ensureWorkspace, openPanel, invokeTool, refreshAvailability });
        if (typeof module !== "undefined" && module.exports) module.exports = api;
        if (typeof window !== "undefined") {
          Object.defineProperty(window, "V58BTeacherWorkspaceConsolidation", { value: api, writable: false, configurable: false });
          if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire, { once: true });
          else wire();
        }
      })();
    }
  });

  // tooling/phase7b/v58ab-production-entry.js
  var import_v58a_student_first_use_experience = __toESM(require_v58a_student_first_use_experience());
  var import_v58b_teacher_workspace_consolidation = __toESM(require_v58b_teacher_workspace_consolidation());
})();
