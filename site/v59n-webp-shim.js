/* V5.9N — WebP image substitution shim.
   Rewrites local question image URLs from images/*.png → images/*.webp
   for browsers that support WebP (all modern browsers).
   Falls back silently to the original PNG on error.
   No DB changes, no auth, no grading. Presentation only. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59nWebpShimInstalled) return;
  ROOT.__v59nWebpShimInstalled = true;

  // Only rewrite local images/ paths — never touch Supabase Storage URLs
  function toWebp(url) {
    if (typeof url !== 'string') return url;
    // Match: images/filename.png (with optional leading ./ or /)
    if (/^\.?\/?images\/[A-Za-z0-9._/-]+\.png$/i.test(url)) {
      return url.replace(/\.png$/i, '.webp');
    }
    return url;
  }

  // Patch a single <img> element: rewrite src to .webp, keep .png as fallback
  function patchImg(img) {
    if (img.dataset.v59nPatched) return;
    img.dataset.v59nPatched = '1';

    const webpSrc = toWebp(img.src || img.getAttribute('src') || '');
    if (!webpSrc || webpSrc === img.src) return;

    img.onerror = function () {
      // WebP failed — restore original PNG
      img.onerror = null;
      img.src = img.dataset.v59nPng || img.src;
    };
    img.dataset.v59nPng = img.src;
    img.src = webpSrc;
  }

  // Intercept renderQuestion — patch q-image after each question renders
  function hookRenderQuestion() {
    const orig = ROOT.renderQuestion;
    if (typeof orig !== 'function' || orig.__v59nHooked) return;
    ROOT.renderQuestion = function (...args) {
      const r = orig.apply(this, args);
      const img = document.getElementById('q-image');
      if (img && !img.classList.contains('hidden')) patchImg(img);
      return r;
    };
    ROOT.renderQuestion.__v59nHooked = true;
  }

  // Also patch any question image already in the DOM on load
  function patchAll() {
    document.querySelectorAll('img[src]').forEach(img => {
      if (/images\/[^/]+\.png$/i.test(img.src)) patchImg(img);
    });
  }

  // Watch for new images added dynamically (exam paper, preview modal, etc.)
  function watchDom() {
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.tagName === 'IMG') {
            if (/images\/[^/]+\.png$/i.test(node.src)) patchImg(node);
          }
          node.querySelectorAll?.('img[src]').forEach(img => {
            if (/images\/[^/]+\.png$/i.test(img.src)) patchImg(img);
          });
        }
        // Also catch src attribute changes
        if (m.type === 'attributes' && m.target.tagName === 'IMG') {
          const img = m.target;
          if (/images\/[^/]+\.png$/i.test(img.getAttribute('src') || '')) {
            img.dataset.v59nPatched = ''; // allow re-patch on src change
            patchImg(img);
          }
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });
  }

  function init() {
    patchAll();
    watchDom();
    // Hook renderQuestion when available
    const tryHook = () => {
      if (typeof ROOT.renderQuestion === 'function') {
        hookRenderQuestion();
      } else {
        setTimeout(tryHook, 300);
      }
    };
    tryHook();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
