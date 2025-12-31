/**
 * Synchronous Storage Wrapper
 *
 * Provides a synchronous API over IndexedDB by maintaining an in-memory cache.
 * This allows existing code to work without async/await refactoring while
 * still benefiting from IndexedDB's larger storage capacity.
 *
 * The cache is initialized on app load and kept in sync with IndexedDB.
 */

import * as IDB from './storage-idb.js';

// In-memory cache
let snippetsCache = [];
let settingsCache = {
  fontSize: 15,
  fontFamily: "'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
  sidebarWidth: 300
};
let isInitialized = false;
let initPromise = null;

/**
 * Initialize storage and load data into memory cache
 * Must be called before using any storage functions
 */
export async function initStorage() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Migrate from localStorage if needed
      const migration = await IDB.migrateFromLocalStorage();

      if (migration.snippetsMigrated > 0 || migration.settingsMigrated) {
        console.log('Migration completed:', migration);
      }

      // Load data into cache
      snippetsCache = await IDB.loadSnippets();
      settingsCache = await IDB.loadSettings();

      isInitialized = true;

      return { success: true, migration };
    } catch (error) {
      console.error('Storage initialization failed:', error);
      isInitialized = true; // Still mark as initialized to allow app to work
      return { success: false, error };
    }
  })();

  return initPromise;
}

/**
 * Load all snippets (synchronous, from cache)
 */
export function loadSnippets() {
  if (!isInitialized) {
    console.warn('Storage not initialized, returning empty array');
    return [];
  }
  return [...snippetsCache];
}

/**
 * Save all snippets (synchronous write to cache, async persist to IndexedDB)
 */
export function saveSnippets(snippets, { onStatus } = {}) {
  if (!isInitialized) {
    console.warn('Storage not initialized');
    return;
  }

  snippetsCache = [...snippets];

  // Persist to IndexedDB asynchronously (fire and forget)
  IDB.saveSnippets(snippets, { onStatus }).catch(error => {
    console.error('Failed to persist snippets to IndexedDB:', error);
    if (onStatus) {
      onStatus('Error: Failed to save');
    }
  });
}

/**
 * Load settings (synchronous, from cache)
 */
export function loadSettings() {
  if (!isInitialized) {
    console.warn('Storage not initialized, returning defaults');
    return {
      fontSize: 15,
      fontFamily: "'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
      sidebarWidth: 300
    };
  }
  return { ...settingsCache };
}

/**
 * Save settings (synchronous write to cache, async persist to IndexedDB)
 */
export function saveSettings(settings) {
  if (!isInitialized) {
    console.warn('Storage not initialized');
    return;
  }

  settingsCache = { ...settings };

  // Persist to IndexedDB asynchronously (fire and forget)
  IDB.saveSettings(settings).catch(error => {
    console.error('Failed to persist settings to IndexedDB:', error);
  });
}

/**
 * Force a sync to IndexedDB (useful before page unload)
 */
export async function flushToStorage() {
  try {
    await IDB.saveSnippets(snippetsCache);
    await IDB.saveSettings(settingsCache);
    return true;
  } catch (error) {
    console.error('Failed to flush to storage:', error);
    return false;
  }
}

/**
 * Get storage statistics
 */
export async function getStorageStats() {
  return await IDB.getStorageStats();
}

// Export constants for backward compatibility
export const STORAGE_KEY = "snippets.v1";
export const SETTINGS_KEY = "snippets.settings.v1";
export const DEFAULT_FONT_SIZE = 15;
export const DEFAULT_FONT_FAMILY = "'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace";
export const DEFAULT_SIDEBAR_WIDTH = 300;
