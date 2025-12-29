/**
 * Seed Snippets Module
 * 
 * Provides welcome snippets for first-time users.
 * Creates example snippets demonstrating features, shortcuts, and usage.
 * 
 */

import { nowIso, uid } from './utils.js';
import { saveSnippets, STORAGE_KEY } from './storage.js';
import { safeLocalStorageGet } from './utils.js';

/**
 * Seeds the storage with welcome snippets on first run.
 * Creates example snippets showing features and shortcuts.
 * Only runs if localStorage is empty.
 */
export function seedSnippetsOnFirstRun() {
  const existingRaw = safeLocalStorageGet(STORAGE_KEY);
  if (existingRaw !== null && existingRaw !== undefined) return;

  const ts = nowIso();
  let welcomeId;
  let shortcutsId;
  let backupId;
  let pwaId;
  let openSourceId;

  try {
    welcomeId = uid();
    shortcutsId = uid();
    backupId = uid();
    pwaId = uid();
    openSourceId = uid();
  } catch (err) {
    console.error('Failed to seed snippets: secure IDs unavailable', err);
    return;
  }

  const seeded = [
    {
      id: welcomeId,
      createdAt: ts,
      updatedAt: ts,
      content: [
        '// Welcome to Snippets',
        '',
        'A minimal, keyboard-first scratchpad for code, drafts, and quick notes — stored locally in your browser.',
        'Everything saves automatically and works offline.',
        '',
        'Titles come from the first line (plain text or comment-style).',
        '',
        'Tip: Press ⌘K (or Ctrl+K) to create a new snippet.'
      ].join('\n')
    },
    {
      id: shortcutsId,
      createdAt: ts,
      updatedAt: ts,
      content: [
        '// Keyboard shortcuts',
        '',
        '⌘B / Ctrl+B  Toggle sidebar',
        '⌘K / Ctrl+K  New snippet',
        '⌘F / Ctrl+F  Search',
        '⌘⇧C / Ctrl+Shift+C  Copy snippet',
      ].join('\n')
    },
    {
      id: backupId,
      createdAt: ts,
      updatedAt: ts,
      content: [
        '// Backup & sync',
        '',
        'Snippets are stored locally in your browser (localStorage).',
        'Use Export to download a JSON backup.',
        'Use Import to restore from a backup.',
      ].join('\n')
    },
    {
      id: pwaId,
      createdAt: ts,
      updatedAt: ts,
      content: [
        '// Install as an app',
        '',
        'You can install Snippets as a PWA (Progressive Web App) for quick access from your home screen or dock.',
        'Look for "Install" in your browser menu, or use the About (i) button for instructions.',
      ].join('\n')
    },
    {
      id: openSourceId,
      createdAt: ts,
      updatedAt: ts,
      content: [
        '// Open source',
        '',
        'Snippets is open source. View or contribute on GitHub:',
        'https://github.com/wrlannen/snippets',
      ].join('\n')
    }
  ];

  saveSnippets(seeded);
}
