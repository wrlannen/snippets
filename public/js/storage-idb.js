/**
 * IndexedDB Storage Module
 *
 * Provides a robust storage layer using IndexedDB:
 * - 50MB+ storage capacity
 * - Asynchronous operations (non-blocking)
 * - Transactional integrity
 * - Automatic one-time migration from localStorage (legacy)
 *
 */

// =============================================================================
// Database Configuration
// =============================================================================

const DB_NAME = 'snippets-db';
const DB_VERSION = 1;
const SNIPPETS_STORE = 'snippets';
const SETTINGS_STORE = 'settings';
const METADATA_STORE = 'metadata';

// =============================================================================
// Default Settings Values
// =============================================================================

/** Default editor font size in pixels */
const DEFAULT_FONT_SIZE = 15;

/** Default editor font family stack */
const DEFAULT_FONT_FAMILY = "monospace";

/** Default sidebar width in pixels */
const DEFAULT_SIDEBAR_WIDTH = 300;

// =============================================================================
// Database Instance Management
// =============================================================================

let dbInstance = null;
let initPromise = null;

/**
 * Initialize IndexedDB connection
 * @returns {Promise<IDBDatabase>}
 */
function initDB() {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB initialization failed:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      // Expose to window for test cleanup
      if (typeof window !== 'undefined') {
        window.storageDB = dbInstance;
      }
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create snippets store with indexes
      if (!db.objectStoreNames.contains(SNIPPETS_STORE)) {
        const snippetStore = db.createObjectStore(SNIPPETS_STORE, { keyPath: 'id' });
        snippetStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        snippetStore.createIndex('createdAt', 'createdAt', { unique: false });
        snippetStore.createIndex('mode', 'mode', { unique: false });
      }

      // Create settings store (single document)
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
      }

      // Create metadata store for migration tracking, etc.
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
      }
    };
  });

  return initPromise;
}

/**
 * Get database instance, initializing if needed
 * @returns {Promise<IDBDatabase>}
 */
async function getDB() {
  if (dbInstance) return dbInstance;
  return await initDB();
}

/**
 * Migrate data from localStorage to IndexedDB (one-time operation)
 * @returns {Promise<{snippetsMigrated: number, settingsMigrated: boolean, alreadyMigrated?: boolean}>}
 */
export async function migrateFromLocalStorage() {
  const db = await getDB();

  // Check if migration already done
  const metadata = await getMetadata('migrationCompleted');
  if (metadata?.value) {
    return { snippetsMigrated: 0, settingsMigrated: false, alreadyMigrated: true };
  }

  let snippetsMigrated = 0;
  let settingsMigrated = false;

  try {
    // Migrate snippets
    const oldSnippets = localStorage.getItem('snippets.v1');
    if (oldSnippets) {
      const snippets = JSON.parse(oldSnippets);
      const tx = db.transaction(SNIPPETS_STORE, 'readwrite');
      const store = tx.objectStore(SNIPPETS_STORE);

      for (const snippet of snippets) {
        store.add(snippet);
        snippetsMigrated++;
      }

      // Wait for transaction to complete
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });

      // Backup old data before clearing
      localStorage.setItem('snippets.v1.backup', oldSnippets);
      localStorage.removeItem('snippets.v1');
    }

    // Migrate settings
    const oldSettings = localStorage.getItem('snippets.settings.v1');
    if (oldSettings) {
      const settings = JSON.parse(oldSettings);
      await saveSettings(settings);
      settingsMigrated = true;

      // Backup and clear
      localStorage.setItem('snippets.settings.v1.backup', oldSettings);
      localStorage.removeItem('snippets.settings.v1');
    }

    // Mark migration complete
    await setMetadata('migrationCompleted', true);
    await setMetadata('migrationDate', new Date().toISOString());

    console.log(`Migration complete: ${snippetsMigrated} snippets, settings: ${settingsMigrated}`);

    return { snippetsMigrated, settingsMigrated, alreadyMigrated: false };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Load all snippets from IndexedDB
 * @returns {Promise<Array>}
 */
export async function loadSnippets() {
  try {
    const db = await getDB();
    const tx = db.transaction(SNIPPETS_STORE, 'readonly');
    const store = tx.objectStore(SNIPPETS_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const snippets = request.result || [];
        // Sort by updatedAt descending (most recent first)
        snippets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        resolve(snippets);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to load snippets:', error);
    return [];
  }
}

/**
 * Save all snippets to IndexedDB (bulk operation)
 * @param {Array} snippets - Array of snippet objects
 * @param {Object} options - Options object with onStatus callback
 * @returns {Promise<void>}
 */
export async function saveSnippets(snippets, { onStatus } = {}) {
  try {
    const db = await getDB();
    const tx = db.transaction(SNIPPETS_STORE, 'readwrite');
    const store = tx.objectStore(SNIPPETS_STORE);

    // Clear existing and add all
    await store.clear();

    for (const snippet of snippets) {
      await store.add(snippet);
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    // Check storage usage
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usagePercent = (estimate.usage / estimate.quota) * 100;

      if (usagePercent > 80 && onStatus) {
        onStatus('Warning: Storage 80% full');
      }
    }
  } catch (error) {
    if (onStatus) {
      if (error.name === 'QuotaExceededError') {
        onStatus('Error: Storage quota exceeded');
      } else {
        onStatus('Error: Failed to save');
      }
    }
    console.error('Failed to save snippets:', error);
    throw error;
  }
}

/**
 * Load a single snippet by ID
 * @param {string} id - Snippet ID
 * @returns {Promise<Object|null>}
 */
export async function loadSnippet(id) {
  try {
    const db = await getDB();
    const tx = db.transaction(SNIPPETS_STORE, 'readonly');
    const store = tx.objectStore(SNIPPETS_STORE);
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to load snippet:', error);
    return null;
  }
}

/**
 * Save a single snippet
 * @param {Object} snippet - Snippet object with id
 * @returns {Promise<void>}
 */
export async function saveSnippet(snippet) {
  try {
    const db = await getDB();
    const tx = db.transaction(SNIPPETS_STORE, 'readwrite');
    const store = tx.objectStore(SNIPPETS_STORE);
    await store.put(snippet);

    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to save snippet:', error);
    throw error;
  }
}

/**
 * Delete a snippet by ID
 * @param {string} id - Snippet ID
 * @returns {Promise<void>}
 */
export async function deleteSnippet(id) {
  try {
    const db = await getDB();
    const tx = db.transaction(SNIPPETS_STORE, 'readwrite');
    const store = tx.objectStore(SNIPPETS_STORE);
    await store.delete(id);

    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to delete snippet:', error);
    throw error;
  }
}

/**
 * Load settings from IndexedDB
 * @returns {Promise<{fontSize: number, fontFamily: string, sidebarWidth: number}>}
 */
export async function loadSettings() {
  try {
    const db = await getDB();
    const tx = db.transaction(SETTINGS_STORE, 'readonly');
    const store = tx.objectStore(SETTINGS_STORE);
    const request = store.get('user-settings');

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const settings = request.result || {};
        resolve({
          fontSize: settings.fontSize ?? DEFAULT_FONT_SIZE,
          fontFamily: settings.fontFamily ?? DEFAULT_FONT_FAMILY,
          sidebarWidth: settings.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH
        });
      };
      request.onerror = () => {
        resolve({
          fontSize: DEFAULT_FONT_SIZE,
          fontFamily: DEFAULT_FONT_FAMILY,
          sidebarWidth: DEFAULT_SIDEBAR_WIDTH
        });
      };
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
    return {
      fontSize: DEFAULT_FONT_SIZE,
      fontFamily: DEFAULT_FONT_FAMILY,
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH
    };
  }
}

/**
 * Save settings to IndexedDB
 * @param {Object} settings - Settings object
 * @returns {Promise<void>}
 */
export async function saveSettings(settings) {
  try {
    const db = await getDB();
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    const store = tx.objectStore(SETTINGS_STORE);
    await store.put({ id: 'user-settings', ...settings });

    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

/**
 * Get metadata value
 * @param {string} key - Metadata key
 * @returns {Promise<Object|null>}
 */
async function getMetadata(key) {
  try {
    const db = await getDB();
    const tx = db.transaction(METADATA_STORE, 'readonly');
    const store = tx.objectStore(METADATA_STORE);
    const request = store.get(key);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (error) {
    return null;
  }
}

/**
 * Set metadata value
 * @param {string} key - Metadata key
 * @param {any} value - Metadata value
 * @returns {Promise<void>}
 */
async function setMetadata(key, value) {
  try {
    const db = await getDB();
    const tx = db.transaction(METADATA_STORE, 'readwrite');
    const store = tx.objectStore(METADATA_STORE);
    await store.put({ key, value, updatedAt: new Date().toISOString() });

    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to set metadata:', error);
  }
}

/**
 * Get storage usage statistics
 * @returns {Promise<Object>}
 */
export async function getStorageStats() {
  try {
    const snippets = await loadSnippets();
    const totalSize = JSON.stringify(snippets).length;

    let quota = 'unknown';
    let usage = 'unknown';
    let usagePercent = 0;

    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      quota = estimate.quota;
      usage = estimate.usage;
      usagePercent = (usage / quota) * 100;
    }

    return {
      snippetCount: snippets.length,
      totalSize,
      quota,
      usage,
      usagePercent: usagePercent.toFixed(2)
    };
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return {
      snippetCount: 0,
      totalSize: 0,
      quota: 'unknown',
      usage: 'unknown',
      usagePercent: 0
    };
  }
}

// Export constants for use in other modules
export const STORAGE_KEY = 'snippets.v1'; // For backward compatibility
export const SETTINGS_KEY = 'snippets.settings.v1'; // For backward compatibility
