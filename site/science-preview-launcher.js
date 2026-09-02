/* Science V0.1 preview-only same-tab launcher.
   This helper is intentionally limited to Netlify deploy-preview hosts.
   It is used only to verify that the existing Maths Student ID/PIN session can
   be reused by /science/ in the same browser tab. */
(() => {
  'use strict';

  const host = String(location.hostname || '').toLowerCase();
  const isDeployPreview = host.startsWith('deploy-preview-') &&
    host.endsWith('--magical-pixie-a61111.netlify.app');

  if (!isDeployPreview) return;

  const STORAGE_KEY = 'mathStudentSessionV40';
  const BUTTON_ID = 'science-v01-preview-launcher';

  function readSession(){
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session || session.version !== 1) return null;
      if (!session.tokens?.practice) return null;
      if (Number(session.expiresAt || 0) <= Date.now()) return null;
      return session;
    } catch {
      return null;
    }
  }

  function ensureButton(){
    let button = document.getElementById(BUTTON_ID);
    if (button) return button;

    button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.setAttribute('aria-label', 'Open Science preview in this tab');
    button.style.cssText = [
      'position:fixed',
      'right:16px',
      'bottom:16px',
      'z-index:2147483000',
      'border:0',
      'border-radius:999px',
      'padding:12px 16px',
      'font:800 14px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'box-shadow:0 8px 24px rgba(0,0,0,.20)',
      'cursor:pointer',
      'background:#0f766e',
      'color:#fff'
    ].join(';');

    button.addEventListener('click', () => {
      const session = readSession();
      if (!session) {
        alert('Sign in with a Student ID and PIN first. Then tap Science Preview again.');
        return;
      }
      location.assign('/science/');
    });

    document.body.appendChild(button);
    return button;
  }

  function render(){
    const button = ensureButton();
    const session = readSession();
    const name = session?.identity?.student_name;
    button.textContent = session
      ? `🔬 Science Preview${name ? ` · ${name}` : ''}`
      : '🔬 Science Preview · Sign in first';
    button.style.opacity = session ? '1' : '.72';
  }

  render();
  window.setInterval(render, 800);
})();
