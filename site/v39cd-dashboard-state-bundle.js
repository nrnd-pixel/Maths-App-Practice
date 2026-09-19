(() => {
  // site/v39-dashboard-polish.js
  (() => {
    "use strict";
    const STYLE_ID = "v39-dashboard-polish-style";
    function byId(id) {
      return document.getElementById(id);
    }
    function injectStyles() {
      if (byId(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
      #student-dashboard .v39-dashboard-intro,
      #student-assignments .v39-assignments-intro{
        margin:18px 0;
        border:1px solid var(--border);
        border-radius:18px;
        padding:16px;
        background:color-mix(in srgb,var(--soft) 52%,var(--card));
        display:grid;
        grid-template-columns:auto minmax(0,1fr);
        gap:12px;
        align-items:start;
      }

      #student-dashboard .v39-dashboard-intro-icon,
      #student-assignments .v39-assignments-intro-icon{
        width:44px;
        height:44px;
        border-radius:14px;
        display:grid;
        place-items:center;
        background:var(--soft);
        font-size:22px;
      }

      #student-dashboard .v39-dashboard-intro h2,
      #student-assignments .v39-assignments-intro h2{
        margin:0 0 4px;
        font-size:18px;
      }

      #student-dashboard .v39-dashboard-intro p,
      #student-assignments .v39-assignments-intro p{
        margin:0;
        color:var(--muted);
        line-height:1.5;
        font-size:14px;
      }

      #student-dashboard .v39-section-label,
      #student-assignments .v39-section-label{
        margin:22px 0 10px;
      }

      #student-dashboard .v39-section-label h2,
      #student-assignments .v39-section-label h2{
        margin:0 0 3px;
        font-size:20px;
      }

      #student-dashboard .v39-section-label p,
      #student-assignments .v39-section-label p{
        margin:0;
        color:var(--muted);
        font-size:13px;
        line-height:1.45;
      }

      #student-dashboard #student-dashboard-summary{
        margin-top:0;
        gap:12px;
      }

      #student-dashboard #student-dashboard-summary .stat{
        min-height:108px;
        display:flex;
        flex-direction:column;
        justify-content:center;
        border-radius:16px;
      }

      #student-dashboard #student-dashboard-summary .stat strong{
        font-size:26px;
      }

      #student-dashboard .analytics-section{
        border-radius:18px;
      }

      #student-dashboard .practice-recommendation-card{
        border-color:color-mix(in srgb,var(--primary) 35%,var(--border));
        box-shadow:0 8px 24px rgba(32,57,96,.07);
      }

      #student-dashboard .practice-recommendation-action button{
        min-height:48px;
      }

      #student-assignments #student-assignments-list{
        gap:14px;
      }

      #student-assignments .student-assignment-card{
        border-radius:18px;
        padding:18px;
        box-shadow:0 6px 20px rgba(32,57,96,.05);
      }

      #student-assignments .student-assignment-title{
        line-height:1.35;
      }

      #student-assignments .student-assignment-action button{
        min-height:48px;
      }

      #student-dashboard .empty,
      #student-assignments .empty{
        border:1px dashed var(--border);
        border-radius:16px;
        background:var(--surface-soft,var(--card));
        padding:24px 18px;
        line-height:1.55;
      }

      #student-assignments .v39-empty-enhanced::before{
        content:'📭';
        display:block;
        font-size:28px;
        margin-bottom:7px;
      }

      #student-dashboard .v39-empty-enhanced::before{
        content:'🌱';
        display:block;
        font-size:28px;
        margin-bottom:7px;
      }

      html[data-theme="dark"] #student-dashboard .v39-dashboard-intro,
      html[data-theme="dark"] #student-assignments .v39-assignments-intro{
        background:color-mix(in srgb,var(--soft) 28%,var(--card));
      }

      @media(max-width:760px){
        #student-dashboard .v39-dashboard-intro,
        #student-assignments .v39-assignments-intro{
          margin:14px 0;
          padding:14px;
        }

        #student-dashboard .v39-dashboard-intro-icon,
        #student-assignments .v39-assignments-intro-icon{
          width:40px;
          height:40px;
        }

        #student-dashboard #student-dashboard-summary{
          grid-template-columns:repeat(2,minmax(0,1fr));
        }

        #student-dashboard #student-dashboard-summary .stat{
          min-height:92px;
        }
      }

      @media(max-width:420px){
        #student-dashboard #student-dashboard-summary{
          grid-template-columns:1fr 1fr;
          gap:8px;
        }

        #student-dashboard #student-dashboard-summary .stat{
          padding:11px 8px;
        }
      }
    `;
      document.head.appendChild(style);
    }
    function createIntro(className, icon, title, text) {
      const box = document.createElement("section");
      box.className = className;
      box.innerHTML = `
      <div class="${className}-icon" aria-hidden="true">${icon}</div>
      <div>
        <h2>${title}</h2>
        <p>${text}</p>
      </div>
    `;
      return box;
    }
    function createSectionLabel(title, text) {
      const label = document.createElement("div");
      label.className = "v39-section-label";
      label.innerHTML = `<h2>${title}</h2><p>${text}</p>`;
      return label;
    }
    function findRecommendedSection(dashboard) {
      const headings = dashboard.querySelectorAll("h2,h3,h4");
      for (const heading of headings) {
        if (/recommended practice/i.test(heading.textContent || "")) {
          return heading.closest(".analytics-section") || heading.closest(".practice-recommendation-card") || heading.parentElement;
        }
      }
      return null;
    }
    function polishDashboard() {
      const dashboard = byId("student-dashboard");
      const summary = byId("student-dashboard-summary");
      if (!dashboard || !summary) return;
      const header = dashboard.querySelector(":scope > .header");
      if (header && !dashboard.querySelector(".v39-dashboard-intro")) {
        const intro2 = createIntro(
          "v39-dashboard-intro",
          "🎯",
          "Your learning journey",
          "See what you have achieved, what is improving and the best next step for your maths practice."
        );
        header.insertAdjacentElement("afterend", intro2);
      }
      if (!summary.previousElementSibling?.classList.contains("v39-section-label")) {
        summary.insertAdjacentElement(
          "beforebegin",
          createSectionLabel("At a glance", "A quick look at the learning you have completed so far.")
        );
      }
      const recommended = findRecommendedSection(dashboard);
      const intro = dashboard.querySelector(".v39-dashboard-intro");
      if (recommended && intro && !recommended.dataset.v39Prioritized) {
        recommended.dataset.v39Prioritized = "true";
        intro.insertAdjacentElement("afterend", recommended);
      }
    }
    function polishAssignments() {
      const screen = byId("student-assignments");
      const list = byId("student-assignments-list");
      if (!screen || !list) return;
      const header = screen.querySelector(":scope > .header");
      if (header && !screen.querySelector(".v39-assignments-intro")) {
        const intro = createIntro(
          "v39-assignments-intro",
          "📚",
          "Your assigned work",
          "Start an assignment when you are ready, or resume the same attempt if you already began it."
        );
        header.insertAdjacentElement("afterend", intro);
      }
      if (!list.previousElementSibling?.classList.contains("v39-section-label")) {
        list.insertAdjacentElement(
          "beforebegin",
          createSectionLabel("Assignments", "Your current work and progress are shown below.")
        );
      }
    }
    function enhanceEmptyStates() {
      document.querySelectorAll("#student-dashboard .empty, #student-assignments .empty").forEach((el) => el.classList.add("v39-empty-enhanced"));
    }
    function observeStudentScreens() {
      ["student-dashboard", "student-assignments"].forEach((id) => {
        const root = byId(id);
        if (!root) return;
        new MutationObserver(() => {
          enhanceEmptyStates();
          if (id === "student-dashboard") polishDashboard();
          if (id === "student-assignments") polishAssignments();
        }).observe(root, { childList: true, subtree: true });
      });
    }
    function applyV39C() {
      injectStyles();
      polishDashboard();
      polishAssignments();
      enhanceEmptyStates();
      observeStudentScreens();
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", applyV39C, { once: true });
    } else {
      applyV39C();
    }
  })();

  // site/v39-state-polish.js
  (() => {
    "use strict";
    const STYLE_ID = "v39-state-polish-style";
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
    #start button:focus-visible,
    #start input:focus-visible,
    #start select:focus-visible,
    #quiz button:focus-visible,
    #quiz input:focus-visible,
    #quiz select:focus-visible,
    #quiz textarea:focus-visible,
    #result button:focus-visible,
    #student-review button:focus-visible,
    #student-assignments button:focus-visible,
    #student-dashboard button:focus-visible,
    #exam-result button:focus-visible{
      outline:3px solid color-mix(in srgb,var(--primary) 35%,transparent);
      outline-offset:2px;
    }

    #student-dashboard .empty,
    #student-assignments .empty,
    #student-review .empty{
      text-align:center;
      max-width:720px;
      margin-left:auto;
      margin-right:auto;
    }

    #student-review .recent-results,
    #student-review .student-review-content{
      margin-top:18px;
    }

    #result .buttons,
    #exam-result .buttons{
      justify-content:center;
    }

    #quiz #feedback:not(.hidden){
      scroll-margin-top:18px;
    }

    @media(max-width:760px){
      #start,
      #quiz,
      #result,
      #student-review,
      #student-assignments,
      #student-dashboard,
      #exam-result{
        overflow-wrap:anywhere;
      }

      #student-dashboard > .header,
      #student-assignments > .header,
      #student-review > .header{
        gap:12px;
      }

      #student-dashboard > .header > button,
      #student-assignments > .header > button,
      #student-review > .header > button{
        min-width:92px;
      }

      #quiz .pills{
        gap:7px;
      }

      #quiz .pill{
        max-width:100%;
        white-space:normal;
      }

      #quiz #q-text{
        font-size:clamp(20px,6vw,27px);
        line-height:1.42;
      }

      #quiz .qimage{
        width:100%;
        max-height:none;
      }

      #quiz .answerbox{
        padding:14px;
        margin:14px 0;
      }

      #quiz .choice-option{
        min-height:48px;
      }

      #student-assignments .student-assignment-meta,
      #student-dashboard .practice-recommendation-meta{
        gap:6px;
      }

      #student-assignments .student-assignment-action,
      #student-dashboard .practice-recommendation-action{
        justify-content:stretch;
      }

      #student-assignments .student-assignment-action button,
      #student-dashboard .practice-recommendation-action button{
        width:100%;
      }
    }

    @media(max-width:520px){
      #start button,
      #quiz button,
      #result button,
      #student-review button,
      #student-assignments button,
      #student-dashboard button,
      #exam-result button{
        min-height:48px;
      }

      #result .buttons,
      #exam-result .buttons,
      #student-review .buttons{
        display:grid;
        grid-template-columns:1fr;
        width:100%;
      }

      #result .buttons button,
      #exam-result .buttons button,
      #student-review .buttons button{
        width:100%;
      }

      #student-dashboard > .header,
      #student-assignments > .header,
      #student-review > .header{
        flex-direction:column;
        align-items:stretch;
      }

      #student-dashboard > .header > button,
      #student-assignments > .header > button,
      #student-review > .header > button{
        width:100%;
      }
    }
  `;
    document.head.appendChild(style);
  })();
})();
