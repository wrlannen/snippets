/**
 * Utilities Module
 * 
 * Shared utility functions used throughout the application:
 * - Secure ID generation (crypto.randomUUID)
 * - Date/time formatting
 * - HTML escaping for XSS prevention
 * - Safe JSON parsing and localStorage access
 * - Clipboard operations
 * - Text truncation
 * 
 */

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
 * Detects the CodeMirror mode from content patterns.
 * Supports: javascript, xml, css, htmlmixed.
 * @param {string} content - The snippet content to analyze
 * @returns {string} - The detected mode name
 */
export function detectLanguage(content) {
  if (!content || typeof content !== 'string') return 'javascript';

  const trimmed = content.trim();
  const firstLine = trimmed.split('\n')[0].toLowerCase();

  // HTML detection
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<!doctype')) return 'htmlmixed';
  if (/<html|<head|<body|<div|<span|<p\b|<h[1-6]|<section|<article|<nav|<main|<footer|<header/i.test(firstLine)) return 'htmlmixed';
  if (/<!--.*-->/.test(trimmed)) return 'htmlmixed';

  // XML detection
  if (trimmed.startsWith('<?xml')) return 'xml';
  if (trimmed.startsWith('<')) {
    // Simple XML if starts with tag but no HTML elements
    const hasHtmlTags = /<(html|head|body|div|span|p|h[1-6]|section|article|nav|main|footer|header)\b/i.test(trimmed);
    if (!hasHtmlTags) return 'xml';
  }

  // CSS detection
  if (/^[.#]?[\w-]+\s*\{/.test(trimmed)) return 'css';
  if (/^@(import|media|keyframes|charset|font-face|page)\b/.test(trimmed)) return 'css';
  if (trimmed.includes('{') && trimmed.includes('}') && /:\s*[^;]+;/.test(trimmed)) {
    // Has CSS-like property:value; patterns
    const hasJsKeywords = /\b(function|const|let|var|if|else|for|while|return|class|import|export)\b/.test(trimmed);
    if (!hasJsKeywords) return 'css';
  }

  // Default to JavaScript
  return 'javascript';
}

/**
 * Copies text to the clipboard using modern or legacy APIs.
 * Falls back to execCommand for older browsers.
 */
export async function copyTextToClipboard(text) {
  // Try modern Clipboard API first
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy method
  }

  // Fallback to execCommand for older browsers
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
