/* V5.0B4A — Accessibility & Interaction Polish.
   Adds keyboard/focus behavior around the established Question Preview modal.
   Presentation/interaction only: no question, grading, auth, Practice, Exam or data changes. */
(() => {
  'use strict';

  const MODAL_ID = 'question-preview-modal';
  const CLOSE_ID = 'close-preview';
  const FOCUSABLE = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  let previousFocus = null;
  let previousOverflow = '';
  let open = false;

  function modal(){ return document.getElementById(MODAL_ID); }
  function isVisible(root){ return !!root && !root.classList.contains('hidden'); }

  function focusables(root){
    return [...root.querySelectorAll(FOCUSABLE)].filter(node => {
      const style = window.getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  function onOpen(root){
    if (open) return;
    open = true;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    root.setAttribute('aria-describedby','v50-preview-dialog-help');
    let help = root.querySelector('#v50-preview-dialog-help');
    if (!help){
      help = document.createElement('span');
      help.id = 'v50-preview-dialog-help';
      help.className = 'hidden';
      help.textContent = 'Question preview dialog. Press Escape to close.';
      root.appendChild(help);
    }

    window.requestAnimationFrame(() => {
      const close = document.getElementById(CLOSE_ID);
      const first = focusables(root)[0];
      (close || first || root).focus?.({preventScroll:true});
    });
  }

  function onClose(){
    if (!open) return;
    open = false;
    document.body.style.overflow = previousOverflow;
    const target = previousFocus;
    previousFocus = null;
    if (target && document.contains(target)){
      window.requestAnimationFrame(() => target.focus?.({preventScroll:true}));
    }
  }

  function closeModal(root){
    const close = document.getElementById(CLOSE_ID);
    if (close){
      close.click();
      return;
    }
    root.classList.add('hidden');
  }

  function handleKeydown(event){
    const root = modal();
    if (!isVisible(root)) return;

    if (event.key === 'Escape'){
      event.preventDefault();
      event.stopPropagation();
      closeModal(root);
      return;
    }

    if (event.key !== 'Tab') return;
    const items = focusables(root);
    if (!items.length){
      event.preventDefault();
      root.focus?.();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !root.contains(active))){
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !root.contains(active))){
      event.preventDefault();
      first.focus();
    }
  }

  function wire(){
    const root = modal();
    if (!root || root.dataset.v50Accessibility === '1') return;
    root.dataset.v50Accessibility = '1';
    if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex','-1');

    const observer = new MutationObserver(() => {
      if (isVisible(root)) onOpen(root);
      else onClose();
    });
    observer.observe(root,{attributes:true,attributeFilter:['class']});

    document.addEventListener('keydown',handleKeydown,true);
    if (isVisible(root)) onOpen(root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
