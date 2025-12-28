import { safeLocalStorageGet, safeJsonParse } from './utils.js';

export const STORAGE_KEY = "snippets.v1";
export const SETTINGS_KEY = "snippets.settings.v1";
export const DEFAULT_FONT_SIZE = 15;
export const DEFAULT_FONT_FAMILY = "'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace";
export const DEFAULT_SIDEBAR_WIDTH = 300;
export const STORAGE_WARNING_BYTES = 5 * 1024 * 1024;

export function loadSnippets() {
  const raw = safeLocalStorageGet(STORAGE_KEY);
  if (raw === null || raw === undefined) return [];
  const parsed = safeJsonParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveSnippets(snippets, { onStatus } = {}) {
  try {
    const data = JSON.stringify(snippets);

    if (data.length > STORAGE_WARNING_BYTES && onStatus) {
      onStatus('Warning: Storage nearly full');
    }

    localStorage.setItem(STORAGE_KEY, data);
  } catch (e) {
    if (onStatus) {
      if (e.name === 'QuotaExceededError') {
        onStatus('Error: Storage quota exceeded');
      } else {
        onStatus('Error: Failed to save');
      }
    }
    console.error('Failed to save snippets', e);
  }
}

export function loadSettings() {
  const raw = safeLocalStorageGet(SETTINGS_KEY);
  const parsed = safeJsonParse(raw, {});

  return {
    fontSize: parsed.fontSize ?? DEFAULT_FONT_SIZE,
    fontFamily: parsed.fontFamily ?? DEFAULT_FONT_FAMILY,
    sidebarWidth: parsed.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH
  };
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}
