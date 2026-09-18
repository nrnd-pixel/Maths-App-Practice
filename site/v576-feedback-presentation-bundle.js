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

  // site/v5761-feedback-trigger-position.js
  var require_v5761_feedback_trigger_position = __commonJS({
    "site/v5761-feedback-trigger-position.js"(exports, module) {
      (() => {
        "use strict";
        const ROOT = typeof window !== "undefined" ? window : globalThis;
        if (ROOT.__v5761FeedbackTriggerPositionInstalled) return;
        ROOT.__v5761FeedbackTriggerPositionInstalled = true;
        const SOURCE_ID = "v576-send-feedback";
        const ICON_ID = "v5761-feedback-icon";
        const STYLE_ID = "v5761-feedback-trigger-position-style";
        const HERO_SELECTOR = "#start .v40-learning-hub-hero";
        function injectStyles() {
          if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
          const style = document.createElement("style");
          style.id = STYLE_ID;
          style.textContent = `
      #start .v40-learning-hub-hero.v5761-feedback-host{position:relative;padding-right:max(64px,calc(1rem + 48px))}
      #start #${SOURCE_ID}.v5761-feedback-source{display:none!important}
      #start #${ICON_ID}{
        position:absolute;top:10px;right:10px;z-index:4;
        width:42px;height:42px;min-width:42px;min-height:42px;padding:0;
        display:grid;place-items:center;border-radius:50%;
        font-size:18px;line-height:1;box-shadow:0 6px 18px rgba(15,23,42,.14);
      }
      #start #${ICON_ID}:hover{transform:translateY(-1px)}
      #start #${ICON_ID}:focus-visible{outline:3px solid color-mix(in srgb,var(--primary) 35%,transparent);outline-offset:2px}
      @media(max-width:520px){
        #start .v40-learning-hub-hero.v5761-feedback-host{padding-right:58px}
        #start #${ICON_ID}{top:8px;right:8px;width:40px;height:40px;min-width:40px;min-height:40px}
      }
    `;
          document.head.appendChild(style);
        }
        function positionTrigger() {
          if (typeof document === "undefined") return false;
          const source = document.getElementById(SOURCE_ID);
          const hero = document.querySelector(HERO_SELECTOR);
          let icon = document.getElementById(ICON_ID);
          if (!source || !hero) {
            icon?.remove();
            return false;
          }
          source.classList.add("v5761-feedback-source");
          hero.classList.add("v5761-feedback-host");
          if (!icon) {
            icon = document.createElement("button");
            icon.id = ICON_ID;
            icon.type = "button";
            icon.className = "outline";
            icon.textContent = "💬";
            icon.setAttribute("aria-label", "Send feedback");
            icon.setAttribute("title", "Send feedback");
            icon.addEventListener("click", (event) => {
              event.preventDefault();
              const currentSource = document.getElementById(SOURCE_ID);
              if (currentSource) currentSource.click();
              else ROOT.V576ClassroomFeedbackSupport?.openStudentFeedback?.();
            });
            hero.appendChild(icon);
          }
          return true;
        }
        function wire() {
          if (typeof document === "undefined") return false;
          injectStyles();
          positionTrigger();
          window.addEventListener("v57c:home-updated", () => setTimeout(positionTrigger, 0));
          window.addEventListener("pageshow", () => setTimeout(positionTrigger, 80));
          document.addEventListener("click", (event) => {
            if (event.target?.closest?.('[data-v40-nav="home"],.back-home')) setTimeout(positionTrigger, 100);
          }, true);
          if (typeof MutationObserver !== "undefined") {
            let queued = false;
            new MutationObserver(() => {
              if (queued) return;
              queued = true;
              queueMicrotask(() => {
                queued = false;
                positionTrigger();
              });
            }).observe(document.body, { childList: true, subtree: true });
          }
          return true;
        }
        const api = Object.freeze({ positionTrigger });
        if (typeof module !== "undefined" && module.exports) module.exports = api;
        if (typeof window !== "undefined") {
          Object.defineProperty(window, "V5761FeedbackTriggerPosition", { value: api, writable: false, configurable: false });
          wire();
        }
      })();
    }
  });

  // site/v5763-teacher-feedback-header-icon.js
  var require_v5763_teacher_feedback_header_icon = __commonJS({
    "site/v5763-teacher-feedback-header-icon.js"(exports, module) {
      (() => {
        "use strict";
        const ROOT = typeof window !== "undefined" ? window : globalThis;
        if (ROOT.__v5763TeacherFeedbackHeaderIconInstalled) return;
        ROOT.__v5763TeacherFeedbackHeaderIconInstalled = true;
        const SOURCE_ID = "v576-feedback-inbox";
        const ICON_ID = "v5763-teacher-feedback-icon";
        const STYLE_ID = "v5763-teacher-feedback-header-icon-style";
        const HEADER_SELECTOR = "#teacher > .header";
        const TOOLBAR_SELECTOR = "#teacher > .header > .toolbar";
        const PRIMARY_GROUP_ID = "v5763-teacher-primary-actions";
        const ACCOUNT_GROUP_ID = "v5763-teacher-account-actions";
        function injectStyles() {
          if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
          const style = document.createElement("style");
          style.id = STYLE_ID;
          style.textContent = `
      #teacher > .header.v5763-teacher-header{
        display:grid;
        grid-template-columns:minmax(230px,.8fr) minmax(0,1.4fr);
        gap:20px;
        align-items:start;
      }
      #teacher > .header > .toolbar.v5763-teacher-toolbar{
        display:grid;
        gap:10px;
        justify-items:end;
        align-content:start;
        min-width:0;
      }
      #teacher #${PRIMARY_GROUP_ID},
      #teacher #${ACCOUNT_GROUP_ID}{
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        justify-content:flex-end;
        align-items:center;
      }
      #teacher #${SOURCE_ID}.v5763-feedback-source{display:none!important}
      #teacher #${ICON_ID}{
        min-height:46px;
        padding:11px 15px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:7px;
        white-space:nowrap;
      }
      #teacher #${ICON_ID} .v5763-feedback-symbol{font-size:16px;line-height:1}
      #teacher #${ICON_ID}:hover{transform:translateY(-1px)}
      #teacher #${ICON_ID}:focus-visible{outline:3px solid color-mix(in srgb,var(--primary) 35%,transparent);outline-offset:2px}
      @media(max-width:760px){
        #teacher > .header.v5763-teacher-header{grid-template-columns:1fr;gap:14px}
        #teacher > .header > .toolbar.v5763-teacher-toolbar{justify-items:start;width:100%}
        #teacher #${PRIMARY_GROUP_ID},#teacher #${ACCOUNT_GROUP_ID}{justify-content:flex-start}
      }
      @media(max-width:520px){
        #teacher #${ICON_ID}{
          width:42px;height:42px;min-width:42px;min-height:42px;padding:0;
          border-radius:13px;
        }
        #teacher #${ICON_ID} .v5763-feedback-label{display:none}
        #teacher #${ICON_ID} .v5763-feedback-symbol{font-size:17px}
      }
    `;
          document.head.appendChild(style);
        }
        function ensureGroup(toolbar, id) {
          let group = document.getElementById(id);
          if (!group) {
            group = document.createElement("div");
            group.id = id;
            toolbar.appendChild(group);
          }
          return group;
        }
        function moveInto(node, group) {
          if (node && group && node.parentElement !== group) group.appendChild(node);
        }
        function organizeToolbar() {
          if (typeof document === "undefined") return null;
          const header = document.querySelector(HEADER_SELECTOR);
          const toolbar = document.querySelector(TOOLBAR_SELECTOR);
          if (!header || !toolbar) return null;
          header.classList.add("v5763-teacher-header");
          toolbar.classList.add("v5763-teacher-toolbar");
          const primary = ensureGroup(toolbar, PRIMARY_GROUP_ID);
          const account = ensureGroup(toolbar, ACCOUNT_GROUP_ID);
          moveInto(document.getElementById("teacher-mode"), primary);
          moveInto(document.getElementById("refresh-btn"), primary);
          moveInto(toolbar.querySelector(".back-home"), primary);
          moveInto(document.getElementById("change-password-btn"), account);
          moveInto(document.getElementById("signout-btn"), account);
          return { toolbar, primary, account };
        }
        function positionTeacherTrigger() {
          if (typeof document === "undefined") return false;
          const source = document.getElementById(SOURCE_ID);
          const groups = organizeToolbar();
          let icon = document.getElementById(ICON_ID);
          if (!source || !groups?.primary) {
            icon?.remove();
            return false;
          }
          source.classList.add("v5763-feedback-source");
          if (!icon) {
            icon = document.createElement("button");
            icon.id = ICON_ID;
            icon.type = "button";
            icon.className = "outline";
            icon.innerHTML = '<span class="v5763-feedback-symbol" aria-hidden="true">💬</span><span class="v5763-feedback-label">Feedback</span>';
            icon.setAttribute("aria-label", "Feedback Inbox");
            icon.setAttribute("title", "Feedback Inbox");
            icon.addEventListener("click", (event) => {
              event.preventDefault();
              const currentSource = document.getElementById(SOURCE_ID);
              if (currentSource) currentSource.click();
              else ROOT.V576ClassroomFeedbackSupport?.openTeacherFeedback?.();
            });
          }
          const home = groups.primary.querySelector(".back-home");
          if (icon.parentElement !== groups.primary) {
            if (home) home.insertAdjacentElement("beforebegin", icon);
            else groups.primary.appendChild(icon);
          } else if (home && icon.nextElementSibling !== home) {
            home.insertAdjacentElement("beforebegin", icon);
          }
          return true;
        }
        function wire() {
          if (typeof document === "undefined") return false;
          injectStyles();
          organizeToolbar();
          positionTeacherTrigger();
          window.addEventListener("pageshow", () => setTimeout(positionTeacherTrigger, 80));
          document.addEventListener("click", (event) => {
            if (event.target?.closest?.("#teacher-btn,.back-home")) setTimeout(positionTeacherTrigger, 100);
          }, true);
          if (typeof MutationObserver !== "undefined") {
            let queued = false;
            new MutationObserver(() => {
              if (queued) return;
              queued = true;
              queueMicrotask(() => {
                queued = false;
                positionTeacherTrigger();
              });
            }).observe(document.body, { childList: true, subtree: true });
          }
          return true;
        }
        const api = Object.freeze({ organizeToolbar, positionTeacherTrigger });
        if (typeof module !== "undefined" && module.exports) module.exports = api;
        if (typeof window !== "undefined") {
          Object.defineProperty(window, "V5763TeacherFeedbackHeaderIcon", { value: api, writable: false, configurable: false });
          wire();
        }
      })();
    }
  });

  // tooling/phase7b/v576-production-entry.js
  var import_v5761_feedback_trigger_position = __toESM(require_v5761_feedback_trigger_position());
  var import_v5763_teacher_feedback_header_icon = __toESM(require_v5763_teacher_feedback_header_icon());
})();
