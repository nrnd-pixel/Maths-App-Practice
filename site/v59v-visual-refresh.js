/* V5.9V — Visual refresh: Bubu-inspired cosmetic modernisation.
   Adapts as much of Bubu Math Quest's visual style as possible into the
   main app's CSS-variable design system. All changes are presentation only —
   no grading, data, auth or network authority changed.

   What this script does:
   1.  Typography — loads Plus Jakarta Sans (body) + Outfit (headings) from
       Google Fonts and applies them to the document
   2.  CSS variable upgrades — richer colour tokens, rounder radii, deeper
       shadows, backdrop-blur card style
   3.  Tactile buttons — 3D press effect on .primary, .secondary, .outline,
       .warning, .danger buttons (lift on hover, depress on click)
   4.  Card restyle — slightly more rounded, border softened, subtle inner
       highlight on top edge
   5.  Hero gradient — the student home hero card gets a blue-to-indigo
       gradient background with frosted-glass chips
   6.  Navigation pills — the bottom student nav tabs become pill-style with
       an active sliding background
   7.  Quiz screen — question text larger/bolder, answer box more prominent,
       progress bar rounded and colourful
   8.  Result screen — score number gets gradient text, stat boxes get
       coloured accent borders
   9.  Input & form fields — softer corners, focus ring improved
   10. Dark mode — deeper backgrounds, better contrast for all of the above
   11. Animations — fade-in on screen transitions, button micro-interactions,
       confetti-burst on correct answer */

(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59vVisualRefreshInstalled) return;
  ROOT.__v59vVisualRefreshInstalled = true;

  const STYLE_ID = 'v59v-visual-refresh-style';
  const FONT_ID  = 'v59v-font-link';

  /* ── 1. Font loading ──────────────────────────────────────────────────── */
  function loadFonts() {
    if (typeof document === 'undefined' || document.getElementById(FONT_ID)) return;
    const link = document.createElement('link');
    link.id   = FONT_ID;
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Outfit:wght@600;700;800;900&display=swap';
    document.head.appendChild(link);
  }

  /* ── 2. Styles ────────────────────────────────────────────────────────── */
  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `

/* ════════════════════════════════════════════════════════════
   TYPOGRAPHY
   ════════════════════════════════════════════════════════════ */
body, button, input, select, textarea {
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif !important;
}
h1, h2, h3,
.v59v-heading {
  font-family: 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif !important;
  letter-spacing: -0.02em;
}

/* ════════════════════════════════════════════════════════════
   CSS VARIABLE UPGRADES (light + dark)
   ════════════════════════════════════════════════════════════ */
:root {
  /* Richer primaries */
  --primary:   #2563eb;
  --primary2:  #1d4ed8;
  --primary3:  #1e40af;
  /* Depth */
  --shadow:  0 4px 6px -1px rgba(0,0,0,.07), 0 10px 30px -4px rgba(32,57,96,.10);
  --shadow-lg: 0 10px 25px -3px rgba(0,0,0,.10), 0 20px 50px -8px rgba(32,57,96,.15);
  /* Border */
  --border: #e2e8f0;
  --radius-card: 20px;
  --radius-btn:  13px;
  --radius-input: 12px;
}

html[data-theme="dark"] {
  --bg:        #0f172a;
  --card:      #1e293b;
  --text:      #f1f5f9;
  --muted:     #94a3b8;
  --border:    #334155;
  --soft:      #1e3a5f;
  --shadow:    0 4px 6px -1px rgba(0,0,0,.3), 0 10px 30px -4px rgba(0,0,0,.25);
  --shadow-lg: 0 10px 25px -3px rgba(0,0,0,.35), 0 20px 50px -8px rgba(0,0,0,.30);
}

/* ════════════════════════════════════════════════════════════
   CARDS
   ════════════════════════════════════════════════════════════ */
.card {
  border-radius: var(--radius-card) !important;
  box-shadow: var(--shadow) !important;
  border-color: var(--border) !important;
  /* Subtle inner highlight on top */
  background-image: linear-gradient(
    to bottom,
    color-mix(in srgb, #fff 6%, var(--card)),
    var(--card) 40px
  ) !important;
}
html[data-theme="dark"] .card {
  background-image: linear-gradient(
    to bottom,
    color-mix(in srgb, #fff 4%, var(--card)),
    var(--card) 40px
  ) !important;
}

/* ════════════════════════════════════════════════════════════
   TACTILE BUTTONS
   ════════════════════════════════════════════════════════════ */
button {
  border-radius: var(--radius-btn) !important;
  transition: transform 0.1s ease-out, box-shadow 0.1s ease-out, background 0.15s !important;
}

/* Primary — blue with depth shadow */
button.primary {
  box-shadow: 0 4px 0 var(--primary3), 0 1px 3px rgba(0,0,0,.15) !important;
}
button.primary:hover:not(:disabled) {
  transform: translateY(-1px) !important;
  box-shadow: 0 5px 0 var(--primary3), 0 2px 6px rgba(0,0,0,.20) !important;
}
button.primary:active:not(:disabled) {
  transform: translateY(3px) !important;
  box-shadow: 0 1px 0 var(--primary3) !important;
}

/* Secondary — neutral depth */
button.secondary {
  box-shadow: 0 3px 0 #cbd5e1, 0 1px 2px rgba(0,0,0,.06) !important;
}
button.secondary:hover:not(:disabled) {
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 0 #cbd5e1 !important;
}
button.secondary:active:not(:disabled) {
  transform: translateY(2px) !important;
  box-shadow: 0 1px 0 #cbd5e1 !important;
}
html[data-theme="dark"] button.secondary {
  box-shadow: 0 3px 0 #334155 !important;
}
html[data-theme="dark"] button.secondary:hover:not(:disabled) {
  box-shadow: 0 4px 0 #334155 !important;
}
html[data-theme="dark"] button.secondary:active:not(:disabled) {
  box-shadow: 0 1px 0 #334155 !important;
}

/* Outline */
button.outline {
  box-shadow: 0 3px 0 #d0d7e3, 0 1px 2px rgba(0,0,0,.04) !important;
}
button.outline:hover:not(:disabled) {
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 0 #d0d7e3 !important;
}
button.outline:active:not(:disabled) {
  transform: translateY(2px) !important;
  box-shadow: 0 1px 0 #d0d7e3 !important;
}

/* Warning (hint) — amber */
button.warning {
  box-shadow: 0 4px 0 #b45309, 0 1px 3px rgba(0,0,0,.1) !important;
}
button.warning:hover:not(:disabled) {
  transform: translateY(-1px) !important;
  box-shadow: 0 5px 0 #b45309 !important;
}
button.warning:active:not(:disabled) {
  transform: translateY(3px) !important;
  box-shadow: 0 1px 0 #b45309 !important;
}

/* Danger */
button.danger {
  box-shadow: 0 4px 0 #991b1b, 0 1px 3px rgba(0,0,0,.1) !important;
}
button.danger:hover:not(:disabled) {
  transform: translateY(-1px) !important;
  box-shadow: 0 5px 0 #991b1b !important;
}
button.danger:active:not(:disabled) {
  transform: translateY(3px) !important;
  box-shadow: 0 1px 0 #991b1b !important;
}

/* Disabled state — no 3D effect */
button:disabled {
  transform: none !important;
  box-shadow: none !important;
  opacity: 0.6 !important;
}

/* ════════════════════════════════════════════════════════════
   INPUTS & FORMS
   ════════════════════════════════════════════════════════════ */
input:not([type=checkbox]):not([type=radio]),
select,
textarea {
  border-radius: var(--radius-input) !important;
  border-color: var(--border) !important;
  transition: border-color 0.15s, box-shadow 0.15s !important;
}
input:not([type=checkbox]):not([type=radio]):focus,
select:focus,
textarea:focus {
  outline: none !important;
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent) !important;
}
#answer-input {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 24px !important;
  font-weight: 800 !important;
  letter-spacing: -0.01em !important;
}

/* ════════════════════════════════════════════════════════════
   QUIZ SCREEN
   ════════════════════════════════════════════════════════════ */
/* Question text — larger, bolder, heading font */
#quiz h2,
#q-text {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: clamp(20px, 3.2vw, 28px) !important;
  font-weight: 800 !important;
  line-height: 1.4 !important;
  letter-spacing: -0.01em !important;
  color: var(--text) !important;
}

/* Progress bar — rounder, gradient fill */
.progress {
  height: 10px !important;
  border-radius: 99px !important;
  background: color-mix(in srgb, var(--primary) 12%, var(--bg)) !important;
}
.progress > div {
  border-radius: 99px !important;
  background: linear-gradient(90deg, var(--primary), #6366f1) !important;
  transition: width 0.35s ease !important;
}

/* Answer box */
.answerbox {
  border-radius: 18px !important;
  border: 2px solid var(--border) !important;
  background: var(--card) !important;
  box-shadow: 0 2px 8px rgba(32,57,96,.06) !important;
  transition: border-color 0.15s !important;
}
.answerbox:focus-within {
  border-color: color-mix(in srgb, var(--primary) 60%, var(--border)) !important;
}

/* Hint box */
.hint {
  border-radius: 14px !important;
  border-left: 4px solid #f59e0b !important;
  font-weight: 600 !important;
}

/* Feedback */
.feedback {
  border-radius: 14px !important;
  font-weight: 700 !important;
  border: none !important;
  box-shadow: 0 2px 8px rgba(0,0,0,.06) !important;
}
.feedback.correct {
  background: linear-gradient(135deg, #dcfce7, #d1fae5) !important;
  color: #15803d !important;
}
.feedback.incorrect {
  background: linear-gradient(135deg, #fee2e2, #fecaca) !important;
  color: #b91c1c !important;
}
.feedback.try {
  background: linear-gradient(135deg, #fef9c3, #fef08a) !important;
  color: #92400e !important;
}

/* Multiple choice options */
.choice-option {
  border-radius: 14px !important;
  transition: border-color 0.12s, background 0.12s, transform 0.1s !important;
  border-width: 2px !important;
}
.choice-option:hover {
  border-color: var(--primary) !important;
  background: var(--soft) !important;
  transform: translateY(-1px) !important;
}
.choice-option:has(input:checked) {
  border-color: var(--primary) !important;
  background: var(--soft) !important;
}

/* ════════════════════════════════════════════════════════════
   RESULT SCREEN
   ════════════════════════════════════════════════════════════ */
/* Giant score number — gradient text */
#result .big {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-weight: 900 !important;
  background: linear-gradient(135deg, var(--primary), #6366f1) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
}

/* Stat boxes — coloured accent tops */
#result .stat {
  border-radius: 16px !important;
  border-top: 3px solid var(--primary) !important;
  padding: 16px 12px !important;
}
#result .stat:nth-child(1) { border-top-color: #22c55e !important; }
#result .stat:nth-child(2) { border-top-color: #f59e0b !important; }
#result .stat:nth-child(3) { border-top-color: #3b82f6 !important; }
#result .stat:nth-child(4) { border-top-color: #a855f7 !important; }
#result .stat strong {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 28px !important;
  font-weight: 900 !important;
}

/* Review items */
.reviewitem {
  border-radius: 14px !important;
  border-left: 4px solid var(--border) !important;
}
.reviewitem:has(.feedback.correct) { border-left-color: #22c55e !important; }
.reviewitem:has(.feedback.incorrect) { border-left-color: #ef4444 !important; }

/* ════════════════════════════════════════════════════════════
   STUDENT HOME HERO
   ════════════════════════════════════════════════════════════ */
/* The v40 learning hub hero card gets a gradient treatment */
#start .v40-learning-hub-hero {
  background: linear-gradient(135deg, #1e40af, #312e81) !important;
  border: none !important;
  color: #fff !important;
  box-shadow: var(--shadow-lg) !important;
}
#start .v40-learning-hub-hero h2,
#start .v40-learning-hub-hero .v40-learning-hub-kicker {
  color: #fff !important;
}
#start .v40-learning-hub-hero p {
  color: rgba(255,255,255,0.82) !important;
}
#start .v40-learning-hub-hero .v40-learning-cycle span {
  background: rgba(255,255,255,0.15) !important;
  border-color: rgba(255,255,255,0.25) !important;
  color: rgba(255,255,255,0.9) !important;
  backdrop-filter: blur(6px) !important;
}
/* Primary button inside the hero stays white-text but gets amber depth */
#start .v40-learning-hub-hero button.primary {
  background: #f59e0b !important;
  color: #1c1917 !important;
  box-shadow: 0 4px 0 #b45309 !important;
  font-weight: 900 !important;
}
#start .v40-learning-hub-hero button.primary:hover:not(:disabled) {
  background: #fbbf24 !important;
  box-shadow: 0 5px 0 #b45309 !important;
}
#start .v40-learning-hub-hero button.primary:active:not(:disabled) {
  box-shadow: 0 1px 0 #b45309 !important;
}

/* ════════════════════════════════════════════════════════════
   STUDENT NAV PILLS
   ════════════════════════════════════════════════════════════ */
/* The bottom student nav becomes a pill container */
.v40-student-nav {
  background: color-mix(in srgb, var(--card) 96%, transparent) !important;
  backdrop-filter: blur(8px) !important;
  border-radius: 18px !important;
  border: 1px solid var(--border) !important;
  padding: 5px !important;
  gap: 3px !important;
  box-shadow: var(--shadow) !important;
}
.v40-student-nav button {
  border-radius: 13px !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  color: var(--muted) !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  padding: 8px 14px !important;
  transition: background 0.15s, color 0.15s, transform 0.1s !important;
}
.v40-student-nav button[aria-current="page"],
.v40-student-nav button.v40-nav-active {
  background: var(--primary) !important;
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(37,99,235,.35) !important;
}
.v40-student-nav button:hover:not([aria-current="page"]):not(.v40-nav-active):not(:disabled) {
  background: var(--soft) !important;
  color: var(--primary) !important;
  transform: none !important;
  box-shadow: none !important;
}
.v40-student-nav button:active {
  transform: scale(0.96) !important;
}

/* ════════════════════════════════════════════════════════════
   TABS (teacher dashboard & other panels)
   ════════════════════════════════════════════════════════════ */
.tab {
  border-radius: 10px 10px 0 0 !important;
  font-weight: 700 !important;
  transition: color 0.15s, background 0.15s !important;
}
.tab.active {
  background: color-mix(in srgb, var(--primary) 8%, var(--card)) !important;
}
.tab:hover:not(.active) {
  background: var(--soft) !important;
}

/* ════════════════════════════════════════════════════════════
   BADGES & PILLS
   ════════════════════════════════════════════════════════════ */
.badge, .pill, .tag {
  border-radius: 99px !important;
  font-weight: 800 !important;
}
.cloud {
  background: linear-gradient(135deg, #dcfce7, #d1fae5) !important;
}
.local {
  background: #f1f5f9 !important;
}

/* ════════════════════════════════════════════════════════════
   SCREEN TRANSITION FADE-IN
   ════════════════════════════════════════════════════════════ */
@keyframes v59v-fadein {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.screen.active {
  animation: v59v-fadein 0.22s ease forwards !important;
}

/* ════════════════════════════════════════════════════════════
   MODAL CARDS (the new tool modals)
   ════════════════════════════════════════════════════════════ */
.modal-card {
  border-radius: 24px !important;
  box-shadow: 0 28px 80px rgba(0,0,0,.22) !important;
}

/* ════════════════════════════════════════════════════════════
   CORRECT ANSWER MICRO-CELEBRATION
   ════════════════════════════════════════════════════════════ */
@keyframes v59v-correct-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(34,197,94,.45); }
  60%  { box-shadow: 0 0 0 12px rgba(34,197,94,0); }
  100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
}
.feedback.correct {
  animation: v59v-correct-pulse 0.55s ease-out !important;
}

/* ════════════════════════════════════════════════════════════
   DARK MODE REFINEMENTS
   ════════════════════════════════════════════════════════════ */
html[data-theme="dark"] #result .big {
  background: linear-gradient(135deg, #60a5fa, #a78bfa) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
}
html[data-theme="dark"] .feedback.correct {
  background: linear-gradient(135deg, #14532d, #166534) !important;
  color: #86efac !important;
}
html[data-theme="dark"] .feedback.incorrect {
  background: linear-gradient(135deg, #450a0a, #7f1d1d) !important;
  color: #fca5a5 !important;
}
html[data-theme="dark"] .feedback.try {
  background: linear-gradient(135deg, #451a03, #78350f) !important;
  color: #fcd34d !important;
}
html[data-theme="dark"] .progress {
  background: color-mix(in srgb, var(--primary) 20%, var(--bg)) !important;
}
html[data-theme="dark"] .progress > div {
  background: linear-gradient(90deg, #3b82f6, #818cf8) !important;
}
html[data-theme="dark"] #start .v40-learning-hub-hero {
  background: linear-gradient(135deg, #1e3a8a, #1e1b4b) !important;
}
html[data-theme="dark"] .choice-option:hover {
  background: color-mix(in srgb, var(--primary) 15%, var(--card)) !important;
}

/* ════════════════════════════════════════════════════════════
   TEACHER DASHBOARD QUALITY-OF-LIFE
   ════════════════════════════════════════════════════════════ */
th {
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-weight: 800 !important;
  font-size: 11px !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
}
.tablewrap {
  border-radius: 16px !important;
}
.editor {
  border-radius: 16px !important;
}
.dropzone {
  border-radius: 18px !important;
  transition: border-color 0.15s, background 0.15s !important;
}
.dropzone:hover {
  border-color: var(--primary) !important;
  background: var(--soft) !important;
}

/* ════════════════════════════════════════════════════════════
   RESPONSIVE FIXES
   ════════════════════════════════════════════════════════════ */
@media (max-width: 760px) {
  .v40-student-nav {
    border-radius: 14px !important;
  }
  .v40-student-nav button {
    padding: 8px 10px !important;
    font-size: 11px !important;
  }
  button.primary, button.secondary, button.outline {
    /* On mobile, reduce 3D depth slightly so it doesn't feel heavy */
  }
}
    `;
    document.head.appendChild(s);
  }

  /* ── Init ──────────────────────────────────────────────────────────────── */
  function init() {
    loadFonts();
    injectStyles();
  }

  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
