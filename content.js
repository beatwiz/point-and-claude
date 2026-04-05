(() => {
  if (window.__pointAndClaude) return;
  window.__pointAndClaude = true;

  let active = false;
  let highlightEl = null;
  let labelEl = null;
  let toastEl = null;
  let currentTarget = null;
  let toastTimer = null;

  // --- Messaging ---

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'toggle') {
      active ? deactivate() : activate();
      sendResponse({ active });
    } else if (msg.action === 'getState') {
      sendResponse({ active });
    }
    return true;
  });

  // --- Lifecycle ---

  function activate() {
    active = true;
    createOverlayElements();
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mousedown', onSuppressEvent, true);
    document.addEventListener('mouseup', onSuppressEvent, true);
    document.addEventListener('pointerdown', onSuppressEvent, true);
    document.addEventListener('pointerup', onSuppressEvent, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('auxclick', onSuppressEvent, true);
    document.addEventListener('dblclick', onSuppressEvent, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('scroll', onScroll, true);
  }

  function deactivate() {
    active = false;
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('mousedown', onSuppressEvent, true);
    document.removeEventListener('mouseup', onSuppressEvent, true);
    document.removeEventListener('pointerdown', onSuppressEvent, true);
    document.removeEventListener('pointerup', onSuppressEvent, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('auxclick', onSuppressEvent, true);
    document.removeEventListener('dblclick', onSuppressEvent, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('scroll', onScroll, true);
    removeOverlayElements();
    currentTarget = null;
  }

  function createOverlayElements() {
    highlightEl = document.createElement('div');
    highlightEl.id = 'pac-highlight';

    labelEl = document.createElement('div');
    labelEl.id = 'pac-label';

    toastEl = document.createElement('div');
    toastEl.id = 'pac-toast';

    document.documentElement.appendChild(highlightEl);
    document.documentElement.appendChild(labelEl);
    document.documentElement.appendChild(toastEl);
  }

  function removeOverlayElements() {
    highlightEl?.remove();
    labelEl?.remove();
    toastEl?.remove();
    highlightEl = null;
    labelEl = null;
    toastEl = null;
  }

  // --- Event Handlers ---

  function onMouseMove(e) {
    if (!active || !highlightEl) return;

    highlightEl.style.display = 'none';
    labelEl.style.display = 'none';

    const target = document.elementFromPoint(e.clientX, e.clientY);

    highlightEl.style.display = '';
    labelEl.style.display = '';

    if (!target || isIgnored(target)) {
      hideHighlight();
      currentTarget = null;
      return;
    }

    currentTarget = target;
    positionHighlight(target);
  }

  function onSuppressEvent(e) {
    if (!active || !currentTarget) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function onClick(e) {
    if (!active || !currentTarget) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const info = buildElementInfo(currentTarget);
    copyToClipboard(info);
    showToast('Copied to clipboard');
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      deactivate();
      chrome.runtime.sendMessage({ action: 'deactivated' });
    }
  }

  function onScroll() {
    if (currentTarget) {
      positionHighlight(currentTarget);
    }
  }

  // --- Highlight Positioning ---

  function positionHighlight(el) {
    const rect = el.getBoundingClientRect();

    highlightEl.style.display = 'block';
    highlightEl.style.top = (rect.top + window.scrollY) + 'px';
    highlightEl.style.left = (rect.left + window.scrollX) + 'px';
    highlightEl.style.width = rect.width + 'px';
    highlightEl.style.height = rect.height + 'px';

    labelEl.textContent = shortLabel(el);
    labelEl.style.display = 'block';

    let labelTop = rect.top + window.scrollY - 18;
    if (labelTop < window.scrollY) {
      labelTop = rect.bottom + window.scrollY + 2;
    }
    labelEl.style.top = labelTop + 'px';
    labelEl.style.left = (rect.left + window.scrollX) + 'px';
  }

  function hideHighlight() {
    if (highlightEl) highlightEl.style.display = 'none';
    if (labelEl) labelEl.style.display = 'none';
  }

  function isIgnored(el) {
    return (
      el === document.documentElement ||
      el === document.body ||
      (el.id && el.id.startsWith('pac-'))
    );
  }

  // --- Label ---

  function shortLabel(el) {
    let label = el.tagName.toLowerCase();
    if (el.id) label += '#' + el.id;
    else if (el.classList.length > 0) {
      const classes = Array.from(el.classList)
        .filter(c => !c.startsWith('pac-'))
        .slice(0, 3);
      if (classes.length) label += '.' + classes.join('.');
      if (el.classList.length > 3) label += '\u2026';
    }
    const text = directText(el);
    if (text) label += ' \u2014 "' + text + '"';
    return label;
  }

  function directText(el) {
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    text = text.trim().replace(/\s+/g, ' ');
    if (text.length > 30) text = text.substring(0, 30) + '\u2026';
    return text;
  }

  // --- Element Info (LLM-optimized output) ---

  function buildElementInfo(el) {
    const selector = bestSelector(el);
    const path = cssPath(el);
    const tag = el.tagName.toLowerCase();
    const text = visibleText(el);
    const ariaLabel = el.getAttribute('aria-label');
    const role = el.getAttribute('role');
    const html = compactOuterHtml(el);
    const attrs = relevantAttributes(el);
    const rect = el.getBoundingClientRect();

    const lines = [];
    lines.push(`Page: ${location.href}`);
    if (document.title) lines.push(`Title: ${document.title}`);
    lines.push('');
    lines.push(`Selector: \`${selector}\``);
    lines.push(`Path: \`${path}\``);
    lines.push(`Tag: ${tag}`);
    if (text) lines.push(`Text: "${text}"`);
    if (ariaLabel) lines.push(`Aria: "${ariaLabel}"`);
    if (role) lines.push(`Role: ${role}`);
    if (attrs) lines.push(`Attributes: ${attrs}`);
    lines.push(`HTML: \`${html}\``);
    lines.push(`Rect: ${Math.round(rect.width)}\u00d7${Math.round(rect.height)} at (${Math.round(rect.x)}, ${Math.round(rect.y)})`);

    return lines.join('\n');
  }

  // --- Selector Generation ---

  function bestSelector(el) {
    // 1. ID
    if (el.id && !el.id.startsWith('pac-')) {
      return '#' + CSS.escape(el.id);
    }

    // 2. Test attributes (verify uniqueness)
    for (const attr of ['data-testid', 'data-cy', 'data-test', 'data-test-id', 'data-qa']) {
      const val = el.getAttribute(attr);
      if (val) {
        const sel = `[${attr}="${CSS.escape(val)}"]`;
        try { if (document.querySelectorAll(sel).length === 1) return sel; } catch {}
      }
    }

    // 3. Name attribute (forms)
    if (el.name) {
      const sel = `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`;
      try { if (document.querySelectorAll(sel).length === 1) return sel; } catch {}
    }

    // 4. Unique aria-label
    if (el.getAttribute('aria-label')) {
      const sel = `${el.tagName.toLowerCase()}[aria-label="${CSS.escape(el.getAttribute('aria-label'))}"]`;
      try { if (document.querySelectorAll(sel).length === 1) return sel; } catch {}
    }

    // 5. Unique class combination
    if (el.classList.length > 0) {
      const classes = Array.from(el.classList).filter(c => !c.startsWith('pac-'));
      if (classes.length) {
        const sel = el.tagName.toLowerCase() + '.' + classes.map(c => CSS.escape(c)).join('.');
        try { if (document.querySelectorAll(sel).length === 1) return sel; } catch {}
      }
    }

    // 6. Fallback: CSS path
    return cssPath(el);
  }

  function cssPath(el) {
    const parts = [];
    let cur = el;

    while (cur && cur !== document.body && cur !== document.documentElement) {
      let part = cur.tagName.toLowerCase();

      if (cur.id && !cur.id.startsWith('pac-')) {
        parts.unshift(part + '#' + CSS.escape(cur.id));
        break;
      }

      const parent = cur.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(s => s.tagName === cur.tagName);
        if (siblings.length > 1) {
          part += ':nth-of-type(' + (siblings.indexOf(cur) + 1) + ')';
        }
      }

      parts.unshift(part);
      cur = cur.parentElement;
    }

    return parts.join(' > ');
  }

  // --- Text & Attributes ---

  function visibleText(el) {
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (!text) return '';
    return text.length > 80 ? text.substring(0, 80) + '\u2026' : text;
  }

  function relevantAttributes(el) {
    const skip = new Set(['id', 'class', 'style', 'aria-label', 'role']);
    const attrs = [];
    for (const attr of el.attributes) {
      if (skip.has(attr.name)) continue;
      if (attr.name.startsWith('on')) continue;
      if (attr.name.startsWith('pac-')) continue;
      const val = attr.value.length > 60 ? attr.value.substring(0, 60) + '\u2026' : attr.value;
      attrs.push(`${attr.name}="${val}"`);
    }
    return attrs.join(', ');
  }

  function compactOuterHtml(el) {
    const clone = el.cloneNode(false);
    clone.removeAttribute('style');

    if (el.children.length === 0) {
      return el.outerHTML.length > 300 ? el.outerHTML.substring(0, 300) + '\u2026' : el.outerHTML;
    }

    // Show opening tag + text hint + closing tag
    let html = clone.outerHTML;
    const text = directText(el);
    if (text) {
      html = html.replace(/><\//, `>${text}</`);
    } else if (el.children.length > 0) {
      html = html.replace(/><\//, '>\u2026</');
    }
    return html.length > 300 ? html.substring(0, 300) + '\u2026' : html;
  }

  // --- Clipboard & Toast ---

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('pac-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl?.classList.remove('pac-visible');
    }, 1200);
  }
})();
