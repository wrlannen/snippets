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
      mode: 'javascript',
      modeManual: true,
      content: [
        '// Welcome to Snippets',
        '',
        'Minimal local scratchpad for code & notes.',
        '',
        '- Everything is saved instantly in your browser',
        '- Your data never leaves your device',
        '- Works offline — no account or sync needed',
        '',
        'The first line becomes the title in the sidebar. Use a comment or plain text.'
      ].join('\n')
    },
    {
      id: shortcutsId,
      createdAt: ts,
      updatedAt: ts,
      mode: 'javascript',
      modeManual: true,
      content: [
        '// The Command Palette',
        '',
        'The Command Palette lets you do everything in Snippets from one place.',
        '',
        'Press ⌘K (or Ctrl+K) and type to:',
        '- Create a new snippet',
        '- Open a file from disk',
        '- Search your snippets',
        '- Toggle the sidebar',
        '- Copy the current snippet',
        '- Delete the current snippet',
        '- Export all snippets',
        '- Import snippets from a file',
        '- Increase or decrease font size',
        '',
        'If you ever feel lost, open the Command Palette and start typing.'
      ].join('\n')
    },
    {
      id: pwaId,
      createdAt: ts,
      updatedAt: ts,
      mode: 'javascript',
      modeManual: true,
      content: [
        '// Install as an app',
        '',
        'You can install Snippets as a PWA (Progressive Web App) for quick access from your desktop or dock.',
        '',
        'Chrome: Look for "Install Snippets" (↓) in the address bar or menu.',
        '',
        'Safari: Go to File → Add to Dock...',
        '',
        'Or use the About (i) button for more instructions.',
      ].join('\n')
    },
    {
      id: backupId,
      createdAt: ts,
      updatedAt: ts,
      mode: 'javascript',
      modeManual: true,
      content: [
        '// Backup & restore (Export / Import)',
        '',
        'You own your data.',
        '',
        'Use the Command Palette (⌘K / Ctrl+K):',
        '- Export downloads a single JSON file',
        '- Import merges snippets + restores settings',
        '',
        'Suggested habit: Export occasionally (or before clearing browser data).'
      ].join('\n')
    },
    {
      id: openSourceId,
      createdAt: ts,
      updatedAt: ts,
      mode: 'javascript',
      modeManual: true,
      content: [
        '// Open source',
        '',
        'Snippets is open source. View or contribute on GitHub:',
        '',
        'https://github.com/wrlannen/snippets',
      ].join('\n')
    }
  ];

  saveSnippets(seeded);
}
