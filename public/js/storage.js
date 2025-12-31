/**
 * Storage Module
 *
 * Manages IndexedDB persistence for snippets and settings:
 * - Load and save snippets with error handling
 * - Load and save user settings (fonts, sidebar width)
 * - Storage quota warnings and error handling
 * - 50MB+ storage capacity
 *
 * Uses a synchronous in-memory cache over IndexedDB for compatibility
 * with existing synchronous code.
 */

export {
  initStorage,
  loadSnippets,
  saveSnippets,
  loadSettings,
  saveSettings,
  flushToStorage,
  getStorageStats,
  STORAGE_KEY,
  SETTINGS_KEY,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_FAMILY,
  DEFAULT_SIDEBAR_WIDTH
} from './storage-sync.js';
