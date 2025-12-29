import { nowIso, uid, copyTextToClipboard, safeLocalStorageGet } from './utils.js';
import { loadSnippets, saveSnippets, loadSettings, saveSettings, STORAGE_KEY } from './storage.js';
import { bindEls, setStatus, flashStatus, updateCharCount } from './ui.js';
import { initEditor, getEditorValue, setEditorValue, focusEditor, refreshEditor, clearHistory, applyFontSettings } from './editor.js';
import { renderList } from './list.js';

// =============================================================================
// PWA Install Prompt Handling
// =============================================================================

let deferredPwaPrompt = null;

// Listen for the install prompt (Chrome/Edge/Android)
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  deferredPwaPrompt = e;

  // If the prompt fires, we know we can install via button
  const installSection = document.getElementById('installSection');
  const pwaInstallable = document.getElementById('pwaInstallable');
  const pwaSafari = document.getElementById('pwaSafari');

  if (installSection && pwaInstallable) {
    installSection.classList.remove('hidden');
    pwaInstallable.classList.remove('hidden');
    // Ensure Safari view is hidden if we have a direct install prompt
    if (pwaSafari) pwaSafari.classList.add('hidden');
  }
});

function setupPwaInstallUI() {
  const installSection = document.getElementById('installSection');
  const pwaInstallable = document.getElementById('pwaInstallable');
  const pwaSafari = document.getElementById('pwaSafari');
  const installBtn = document.getElementById('installPwaBtn');

  if (!installSection || !pwaInstallable || !pwaSafari) return;

  // 1. Check for Safari (which doesn't fire beforeinstallprompt)
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

  // If Safari, show instructions immediately (unless beforeinstallprompt fired already)
  if (isSafari && !deferredPwaPrompt) {
    installSection.classList.remove('hidden');
    pwaSafari.classList.remove('hidden');
    pwaInstallable.classList.add('hidden');
  }

  // 2. Button Handler for Chrome/Edge
  if (installBtn) {
    const originalContent = installBtn.innerHTML;

    installBtn.addEventListener('click', async () => {
      if (!deferredPwaPrompt) return;
      installBtn.disabled = true;
      try {
        deferredPwaPrompt.prompt();
        const { outcome } = await deferredPwaPrompt.userChoice;
        if (outcome === 'accepted') {
          installBtn.textContent = 'Installed!';
          installBtn.classList.remove('bg-[#007acc]', 'hover:bg-[#0063a5]');
          installBtn.classList.add('bg-green-600', 'hover:bg-green-700', 'text-white');
          setTimeout(() => {
            installSection.classList.add('hidden');
          }, 2000);
        } else {
          // Restore original state
          installBtn.innerHTML = originalContent;
          installBtn.disabled = false;
        }
      } catch (err) {
        installBtn.textContent = 'Failed';
        installBtn.disabled = false;
        setTimeout(() => {
          installBtn.innerHTML = originalContent;
        }, 2000);
      }
    });
  }
}
/**
 * Snippets - A minimal, client-side snippet manager
 * 
 * All data is stored in browser localStorage with no backend.
 * The first line of each snippet is used as its title in the sidebar.
 */

// =============================================================================
// Configuration Constants
// =============================================================================

/** localStorage key for sidebar visibility state */
const SIDEBAR_VISIBLE_KEY = "snippets.sidebar.visible";
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;

/** Sidebar width constraints and defaults (in pixels) */
const MIN_SIDEBAR_WIDTH = 120;
const MAX_SIDEBAR_WIDTH = 500;

/** Autosave delay in milliseconds after user stops typing */
const AUTOSAVE_DELAY_MS = 800;

/** Debounce delay for sidebar re-renders during typing */
const RENDER_DEBOUNCE_MS = 150;

// =============================================================================
// Application State
// =============================================================================

/** Cached references to frequently-accessed DOM elements */
let els;

/** ID of the currently active/editing snippet (null if none) */
let activeId = null;

/** Timer handle for debounced autosave */
let autosaveTimer = null;

/** Timer handle for debounced sidebar renders */
let renderDebounceTimer = null;

// =============================================================================
// UI Update Functions
// =============================================================================

// Status and footer helpers are provided by ui.js

// =============================================================================
// Editor Functions
// =============================================================================

/**
 * Clears the editor and resets to empty state.
 * Used when no snippet is selected or after deleting the last snippet.
 */
function clearEditor() {
  activeId = null;

  setEditorValue("");
  focusEditor();

  setStatus("Ready");
  updateCharCount("");
}

// =============================================================================
// Snippet CRUD Operations
// =============================================================================

/**
 * Loads a snippet into the editor by ID.
 * Updates the active state and refreshes the sidebar.
 * @param {string} id - Snippet ID to load
 */
function loadIntoEditor(id) {
  const snippets = loadSnippets();
  const found = snippets.find(s => s.id === id);

  if (!found) return;

  activeId = found.id;

  setEditorValue(found.content ?? "");
  clearHistory();

  setStatus("Editing");
  updateCharCount(found.content ?? "");
  renderSidebar();
}

/**
 * Deletes a snippet by ID.
 * If deleting the active snippet, loads the next available or clears editor.
 * @param {string} id - Snippet ID to delete
 */
function deleteSnippet(id) {
  const snippets = loadSnippets();
  const remaining = snippets.filter(s => s.id !== id);
  saveSnippets(remaining, { onStatus: setStatus });

  // If we deleted the active snippet, select another or clear
  if (activeId === id) {
    if (remaining.length > 0) {
      loadIntoEditor(remaining[0].id);
    } else {
      renderSidebar();
      clearEditor();
    }
    setStatus("Deleted");
    return;
  }

  renderSidebar();
  setStatus("Deleted");
}

/**
 * Schedules an autosave after the debounce delay.
 * Creates a new snippet if none is active, otherwise updates the existing one.
 * Skips save if content is empty/whitespace only.
 */
function scheduleAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer);

  autosaveTimer = setTimeout(() => {
    const { content } = getEditorValue();

    // Don't save empty snippets
    if (!content.trim()) return;

    // Create new snippet if none is active
    if (!activeId) {
      try {
        activeId = uid();
      } catch (err) {
        setStatus('Error: Secure IDs unavailable');
        console.error(err);
        return;
      }
      const ts = nowIso();
      const snippets = loadSnippets();
      snippets.unshift({ id: activeId, content, createdAt: ts, updatedAt: ts });
      saveSnippets(snippets, { onStatus: setStatus });
      setStatus("Saved");
      renderSidebar();
      return;
    }

    // Update existing snippet
    const snippets = loadSnippets();
    const idx = snippets.findIndex(s => s.id === activeId);

    if (idx === -1) return;

    snippets[idx] = {
      ...snippets[idx],
      content,
      updatedAt: nowIso(),
    };

    saveSnippets(snippets, { onStatus: setStatus });
    setStatus("Autosaved");
    renderSidebar();
  }, AUTOSAVE_DELAY_MS);
}

/**
 * Debounces sidebar re-renders during rapid typing.
 * Prevents UI jank while still keeping sidebar updated.
 */
function debouncedRenderList() {
  if (renderDebounceTimer) clearTimeout(renderDebounceTimer);

  renderDebounceTimer = setTimeout(() => {
    renderSidebar();
  }, RENDER_DEBOUNCE_MS);
}

function seedSnippetsOnFirstRun() {
  const existingRaw = safeLocalStorageGet(STORAGE_KEY);
  if (existingRaw !== null && existingRaw !== undefined) return;

  const ts = nowIso();
  let welcomeId;
  let shortcutsId;
  let backupId;

  try {
    welcomeId = uid();
    shortcutsId = uid();
    backupId = uid();
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
        'Titles come from the first line (comment-style).',
        'Everything saves automatically and works offline.',
        '',
        'Tip: Press ⌘K (or Ctrl+K) to create a new snippet.',
      ].join('\n')
    },
    {
      id: shortcutsId,
      createdAt: ts,
      updatedAt: ts,
      content: [
        '// Keyboard shortcuts',
        '',
        '⌘K / Ctrl+K  New snippet',
        '⌘F / Ctrl+F  Search',
        '⌘B / Ctrl+B  Toggle sidebar',
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
    }
  ];

  saveSnippets(seeded);
}

/**
 * Renders the sidebar list using current snippets and search query.
 * Injects unsaved active editor content for immediate UI feedback.
 */
function renderSidebar() {
  if (!els) return;

  const snippets = loadSnippets();

  if (activeId) {
    const liveContent = getEditorValue().content;
    const idx = snippets.findIndex(s => s.id === activeId);
    if (idx !== -1) {
      snippets[idx] = { ...snippets[idx], content: liveContent };
    }
  }

  const query = els.search?.value || "";

  renderList({
    els,
    snippets,
    query,
    activeId,
    onOpen: loadIntoEditor,
    onDelete: deleteSnippet
  });
}

/**
 * Creates a new empty snippet and loads it into the editor.
 * The snippet is added to the top of the list.
 */
function createNewSnippet() {
  try {
    activeId = uid();
  } catch (err) {
    setStatus('Error: Secure IDs unavailable');
    console.error(err);
    return;
  }
  const ts = nowIso();

  const snippets = loadSnippets();
  snippets.unshift({ id: activeId, content: "", createdAt: ts, updatedAt: ts });
  saveSnippets(snippets, { onStatus: setStatus });

  loadIntoEditor(activeId);

  focusEditor();
}

/**
 * Exports all snippets and settings to a JSON file and triggers download.
 */
function exportToJson() {
  const snippets = loadSnippets();
  const settings = loadSettings();
  const exportData = {
    version: 1,
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
 */
function importFromJson(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);

      const sanitizeSnippet = (snippet) => {
        if (!snippet || typeof snippet !== 'object') return null;
        if (typeof snippet.id !== 'string' || !snippet.id.trim()) return null;
        if (typeof snippet.content !== 'string') return null;

        const id = snippet.id.trim().slice(0, 200);
        const content = snippet.content.slice(0, 1_000_000);
        const createdAt = (typeof snippet.createdAt === 'string' && snippet.createdAt) ? snippet.createdAt : nowIso();
        const updatedAt = (typeof snippet.updatedAt === 'string' && snippet.updatedAt) ? snippet.updatedAt : nowIso();

        return { id, content, createdAt, updatedAt };
      };

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

      // Merge with existing snippets
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

      // Import settings if provided
      if (settingsToImport && typeof settingsToImport === 'object') {
        const sanitizedSettings = sanitizeImportedSettings(settingsToImport);
        if (sanitizedSettings) {
          const mergedSettings = { ...loadSettings(), ...sanitizedSettings };
          saveSettings(mergedSettings);
          applyFontSettings(mergedSettings);
        }


      }

      renderSidebar();

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

// =============================================================================
// Sidebar Resize
// =============================================================================

/**
 * Applies sidebar width to the sidebar element.
 * @param {number} width - Width in pixels
 */
function applySidebarWidth(width) {
  const sidebar = document.querySelector('aside');
  if (sidebar) {
    const clamped = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width));
    sidebar.style.width = clamped + 'px';
  }
}

/**
 * Initializes the sidebar resize functionality by detecting mouse position near the right edge.
 * Allows users to drag the sidebar edge to resize it.
 * Persists the width to settings.
 */
function initializeSidebarResize() {
  const sidebar = document.querySelector('aside');

  if (!sidebar) return;

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  let isNearEdge = false;

  // Apply saved width on initialization
  const settings = loadSettings();
  applySidebarWidth(settings.sidebarWidth);

  // Function to check if mouse is near the right edge of sidebar
  function isNearSidebarEdge(e) {
    const rect = sidebar.getBoundingClientRect();
    const mouseX = e.clientX;
    const edgeThreshold = 8; // pixels from edge

    return mouseX >= rect.right - edgeThreshold && mouseX <= rect.right + edgeThreshold;
  }

  // Handle mouse movement to change cursor
  document.addEventListener('mousemove', (e) => {
    if (isResizing) return;

    if (isNearSidebarEdge(e)) {
      if (!isNearEdge) {
        sidebar.style.cursor = 'col-resize';
        isNearEdge = true;
      }
    } else {
      if (isNearEdge) {
        sidebar.style.cursor = '';
        isNearEdge = false;
      }
    }
  });

  // Handle mouse down on sidebar
  sidebar.addEventListener('mousedown', (e) => {
    if (!isNearEdge) return;

    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.getBoundingClientRect().width;

    // Add visual feedback
    document.body.classList.add('resizing-sidebar');

    e.preventDefault();
  });

  // Handle mouse movement during resize
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    let newWidth = startWidth + deltaX;

    // Clamp width to min/max
    newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth));

    applySidebarWidth(newWidth);
  });

  // Handle mouse up
  document.addEventListener('mouseup', () => {
    if (!isResizing) return;

    isResizing = false;

    // Remove visual feedback
    document.body.classList.remove('resizing-sidebar');

    // Save the new width
    const currentWidth = sidebar.getBoundingClientRect().width;
    const settings = loadSettings();
    const newSettings = { ...settings, sidebarWidth: Math.round(currentWidth) };
    saveSettings(newSettings);
  });
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initializes font size controls.
 * Handles font size changes and persists to settings.
 */
function initializeFontControls() {
  const settings = loadSettings();
  applyFontSettings(settings);

  // Font size increase button (A+)
  document.getElementById('increaseFont')?.addEventListener('click', () => {
    const settings = loadSettings();
    const newSize = Math.min(MAX_FONT_SIZE, settings.fontSize + 1);
    const newSettings = { ...settings, fontSize: newSize };
    saveSettings(newSettings);
    applyFontSettings(newSettings);
  });

  // Font size decrease button (A-)
  document.getElementById('decreaseFont')?.addEventListener('click', () => {
    const settings = loadSettings();
    const newSize = Math.max(MIN_FONT_SIZE, settings.fontSize - 1);
    const newSettings = { ...settings, fontSize: newSize };
    saveSettings(newSettings);
    applyFontSettings(newSettings);
  });
}



/**
 * Main application initialization.
 * Sets up DOM references, event listeners, and loads initial data.
 * Called when DOM is ready.
 */
function initializeApp() {
  // Cache DOM element references
  els = {
    search: document.getElementById("search"),
    content: document.getElementById("content"),
    list: document.getElementById("list"),
    empty: document.getElementById("empty"),
    status: document.getElementById("status"),
    charCount: document.getElementById("charCount"),
  };

  bindEls(els);

  // Setup PWA install UI
  setupPwaInstallUI();


  // Set up new snippet button
  const newSnippetBtn = document.getElementById('newSnippetBtn');
  if (newSnippetBtn) {
    newSnippetBtn.addEventListener('click', () => {
      createNewSnippet();
    });
  }

  // Validate critical DOM elements exist
  if (!els.list || !els.content || !els.empty) {
    console.error("Critical DOM elements not found");
    return;
  }

  // --- Editor Event Listeners ---

  // Handle content changes: update UI and schedule save
  els.content.addEventListener("input", () => {
    updateCharCount(els.content.value);
    scheduleAutosave();
    debouncedRenderList();
  });

  // Apply initial settings
  applyFontSettings(loadSettings());
  restoreSidebarState();

  // --- Search Event Listeners ---

  els.search.addEventListener("input", () => {
    renderSidebar();
  });

  // Close search when clicking outside (now just clear search, don't hide)
  document.addEventListener("click", (e) => {
    const searchWrapper = document.getElementById("searchWrapper");
    const clickedOutside = searchWrapper && !searchWrapper.contains(e.target);

    if (clickedOutside && els.search.value.trim()) {
      els.search.value = "";
      renderSidebar();
    }
  });

  // --- Sidebar Toggle ---

  /**
   * Toggle sidebar visibility and save state
   */
  function toggleSidebar() {
    const html = document.documentElement;
    const isHidden = html.classList.contains('sidebar-hidden');
    
    if (isHidden) {
      html.classList.remove('sidebar-hidden');
      try {
        localStorage.setItem(SIDEBAR_VISIBLE_KEY, 'true');
      } catch (err) {
        console.warn('Failed to save sidebar state:', err);
      }
    } else {
      html.classList.add('sidebar-hidden');
      try {
        localStorage.setItem(SIDEBAR_VISIBLE_KEY, 'false');
      } catch (err) {
        console.warn('Failed to save sidebar state:', err);
      }
    }
  }

  /**
   * Restore sidebar visibility state from localStorage
   */
  function restoreSidebarState() {
    try {
      const sidebarVisible = localStorage.getItem(SIDEBAR_VISIBLE_KEY);
      const html = document.documentElement;
      
      // Default to visible if no preference is saved
      // Note: State is already applied by inline script in HTML head
      // This function ensures the class is in sync
      if (sidebarVisible === 'false') {
        html.classList.add('sidebar-hidden');
      } else {
        html.classList.remove('sidebar-hidden');
      }
    } catch (err) {
      console.warn('Failed to restore sidebar state:', err);
    }
  }

  // --- Global Keyboard Shortcuts ---

  window.addEventListener("keydown", (e) => {
    // Escape: Dismiss modal if open, else clear search and return focus to editor
    const aboutModal = document.getElementById('aboutModal');
    if (e.key === "Escape") {
      if (aboutModal && !aboutModal.classList.contains('hidden')) {
        aboutModal.classList.add('hidden');
        return;
      }
      if (els.search.value.trim()) {
        els.search.value = "";
        renderSidebar();
        focusEditor();
        return;
      }
    }

    // Modifier key (Cmd on Mac, Ctrl on Windows/Linux)
    const isMod = e.metaKey || e.ctrlKey;

    // Cmd/Ctrl+K: Create new snippet
    if (isMod && e.key === "k") {
      e.preventDefault();
      createNewSnippet();
      return;
    }

    // Cmd/Ctrl+F: Focus search
    if (isMod && e.key === "f") {
      e.preventDefault();
      els.search.focus();
      els.search.select();
      return;
    }

    // Cmd/Ctrl+B: Toggle sidebar visibility
    if (isMod && e.key === "b") {
      e.preventDefault();
      toggleSidebar();
      return;
    }

    // Cmd/Ctrl+Shift+C: Copy snippet to clipboard
    if (isMod && e.shiftKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      const text = els?.content?.value ?? '';
      if (!text.trim()) {
        flashStatus('Nothing to copy');
        return;
      }
      copyTextToClipboard(text).then(ok => {
        flashStatus(ok ? 'Copied to clipboard' : 'Copy failed', 1200, { highlightClass: ok ? 'text-white' : undefined });
      });
    }
  });

  // --- Initial Data Load ---

  // --- Editor Initialization ---

  const handleEditorChange = (value) => {
    updateCharCount(value);
    scheduleAutosave();
    debouncedRenderList();
  };

  const editorInstance = initEditor(els.content, { onChange: handleEditorChange });

  // --- Initial Data Load ---

  seedSnippetsOnFirstRun();

  renderSidebar(); // Ensure list is rendered first
  const initial = loadSnippets();

  if (initial.length > 0) {
    loadIntoEditor(initial[0].id);
  }

  // Refocus editor after load
  if (editorInstance) {
    refreshEditor(); // Fix layout issues on load
  }

  initializeFontControls();
  initializeSidebarResize();


  // --- Platform-specific UI ---

  // Show correct modifier key symbol based on OS
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKeySymbol = isMac ? '⌘' : 'Ctrl';

  const modKeyTargets = [
    'modKey',
    'modKeySidebar',
    'modKeySearch',
    'modKeyCopy',
    'modalModKey4',
    'modalModKey1',
    'modalModKey2',
    'modalModKey3'
  ];

  modKeyTargets.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = modKeySymbol;
  });

  // --- Export/Import ---

  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFileInput = document.getElementById('importFileInput');

  exportBtn?.addEventListener('click', () => {
    exportToJson();
  });

  importBtn?.addEventListener('click', () => {
    importFileInput?.click();
  });

  importFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      importFromJson(file);
      // Reset file input so the same file can be imported again
      e.target.value = '';
    }
  });

  // --- About Modal ---

  const aboutBtn = document.getElementById('aboutBtn');
  const aboutModal = document.getElementById('aboutModal');
  const closeAboutModal = document.getElementById('closeAboutModal');

  aboutBtn?.addEventListener('click', () => {
    aboutModal?.classList.remove('hidden');
    // If install prompt is available, ensure UI is updated
    if (deferredPwaPrompt) {
      const installSection = document.getElementById('installSection');
      const pwaInstallable = document.getElementById('pwaInstallable');
      const pwaSafari = document.getElementById('pwaSafari');

      if (installSection && pwaInstallable) {
        installSection.classList.remove('hidden');
        pwaInstallable.classList.remove('hidden');
        if (pwaSafari) pwaSafari.classList.add('hidden');
      }
    }
  });

  closeAboutModal?.addEventListener('click', () => {
    aboutModal?.classList.add('hidden');
  });

  // Close modal when clicking backdrop
  aboutModal?.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
      aboutModal.classList.add('hidden');
    }
  });
}

// =============================================================================
// Application Entry Point
// =============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
