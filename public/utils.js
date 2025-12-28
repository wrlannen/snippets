// Shared utility functions for Snippets

/**
 * Returns the current time as an ISO 8601 string.
 */
export function nowIso() {
  return new Date().toISOString();
}

/**
 * Generates a secure unique identifier for snippets.
 * Uses crypto.randomUUID when available, otherwise falls back to crypto.getRandomValues.
 */
export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const hex = [...buf].map(b => b.toString(16).padStart(2, '0'));
    return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
  }

  throw new Error('Secure ID generation is unavailable');
}

/**
 * Safely reads from localStorage, returning null on failure.
 */
export function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error('localStorage read failed', e);
    return null;
  }
}

/**
 * Safely parses JSON with a fallback value.
 */
export function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return (parsed === null || parsed === undefined) ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/**
 * Escapes HTML special characters to prevent XSS.
 */
export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Formats an ISO date string as a human-readable relative time.
 */
export function formatDate(iso) {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return diffMins + "m ago";
    if (diffMins < 1440) return Math.floor(diffMins / 60) + "h ago";
    if (diffMins < 10080) return Math.floor(diffMins / 1440) + "d ago";

    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

/**
 * Copies text to the clipboard using modern or legacy APIs.
 */
export async function copyTextToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
