/**
 * Snippets App
 * 
 * Main application controller that orchestrates:
 * - Snippet CRUD operations and autosave
 * - Editor initialization and event handling
 * - Sidebar rendering and navigation
 * - Search and filtering
 * - Keyboard shortcuts
 * - Export/import functionality
 * - PWA installation prompts
 * - Settings management
 * 
 */

import { nowIso, uid, copyTextToClipboard, safeLocalStorageGet } from './utils.js';
import { loadSnippets, saveSnippets, loadSettings, saveSettings, STORAGE_KEY } from './storage.js';
import { bindEls, setStatus, flashStatus, updateCharCount } from './ui.js';
import { initEditor, getEditorValue, setEditorValue, focusEditor, refreshEditor, clearHistory, applyFontSettings } from './editor.js';
import { renderList } from './list.js';
import { seedSnippetsOnFirstRun } from './seed-snippets.js';
import { initPwaInstall } from './pwa-install.js';
import { exportToJson, importFromJson } from './import-export.js';
import { initializeSidebarResize } from './sidebar-resize.js';

// =============================================================================
// Configuration Constants
// =============================================================================

/** localStorage key for sidebar visibility state */
const SIDEBAR_VISIBLE_KEY = "snippets.sidebar.visible";

/** Font size constraints (in pixels) */
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

/**
 * Renders the sidebar list using current snippets and search query.
 * Injects unsaved active editor content for immediate UI feedback.
 */
function renderSidebar() {
  if (!els) return;

  const snippets = loadSnippets();

  // Inject live editor content before rendering for immediate title/preview updates
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
  initPwaInstall();

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
    // Escape: Dismiss modal if open, else clear search or blur/focus editor
    const aboutModal = document.getElementById('aboutModal');
    if (e.key === "Escape") {
      if (aboutModal && !aboutModal.classList.contains('hidden')) {
        aboutModal.classList.add('hidden');
        return;
      }
      // If search has content, always clear and focus editor
      if (els.search.value.trim()) {
        els.search.value = "";
        renderSidebar();
        focusEditor();
        return;
      }
      // If search is focused and empty, blur and focus editor
      if (document.activeElement === els.search) {
        els.search.blur();
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
  initializeSidebarResize({ MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH });

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
      importFromJson(file, { MIN_FONT_SIZE, MAX_FONT_SIZE, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH }, renderSidebar);
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
