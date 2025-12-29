/**
 * Import/Export Module
 * 
 * Handles JSON import and export of snippets and settings:
 * - Exports all snippets and settings to downloadable JSON
 * - Imports from JSON with validation and sanitization
 * - Supports both old format (array) and new format (versioned object)
 * - Prevents duplicates during import
 * - Enforces size limits to prevent localStorage quota issues
 * 
 */

import { nowIso } from './utils.js';
import { loadSnippets, saveSnippets, loadSettings, saveSettings } from './storage.js';
import { setStatus } from './ui.js';
import { applyFontSettings } from './editor.js';

/**
 * Exports all snippets and settings to a JSON file and triggers download.
 */
export function exportToJson() {
  const snippets = loadSnippets();
  const settings = loadSettings();
  const exportData = {
    version: 1,  // Export format version for future compatibility
    exportedAt: nowIso(),
    snippets: snippets,
    settings: settings
  };
  const data = JSON.stringify(exportData, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `snippets-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  setStatus(`Exported ${snippets.length} snippet${snippets.length !== 1 ? 's' : ''} and settings`);
}

/**
 * Imports snippets and settings from a JSON file.
 * Supports both old format (array) and new format (object with snippets and settings).
 * Validates the format and merges with existing snippets (avoiding duplicates by ID).
 * @param {File} file - The JSON file to import
 * @param {Object} constraints - Min/max values for validation
 * @param {Function} onComplete - Callback after import completes successfully
 */
export function importFromJson(file, constraints, onComplete) {
  if (!file) return;

  const { MIN_FONT_SIZE, MAX_FONT_SIZE, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH } = constraints;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);

      // Sanitize and validate imported snippet data to prevent malicious content
      const sanitizeSnippet = (snippet) => {
        if (!snippet || typeof snippet !== 'object') return null;
        if (typeof snippet.id !== 'string' || !snippet.id.trim()) return null;
        if (typeof snippet.content !== 'string') return null;

        // Enforce reasonable limits to prevent localStorage quota issues
        const id = snippet.id.trim().slice(0, 200);
        const content = snippet.content.slice(0, 1_000_000);
        const createdAt = (typeof snippet.createdAt === 'string' && snippet.createdAt) ? snippet.createdAt : nowIso();
        const updatedAt = (typeof snippet.updatedAt === 'string' && snippet.updatedAt) ? snippet.updatedAt : nowIso();

        return { id, content, createdAt, updatedAt };
      };

      // Sanitize imported settings and clamp values to valid ranges
      const sanitizeImportedSettings = (settings) => {
        if (!settings || typeof settings !== 'object') return null;
        const out = {};

        if (typeof settings.fontSize === 'number' && Number.isFinite(settings.fontSize)) {
          out.fontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, settings.fontSize));
        }

        if (typeof settings.fontFamily === 'string' && settings.fontFamily.trim()) {
          out.fontFamily = settings.fontFamily.trim().slice(0, 200);
        }

        if (typeof settings.sidebarWidth === 'number' && Number.isFinite(settings.sidebarWidth)) {
          out.sidebarWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, settings.sidebarWidth));
        }

        return out;
      };

      // Support both old format (array) and new format (object with snippets/settings)
      // Old format: [snippet1, snippet2, ...]
      // New format: { version: 1, snippets: [...], settings: {...} }
      let snippetsToImport;
      let settingsToImport = null;

      if (Array.isArray(imported)) {
        // Old format: just an array of snippets
        snippetsToImport = imported;
      } else if (imported && typeof imported === 'object' && Array.isArray(imported.snippets)) {
        // New format: object with snippets and settings
        snippetsToImport = imported.snippets;
        settingsToImport = imported.settings;
      } else {
        setStatus('Error: Invalid JSON format');
        return;
      }

      // Validate each snippet has required fields
      const sanitizedSnippets = [];
      for (const snippet of snippetsToImport) {
        const s = sanitizeSnippet(snippet);
        if (!s) {
          setStatus('Error: Invalid snippet format');
          return;
        }
        sanitizedSnippets.push(s);
      }

      // Merge with existing snippets (skip duplicates by ID)
      const existing = loadSnippets();
      const existingIds = new Set(existing.map(s => s.id));

      let imported_count = 0;
      let skipped_count = 0;

      for (const snippet of sanitizedSnippets) {
        if (existingIds.has(snippet.id)) {
          skipped_count++;
        } else {
          existing.push(snippet);
          imported_count++;
        }
      }

      saveSnippets(existing, { onStatus: setStatus });

      // Import and merge settings if provided (preserves existing settings not in import)
      if (settingsToImport && typeof settingsToImport === 'object') {
        const sanitizedSettings = sanitizeImportedSettings(settingsToImport);
        if (sanitizedSettings) {
          const mergedSettings = { ...loadSettings(), ...sanitizedSettings };
          saveSettings(mergedSettings);
          applyFontSettings(mergedSettings);
        }
      }

      // Call completion callback (typically renders sidebar)
      if (onComplete) onComplete();

      const statusParts = [];
      if (imported_count > 0) {
        statusParts.push(`${imported_count} snippet${imported_count !== 1 ? 's' : ''}`);
      }
      if (skipped_count > 0) {
        statusParts.push(`${skipped_count} duplicate${skipped_count !== 1 ? 's' : ''} skipped`);
      }
      if (settingsToImport) {
        statusParts.push('settings');
      }

      if (imported_count > 0 || settingsToImport) {
        setStatus(`Imported ${statusParts.join(', ')}`);
      } else {
        setStatus(`No new snippets imported (${skipped_count} duplicate${skipped_count !== 1 ? 's' : ''} skipped)`);
      }
    } catch (err) {
      setStatus('Error: Failed to parse JSON file');
      console.error('Import error:', err);
    }
  };
  reader.readAsText(file);
}
