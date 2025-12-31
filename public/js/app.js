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

import { nowIso, uid, copyTextToClipboard, detectLanguage } from './utils.js';
import { initStorage, loadSnippets, saveSnippets, loadSettings, saveSettings, flushToStorage } from './storage.js';
import { bindEls, setStatus, flashStatus, updateCharCount } from './ui.js';
import { initEditor, getEditorValue, setEditorValue, focusEditor, refreshEditor, clearHistory, applyFontSettings, setEditorMode, getEditorMode } from './editor.js';
import { renderList } from './list.js';
import { seedSnippetsOnFirstRun } from './seed-snippets.js';
import { initPwaInstall } from './pwa-install.js';
import { exportToJson, importFromJson } from './import-export.js';
import { initializeSidebarResize } from './sidebar-resize.js';
import { initCommandPalette, registerCommands, openPalette, closePalette, isPaletteOpen } from './command-palette.js';

// =============================================================================
// Configuration Constants
// =============================================================================

/** localStorage key for sidebar visibility (uses localStorage for synchronous early boot access) */
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

/** Supported file extensions for opening files from disk */
const SUPPORTED_FILE_EXTENSIONS = {
  'js': 'javascript',
  'ts': 'javascript',
  'tsx': 'javascript',
  'jsx': 'javascript',
  'py': 'python',
  'md': 'markdown',
  'html': 'htmlmixed',
  'htm': 'htmlmixed',
  'css': 'css',
  'json': 'javascript',
  'yaml': 'yaml',
  'yml': 'yaml',
  'xml': 'xml',
  'sql': 'sql',
  'sh': 'shell',
  'bash': 'shell',
  'txt': 'null'
};

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
  
  // Set mode from snippet or detect from content
  const mode = found.mode || detectLanguage(found.content || '');
  setEditorMode(mode);
  
  clearHistory();

  setStatus("Editing");
  updateCharCount(found.content ?? "");
  renderSidebar();
  
  // Update language selector UI if available
  if (typeof window._updateLanguageSelector === 'function') {
    window._updateLanguageSelector();
  }
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
      const mode = detectLanguage(content);
      const snippets = loadSnippets();
      snippets.unshift({ id: activeId, content, mode, modeManual: false, createdAt: ts, updatedAt: ts });
      saveSnippets(snippets, { onStatus: setStatus });
      
      // Update editor mode and language selector
      setEditorMode(mode);
      if (typeof window._updateLanguageSelector === 'function') {
        window._updateLanguageSelector();
      }
      
      setStatus("Saved");
      renderSidebar();
      return;
    }

    // Update existing snippet
    const snippets = loadSnippets();
    const idx = snippets.findIndex(s => s.id === activeId);

    if (idx === -1) return;

    // Only auto-detect if user hasn't manually set the language
    const currentSnippet = snippets[idx];
    const mode = currentSnippet.modeManual ? currentSnippet.mode : detectLanguage(content);
    snippets[idx] = {
      ...snippets[idx],
      content,
      mode,
      updatedAt: nowIso(),
    };

    saveSnippets(snippets, { onStatus: setStatus });
    
    // Update editor mode and language selector if mode changed
    setEditorMode(mode);
    if (typeof window._updateLanguageSelector === 'function') {
      window._updateLanguageSelector();
    }
    
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
 * @param {string} initialContent - Optional initial content for the snippet
 * @param {string} initialMode - Optional initial language mode
 */
function createNewSnippet(initialContent = "", initialMode = 'javascript') {
  try {
    activeId = uid();
  } catch (err) {
    setStatus('Error: Secure IDs unavailable');
    console.error(err);
    return;
  }
  const ts = nowIso();

  const snippets = loadSnippets();
  snippets.unshift({ 
    id: activeId, 
    content: initialContent, 
    mode: initialMode, 
    modeManual: false, 
    createdAt: ts, 
    updatedAt: ts 
  });
  saveSnippets(snippets, { onStatus: setStatus });

  loadIntoEditor(activeId);

  focusEditor();
}

/**
 * Opens a file picker to load a file from disk into a new snippet
 */
function openFileFromDisk() {
  const input = document.createElement('input');
  input.type = 'file';
  const acceptedExts = Object.keys(SUPPORTED_FILE_EXTENSIONS).map(ext => `.${ext}`).join(',');
  input.accept = acceptedExts;

  input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();

      // Detect language from file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      const mode = SUPPORTED_FILE_EXTENSIONS[ext] || 'javascript';

      // Add filename as first line comment
      const commentedContent = `// ${file.name}\n${text}`;

      createNewSnippet(commentedContent, mode);
      flashStatus(`Opened ${file.name}`, 1500);
    } catch (err) {
      console.error('Error reading file:', err);
      flashStatus('Failed to open file', 1500);
    }
  });

  input.click();
}

/**
 * Adjusts font size by a delta value and persists to settings.
 * @param {number} delta - Amount to change font size (positive or negative)
 */
function adjustFontSize(delta) {
  const settings = loadSettings();
  const newSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, settings.fontSize + delta));
  const newSettings = { ...settings, fontSize: newSize };
  saveSettings(newSettings);
  applyFontSettings(newSettings);
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
    adjustFontSize(1);
  });

  // Font size decrease button (A-)
  document.getElementById('decreaseFont')?.addEventListener('click', () => {
    adjustFontSize(-1);
  });
}



/**
 * Main application initialization.
 * Sets up DOM references, event listeners, and loads initial data.
 * Called when DOM is ready.
 */
async function initializeApp() {
  // Initialize IndexedDB storage
  try {
    const result = await initStorage();
    if (result.migration && result.migration.snippetsMigrated > 0) {
      console.log(`Migrated ${result.migration.snippetsMigrated} snippets to IndexedDB`);
    }
  } catch (error) {
    console.error('Storage initialization failed:', error);
    setStatus('Warning: Storage initialization failed');
  }
  // Cache DOM element references
  els = {
    search: document.getElementById("search"),
    content: document.getElementById("content"),
    list: document.getElementById("list"),
    empty: document.getElementById("empty"),
    status: document.getElementById("status"),
    charCount: document.getElementById("charCount"),
  };

  // --- Responsive Overlay & Sidebar Auto-hide ---
  const mobileOverlay = document.getElementById('mobileOverlay');
  const appMain = document.getElementById('appMain');
  const sidebar = document.getElementById('sidebar');

  // Utility to detect mobile devices (phones only, allow tablets)
  function isMobileDevice() {
    return /Mobi|Android|iPhone|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent) &&
           window.innerWidth < 768; // Only block phones, allow tablets
  }

  // Utility to detect touch devices for UX adjustments
  function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
  
  function handleResponsiveUI() {
    const width = window.innerWidth;
    const isMobile = isMobileDevice();
    const isTouch = isTouchDevice();

    // Show overlay and hide app for mobile phones
    if (isMobile) {
      if (mobileOverlay) mobileOverlay.classList.remove('hidden');
      if (appMain) appMain.classList.add('hidden');
    } else {
      if (mobileOverlay) mobileOverlay.classList.add('hidden');
      if (appMain) {
        appMain.classList.remove('hidden');
        appMain.classList.add('flex');
      }
    }

    // Add touch-friendly classes for mobile devices
    const html = document.documentElement;
    if (isTouch) {
      html.classList.add('touch-device');
    } else {
      html.classList.remove('touch-device');
    }

    // Auto-hide sidebar on small widths (desktop only) - hide earlier for more editor space
    if (!isMobile && width < 900) {
      html.classList.add('sidebar-hidden');
    } else {
      html.classList.remove('sidebar-hidden');
    }
  }

  window.addEventListener('resize', handleResponsiveUI);
  handleResponsiveUI();

  bindEls(els);


  // Register service worker for PWA (required for install prompt)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('Service worker registration failed:', err);
      });
    });
  }

  // Setup PWA install UI
  initPwaInstall();

  // Adjust title for PWA standalone mode
  function updateTitleForPWA() {
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
      document.title = 'Snippets';
    }
  }
  
  updateTitleForPWA();
  
  // Listen for display mode changes (when app is installed/launched as PWA)
  const displayModeMediaQuery = window.matchMedia('(display-mode: standalone)');
  if (displayModeMediaQuery.addEventListener) {
    displayModeMediaQuery.addEventListener('change', updateTitleForPWA);
  }

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
   * Restore sidebar visibility state from localStorage.
   * Note: Sidebar state uses localStorage for synchronous access during early boot.
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
    // Escape: Dismiss command palette, modal, or clear search
    if (e.key === "Escape") {
      // Close command palette first
      if (isPaletteOpen()) {
        closePalette();
        return;
      }
      
      // Then check about modal
      const aboutModal = document.getElementById('aboutModal');
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

    // ⌘+K / Ctrl+K: Open command palette
    if (isMod && e.key === "k") {
      e.preventDefault();
      openPalette();
      return;
    }

    // Cmd/Ctrl+/: Toggle sidebar visibility
    if (isMod && e.key === "/") {
      e.preventDefault();
      toggleSidebar();
      return;
    }
  });

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

  // --- Command Palette Setup ---
  
  initCommandPalette();
  
  const modKeySymbol = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl';
  
  registerCommands([
    {
      id: 'new-snippet',
      label: 'New Snippet',
      description: 'Create a new empty snippet',
      keywords: ['create', 'add'],
      action: () => createNewSnippet()
    },
    {
      id: 'open-file',
      label: 'Open File from Disk',
      description: 'Load a file from your computer into a new snippet',
      keywords: ['import', 'load', 'upload'],
      action: () => openFileFromDisk()
    },
    {
      id: 'search',
      label: 'Search Snippets',
      description: 'Search your snippets list',
      keywords: ['find', 'filter'],
      action: () => {
        els.search.focus();
        els.search.select();
      }
    },
    {
      id: 'toggle-sidebar',
      label: 'Toggle Sidebar',
      description: 'Show or hide the sidebar',
      shortcut: `${modKeySymbol}+/`,
      action: () => toggleSidebar()
    },
    {
      id: 'copy-snippet',
      label: 'Copy Snippet to Clipboard',
      description: 'Copy the current snippet content',
      keywords: ['clipboard'],
      action: () => {
        const text = getEditorValue()?.content ?? '';
        if (!text.trim()) {
          flashStatus('Nothing to copy');
          return;
        }
        copyTextToClipboard(text).then(ok => {
          flashStatus(ok ? 'Copied to clipboard' : 'Copy failed', 1200, { 
            highlightClass: ok ? 'text-white' : undefined 
          });
        });
      }
    },
    {
      id: 'delete-snippet',
      label: 'Delete Current Snippet',
      description: 'Delete the currently active snippet',
      keywords: ['remove', 'trash'],
      action: () => {
        if (activeId) {
          deleteSnippet(activeId);
        }
      }
    },
    {
      id: 'export',
      label: 'Export All Snippets',
      description: 'Download all snippets as JSON',
      keywords: ['backup', 'save', 'download'],
      action: () => exportToJson()
    },
    {
      id: 'import',
      label: 'Import Snippets',
      description: 'Load snippets from a JSON file',
      keywords: ['restore', 'upload', 'load'],
      action: () => {
        const importFileInput = document.getElementById('importFileInput');
        if (importFileInput) {
          importFileInput.click();
        }
      }
    }
    ,
    {
      id: 'increase-font',
      label: 'Increase Font Size',
      description: 'Make the editor text larger',
      keywords: ['zoom', 'bigger'],
      action: () => adjustFontSize(1)
    },
    {
      id: 'decrease-font',
      label: 'Decrease Font Size',
      description: 'Make the editor text smaller',
      keywords: ['zoom', 'smaller'],
      action: () => adjustFontSize(-1)
    }
  ]);

  // --- Platform-specific UI ---

  // Show correct modifier key symbol based on OS
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKeySymbolUI = isMac ? '⌘' : 'Ctrl';

  const modKeyTargets = [
    'modKey',
    'modKey2',
    'modalModKey1',
    'modalModKey2'
  ];

  modKeyTargets.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (isMac) {
        el.textContent = '⌘';
        // For status bar, show "⌘+K"
        if (id === 'modKey') {
          el.textContent = '⌘';
          const modKeySpan = el;
          if (modKeySpan.nextSibling && modKeySpan.nextSibling.nodeType === 3) {
            modKeySpan.nextSibling.textContent = '+K Commands';
          }
        }
      } else {
        el.textContent = 'Ctrl';
        // For status bar, show "Ctrl+K"
        if (id === 'modKey') {
          el.textContent = 'Ctrl';
          const modKeySpan = el;
          if (modKeySpan.nextSibling && modKeySpan.nextSibling.nodeType === 3) {
            modKeySpan.nextSibling.textContent = '+K Commands';
          }
        }
      }
    }
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

  // --- Language Selector ---

  const languageSelector = document.getElementById('languageSelector');

  // Update language selector to match current editor mode
  function updateLanguageSelector() {
    if (!languageSelector || !activeId) return;
    
    const mode = getEditorMode();
    // Handle null mode (plain text) - explicitly check for undefined
    if (mode !== undefined) {
      languageSelector.value = mode === null ? 'null' : mode;
    }
  }

  // Make updateLanguageSelector available globally for loadIntoEditor
  window._updateLanguageSelector = updateLanguageSelector;

  languageSelector?.addEventListener('change', (e) => {
    const newMode = e.target.value;
    if (!activeId) return;

    // Convert 'null' string to actual null for plain text mode
    const actualMode = newMode === 'null' ? null : newMode;
    setEditorMode(actualMode);

    // Update snippet mode in storage and mark as manually set
    const snippets = loadSnippets();
    const idx = snippets.findIndex(s => s.id === activeId);
    if (idx !== -1) {
      snippets[idx] = {
        ...snippets[idx],
        mode: actualMode,
        modeManual: true,
        updatedAt: nowIso(),
      };
      saveSnippets(snippets, { onStatus: setStatus });
      const displayName = actualMode === null ? 'Plain Text' : actualMode;
      flashStatus(`Language: ${displayName} (manual)`, 1000);
    }
  });

  // Flush storage to IndexedDB before page unload
  window.addEventListener('beforeunload', () => {
    flushToStorage();
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
