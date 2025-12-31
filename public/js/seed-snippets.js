/**
 * Seed Snippets Module
 * 
 * Provides welcome snippets for first-time users.
 * Creates example snippets demonstrating features, shortcuts, and usage.
 * 
 */

import { nowIso, uid } from './utils.js';
import { loadSnippets, saveSnippets } from './storage.js';

/**
 * Seeds the storage with welcome snippets on first run.
 * Creates example snippets showing features and shortcuts.
 * Only runs if storage is empty.
 */
export function seedSnippetsOnFirstRun() {
  // Skip seeding in test environment
  if (typeof window !== 'undefined' && window.__DISABLE_WELCOME_SEED__) {
    return;
  }

  const existing = loadSnippets();
  if (existing.length > 0) return;

  const ts = nowIso();
  let welcomeId;

  try {
    welcomeId = uid();
  } catch (err) {
    console.error('Failed to seed snippets: secure IDs unavailable', err);
    return;
  }

  const seeded = [
    {
      id: welcomeId,
      createdAt: ts,
      updatedAt: ts,
      mode: 'javascript',
      modeManual: true,
      content: [
        '// Welcome to Snippets',
        '',
        'Minimal local scratchpad for code & notes.',
        '',
        'Getting started:',
        '',
        '• Type here to create snippets — they autosave instantly.',
        '• Your snippets never leave your device (stored in IndexedDB).',
        '• ⌘+K (Ctrl+K) opens commands, including export for backups.',
        '• Install as PWA for desktop app experience:',
        '    -> Click the install icon in your browser\'s address bar or menu',
        '',
        'Replace this with your first snippet!'
      ].join('\n')
    }
  ];

  saveSnippets(seeded);
}
