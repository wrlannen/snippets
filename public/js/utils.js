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
 * Supports: javascript, python, sql, shell, markdown, yaml, xml, css, htmlmixed, typescript, null (plain text).
 * @param {string} content - The snippet content to analyze
 * @returns {string} - The detected mode name
 */
export function detectLanguage(content) {
  if (!content || typeof content !== 'string') return 'javascript';

  const trimmed = content.trim();
  const firstLine = trimmed.split('\n')[0];
  const firstLineLower = firstLine.toLowerCase();

  // Shebang detection (Shell/Python)
  if (trimmed.startsWith('#!/bin/bash') || trimmed.startsWith('#!/bin/sh') || trimmed.startsWith('#!/usr/bin/env bash')) return 'shell';
  if (trimmed.startsWith('#!/usr/bin/env python') || trimmed.startsWith('#!/usr/bin/python')) return 'python';

  // SQL detection (check before Python to avoid 'from' confusion)
  if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH|GRANT|REVOKE|TRUNCATE|BEGIN|COMMIT|ROLLBACK)\b/i.test(trimmed)) return 'sql';
  if (/\b(WHERE|FROM|JOIN|INNER|LEFT|RIGHT|OUTER|ON|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET)\b/i.test(trimmed)) return 'sql';

  // Python detection
  if (/^(def |class |import |from .+ import|if __name__|async def |@\w+)/.test(firstLine)) return 'python';
  if (/\b(def |class |import |print\(|range\(|len\(|str\(|int\(|lambda |self\.|elif )/.test(trimmed)) return 'python';

  // Shell detection
  if (/^(echo |cd |ls |grep |curl |wget |sudo |apt |brew |export |source |alias )/.test(firstLine)) return 'shell';

  // Markdown detection
  if (/^#{1,6} /.test(firstLine)) return 'markdown'; // Headers
  if (/^```/.test(trimmed)) return 'markdown'; // Code blocks
  if (/^[-*+] /.test(firstLine)) return 'markdown'; // Lists
  if (/^\d+\. /.test(firstLine)) return 'markdown'; // Numbered lists

  // YAML detection
  if (/^---\s*$/.test(firstLine)) return 'yaml'; // YAML document start
  if (/^\w+:\s*[^{}]+$/.test(firstLine) && !trimmed.includes('{') && !trimmed.includes(';')) return 'yaml';

  // JSON detection
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return 'javascript'; // Use JS mode with JSON flag via {name: "javascript", json: true}
    } catch {
      // Not valid JSON, continue
    }
  }

  // HTML detection
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<!doctype')) return 'htmlmixed';
  if (/<html|<head|<body|<div|<span|<p\b|<h[1-6]|<section|<article|<nav|<main|<footer|<header/i.test(firstLineLower)) return 'htmlmixed';
  if (/<!--.*-->/.test(trimmed)) return 'htmlmixed';

  // XML detection
  if (trimmed.startsWith('<?xml')) return 'xml';
  if (trimmed.startsWith('<')) {
    const hasHtmlTags = /<(html|head|body|div|span|p|h[1-6]|section|article|nav|main|footer|header)\b/i.test(trimmed);
    if (!hasHtmlTags) return 'xml';
  }

  // CSS detection
  if (/^[.#]?[\w-]+\s*\{/.test(trimmed)) return 'css';
  if (/^@(import|media|keyframes|charset|font-face|page)\b/.test(trimmed)) return 'css';
  if (trimmed.includes('{') && trimmed.includes('}') && /:\s*[^;]+;/.test(trimmed)) {
    const hasJsKeywords = /\b(function|const|let|var|if|else|for|while|return|class|import|export)\b/.test(trimmed);
    if (!hasJsKeywords) return 'css';
  }

  // TypeScript detection (after JavaScript-like checks)
  if (/\b(interface|type |enum |namespace |declare |implements |extends |abstract |readonly |as |unknown |never )/.test(trimmed)) return 'javascript'; // Use JS mode for TS
  if (/:.*=>|: (string|number|boolean|any|void|unknown|never)\b/.test(trimmed)) return 'javascript';

  // Smart default: detect if content looks like code vs natural language
  const hasCodePatterns = /[{};()[\]<>]|^\s*(function|const|let|var|if|else|class|def|import|export|return|for|while|do)/m.test(trimmed);
  const hasOperators = /[=+\-*/<>!&|]{1,2}/.test(trimmed);
  const words = trimmed.split(/\s+/);
  
  // Plain text indicators:
  // - Has multiple sentences (periods, question marks, exclamation points)
  // - No code patterns or operators
  // - More than 10 words
  const hasSentences = (trimmed.match(/[.!?]\s/g) || []).length >= 2;
  const hasMultipleWords = words.length >= 10;
  
  // If it looks like natural language prose, use plain text
  if (hasSentences && !hasCodePatterns && !hasOperators) return null;
  if (hasMultipleWords && !hasCodePatterns && !hasOperators) return null;
  
  // Default to JavaScript for ambiguous code-like content
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
