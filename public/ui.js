/**
 * UI Module
 * 
 * DOM helpers for status messages and footer UI:
 * - Status message display and flashing
 * - Character count updates
 * - DOM element binding and reference management
 * - Temporary status highlights
 * 
 */

let els = null;

export function bindEls(domRefs) {
  els = domRefs;
  return els;
}

export function getEls() {
  return els;
}

export function setStatus(text) {
  if (els?.status) {
    els.status.textContent = text;
  }
}

export function flashStatus(text, ms = 1200, options = {}) {
  if (!els?.status) return;
  const previousText = els.status.textContent;
  const highlightClass = options?.highlightClass;
  const hadHighlight = highlightClass ? els.status.classList.contains(highlightClass) : false;

  setStatus(text);
  if (highlightClass && !hadHighlight) els.status.classList.add(highlightClass);

  window.setTimeout(() => {
    if (els?.status?.textContent === text) {
      setStatus(previousText);
      if (highlightClass && !hadHighlight) els.status.classList.remove(highlightClass);
    }
  }, ms);
}

export function updateCharCount(content) {
  if (!els?.charCount) return;
  const len = (content ?? "").length;
  const word = len === 1 ? "character" : "characters";
  els.charCount.textContent = len.toLocaleString() + " " + word;
}
