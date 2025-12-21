/**
 * Snippets - A minimal, client-side snippet manager
 * 
 * All data is stored in browser localStorage with no backend.
 * The first line of each snippet is used as its title in the sidebar.
 * 
 * Keyboard shortcuts:
 *   - Cmd/Ctrl+K: Create new snippet
 *   - Cmd/Ctrl+F: Focus search
 *   - Escape: Close search / dismiss modals
 */

// =============================================================================
// Configuration Constants
// =============================================================================

/** localStorage key for snippet data */
const STORAGE_KEY = "snippets.v1";

/** localStorage key for user preferences */
const SETTINGS_KEY = "snippets.settings.v1";

/** Editor font size constraints and defaults */
const DEFAULT_FONT_SIZE = 15;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;

/** Default font stack for the editor */
const DEFAULT_FONT_FAMILY = "'Source Code Pro', monospace";

/** Whether line numbers are shown by default */
const DEFAULT_LINE_NUMBERS = true;

/** Autosave delay in milliseconds after user stops typing */
const AUTOSAVE_DELAY_MS = 800;

/** Debounce delay for sidebar re-renders during typing */
const RENDER_DEBOUNCE_MS = 150;

/** Warning threshold for localStorage usage (5MB) */
const STORAGE_WARNING_BYTES = 5 * 1024 * 1024;

// =============================================================================
// Application State
// =============================================================================

/** Cached references to frequently-accessed DOM elements */
let els;

/** Reference to the line numbers gutter element */
let lineNumbersEl;

/** ID of the currently active/editing snippet (null if none) */
let activeId = null;

/** IDs from the last sidebar render, used for optimization */
let lastRenderIds = [];

/** ID of snippet pending deletion confirmation (unused, kept for future) */
let pendingDeleteId = null;

/** Timer handle for debounced autosave */
let autosaveTimer = null;

/** Timer handle for debounced sidebar renders */
let renderDebounceTimer = null;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Returns the current time as an ISO 8601 string.
 * Used for createdAt/updatedAt timestamps.
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Generates a unique identifier for snippets.
 * Prefers crypto.randomUUID() for security, falls back to a combination
 * of Math.random() and timestamp for older browsers.
 * @returns {string} A unique identifier
 */
function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(16).slice(2) + 
         Math.random().toString(16).slice(2) + 
         Date.now().toString(16);
}

/**
 * Safely parses JSON with a fallback value.
 * Returns the fallback if parsing fails or result is null/undefined.
 * @param {string} value - The JSON string to parse
 * @param {*} fallback - Value to return if parsing fails
 * @returns {*} Parsed value or fallback
 */
function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return (parsed === null || parsed === undefined) ? fallback : parsed;
  } catch {
    return fallback;
  }
}

// =============================================================================
// Storage Functions (localStorage persistence)
// =============================================================================

/**
 * Loads all snippets from localStorage.
 * @returns {Array} Array of snippet objects, empty array if none exist
 */
function loadSnippets() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = safeJsonParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Saves snippets array to localStorage.
 * Warns if approaching storage limits, handles quota exceeded errors.
 * @param {Array} snippets - Array of snippet objects to save
 */
function saveSnippets(snippets) {
  try {
    const data = JSON.stringify(snippets);
    
    // Warn user if approaching localStorage limit
    if (data.length > STORAGE_WARNING_BYTES) {
      console.warn('Data size approaching localStorage limit');
      setStatus('Warning: Storage nearly full');
    }
    
    localStorage.setItem(STORAGE_KEY, data);
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      setStatus('Error: Storage quota exceeded');
      console.error('localStorage quota exceeded', e);
    } else {
      setStatus('Error: Failed to save');
      console.error('Failed to save snippets', e);
    }
  }
}

/**
 * Loads user settings from localStorage.
 * Returns defaults for any missing properties.
 * @returns {Object} Settings object with fontSize, fontFamily, lineNumbers
 */
function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  const parsed = safeJsonParse(raw, {});
  
  return {
    fontSize: parsed.fontSize ?? DEFAULT_FONT_SIZE,
    fontFamily: parsed.fontFamily ?? DEFAULT_FONT_FAMILY,
    lineNumbers: typeof parsed.lineNumbers === 'boolean' ? parsed.lineNumbers : DEFAULT_LINE_NUMBERS
  };
}

/**
 * Persists user settings to localStorage.
 * @param {Object} settings - Settings object to save
 */
function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

// =============================================================================
// UI Update Functions
// =============================================================================

/**
 * Applies font settings to the editor and updates line numbers visibility.
 * Also updates the toggle button visual state.
 * @param {Object} settings - Settings object with fontSize, fontFamily, lineNumbers
 */
function applyFontSettings(settings) {
  const { fontSize, fontFamily } = settings;
  
  // Apply font styles to editor
  if (els && els.content) {
    els.content.style.fontSize = fontSize + "px";
    els.content.style.fontFamily = fontFamily;
    els.content.style.lineHeight = '1.4';
    updateLineNumbers();
  }
  
  // Show/hide line numbers gutter
  if (lineNumbersEl) {
    lineNumbersEl.style.display = settings.lineNumbers ? '' : 'none';
    
    // Update toggle button visual state (brighter when active)
    const toggleLineNumbersBtn = document.getElementById("toggleLineNumbers");
    if (toggleLineNumbersBtn) {
      toggleLineNumbersBtn.classList.toggle('text-gray-300', settings.lineNumbers);
      toggleLineNumbersBtn.classList.toggle('text-gray-400', !settings.lineNumbers);
    }
  }
}

/**
 * Extracts the primary font name from a CSS font-family value.
 * @param {string} fontValue - CSS font-family value (e.g., "'Source Code Pro', monospace")
 * @returns {string} Primary font name without quotes
 */
function extractPrimaryFontName(fontValue) {
  if (!fontValue) return "";
  const first = fontValue.split(',')[0].trim();
  return first.replace(/^['"]|['"]$/g, "");
}

/**
 * Checks if a font is available in the browser.
 * Uses FontFaceSet API when available, falls back to width measurement.
 * @param {string} fontName - Name of the font to check
 * @returns {boolean} True if font is available
 */
function isFontAvailable(fontName) {
  if (!fontName) return false;
  
  // Prefer modern FontFaceSet API
  try {
    if (document.fonts && typeof document.fonts.check === 'function') {
      return document.fonts.check(`12px "${fontName.replace(/"/g, '')}"`);
    }
  } catch (e) {
    // Fall through to measurement method
  }

  // Fallback: compare rendered widths against generic monospace
  try {
    const span = document.createElement('span');
    span.style.position = 'absolute';
    span.style.left = '-9999px';
    span.style.visibility = 'hidden';
    span.style.fontSize = '72px';
    span.textContent = 'mmmmmmmmmmlllllll';

    // Measure baseline with monospace
    span.style.fontFamily = 'monospace';
    document.body.appendChild(span);
    const monoWidth = span.getBoundingClientRect().width;

    // Measure with target font (falls back to monospace if unavailable)
    span.style.fontFamily = `"${fontName.replace(/"/g, '')}", monospace`;
    const testWidth = span.getBoundingClientRect().width;
    document.body.removeChild(span);

    // If widths differ, the font rendered differently than fallback
    return Math.abs(testWidth - monoWidth) > 0.1;
  } catch (e) {
    return false;
  }
}

/**
 * Formats an ISO date string as a human-readable relative time.
 * Examples: "now", "5m ago", "2h ago", "3d ago", "Dec 15"
 * @param {string} iso - ISO 8601 date string
 * @returns {string} Formatted relative time or date
 */
function formatDate(iso) {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    // Show relative time for recent items
    if (diffMins < 1) return "now";
    if (diffMins < 60) return diffMins + "m ago";
    if (diffMins < 1440) return Math.floor(diffMins / 60) + "h ago";      // < 24 hours
    if (diffMins < 10080) return Math.floor(diffMins / 1440) + "d ago";   // < 7 days

    // Show date for older items
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

/**
 * Updates the status text in the footer.
 * @param {string} text - Status message to display
 */
function setStatus(text) {
  if (els && els.status) {
    els.status.textContent = text;
  }
}

/**
 * Temporarily sets a status message, then restores the previous one.
 * @param {string} text
 * @param {number} ms
 */
function flashStatus(text, ms = 1200, options = {}) {
  if (!els?.status) return;
  const previousText = els.status.textContent;
  const highlightClass = options?.highlightClass;
  const hadHighlight = highlightClass ? els.status.classList.contains(highlightClass) : false;

  setStatus(text);
  if (highlightClass && !hadHighlight) els.status.classList.add(highlightClass);

  window.setTimeout(() => {
    // Only restore if nothing else has updated the status since.
    if (els?.status?.textContent === text) {
      setStatus(previousText);
      if (highlightClass && !hadHighlight) els.status.classList.remove(highlightClass);
    }
  }, ms);
}

function flashCopyButton(ok) {
  if (!els?.copyBtn) return;

  const btn = els.copyBtn;
  const originalTitle = btn.getAttribute('title') || '';

  btn.classList.add('bg-[#2d2d2d]', 'text-gray-200');
  btn.setAttribute('title', ok ? 'Copied' : 'Copy failed');

  window.setTimeout(() => {
    btn.classList.remove('bg-[#2d2d2d]', 'text-gray-200');
    btn.setAttribute('title', originalTitle || 'Copy to clipboard');
  }, 900);
}

/**
 * Copies text to the clipboard.
 * Uses the async Clipboard API when available; falls back to execCommand.
 * @param {string} text
 * @returns {Promise<boolean>} whether the copy succeeded
 */
async function copyTextToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Updates the character count display in the footer.
 * Shows count with proper singular/plural form.
 */
function updateCharCount() {
  if (!els || !els.content || !els.charCount) return;
  
  const len = (els.content.value ?? "").length;
  const word = len === 1 ? "character" : "characters";
  els.charCount.textContent = len.toLocaleString() + " " + word;
}

/**
 * Updates the line numbers gutter to match the editor content.
 * Highlights the current line based on cursor position.
 * Syncs scroll position with the editor.
 */
function updateLineNumbers() {
  if (!lineNumbersEl || !els?.content) return;
  
  const settings = loadSettings();
  
  // Clear line numbers if disabled
  if (!settings.lineNumbers) {
    lineNumbersEl.innerHTML = '';
    return;
  }
  
  const value = els.content.value || "";
  const lines = value.split(/\r?\n/);
  
  // Match line numbers styling to editor
  const style = window.getComputedStyle(els.content);
  lineNumbersEl.style.lineHeight = style.lineHeight;
  lineNumbersEl.style.paddingTop = style.paddingTop;
  lineNumbersEl.style.fontSize = style.fontSize;
  
  // Determine which line the cursor is on
  let currentLine = 0;
  if (typeof els.content.selectionStart === 'number') {
    const textBeforeCursor = els.content.value.slice(0, els.content.selectionStart);
    currentLine = textBeforeCursor.split(/\r?\n/).length - 1;
  }
  
  // Build line numbers HTML with current line highlight
  const lineNumberHtml = lines.map((_, i) => {
    const cls = i === currentLine ? 'current-line' : '';
    return `<div class="${cls}" style="display:flex;align-items:center;justify-content:flex-end;height:1.4em;padding-right:2px;">${i + 1}</div>`;
  }).join('');
  
  lineNumbersEl.innerHTML = lineNumberHtml;
  
  // Keep line numbers scroll in sync with editor
  lineNumbersEl.scrollTop = els.content.scrollTop;
}

// =============================================================================
// Editor Functions
// =============================================================================

/**
 * Clears the editor and resets to empty state.
 * Used when no snippet is selected or after deleting the last snippet.
 */
function clearEditor() {
  activeId = null;
  
  if (els && els.content) {
    els.content.value = "";
    els.content.focus();
  }

  setStatus("Ready");
  updateCharCount();
  updateLineNumbers();
}

/**
 * Gets the current editor content.
 * @returns {Object} Object containing the content string
 */
function getEditorValue() {
  return {
    content: els?.content?.value ?? "",
  };
}

/**
 * Escapes HTML special characters to prevent XSS.
 * Must be used when inserting user content into innerHTML.
 * @param {string} s - String to escape
 * @returns {string} HTML-safe string
 */
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =============================================================================
// Sidebar / List Rendering
// =============================================================================

/**
 * Builds the HTML for a single snippet item in the sidebar.
 * @param {Object} snippet - Snippet object with id, content, updatedAt
 * @param {boolean} isActive - Whether this snippet is currently selected
 * @returns {string} HTML string for the list item
 */
function buildSnippetItemHtml(snippet, isActive) {
  const firstLine = (snippet.content ?? "").split(/\r?\n/)[0] || "Untitled";
  const timestamp = escapeHtml(formatDate(snippet.updatedAt));
  
  // Container classes change based on active state
  const containerClasses = isActive 
    ? "bg-[#37373d] border-l-2 border-[#007acc]" 
    : "hover:bg-[#2d2d2d] border-l-2 border-transparent";
  
  const titleClasses = isActive ? "text-white" : "text-gray-300";
  const dateClasses = isActive ? "text-gray-400" : "text-gray-500";
  
  // Trash icon SVG (Heroicons)
  const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 pointer-events-none">
    <path fill-rule="evenodd" d="M7.5 3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4h3.25a.75.75 0 0 1 0 1.5h-.305l-.548 9.32A2.75 2.75 0 0 1 12.156 17H7.844a2.75 2.75 0 0 1-2.741-2.18l-.548-9.32H4.25a.75.75 0 0 1 0-1.5H7.5V3Zm1 .5V4h3v-.5h-3ZM5.75 5.5l.54 9.18a1.25 1.25 0 0 0 1.246 1.07h4.312a1.25 1.25 0 0 0 1.246-1.07l.54-9.18H5.75Z" clip-rule="evenodd" />
  </svg>`;

  return `
    <div class="group relative flex items-stretch ${containerClasses}">
      <button type="button" data-action="open" 
        class="min-w-0 flex-1 px-3 py-3.5 text-left transition-colors flex flex-col justify-center gap-0.5">
        <div class="truncate text-[15px] leading-none font-medium ${titleClasses}">${escapeHtml(firstLine)}</div>
        <div class="text-[11px] leading-none ${dateClasses}">${timestamp}</div>
      </button>
      <div class="flex items-center ml-auto pr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
        style="position: absolute; right: 0; top: 0; height: 100%;">
        <button type="button" data-action="delete" 
          class="h-6 w-6 shrink-0 rounded text-[14px] leading-none text-gray-500 hover:text-gray-200 focus:text-gray-200 flex items-center justify-center" 
          aria-label="Delete snippet" title="Delete">
          ${trashIcon}
        </button>
      </div>
    </div>
  `;
}

/**
 * Renders the snippet list in the sidebar.
 * Filters by search query if present.
 * Updates the empty state visibility.
 */
function renderList() {
  if (!els || !els.list || !els.empty) return;

  const snippets = loadSnippets();
  
  // Filter by search query if present
  const query = (els.search?.value || "").toLowerCase().trim();
  const filtered = query 
    ? snippets.filter(s => (s.content || "").toLowerCase().includes(query))
    : snippets;

  // Show/hide empty state
  els.empty.style.display = filtered.length === 0 ? "flex" : "none";
  
  // Track rendered IDs for potential future optimization
  lastRenderIds = filtered.map(s => s.id);
  
  // Build and insert list items
  els.list.innerHTML = "";
  
  for (const snippet of filtered) {
    const li = document.createElement("li");
    const isActive = snippet.id === activeId;
    
    li.innerHTML = buildSnippetItemHtml(snippet, isActive);

    // Attach event listeners
    li.querySelector('[data-action="open"]')?.addEventListener("click", () => {
      loadIntoEditor(snippet.id);
    });

    li.querySelector('[data-action="delete"]')?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteSnippet(snippet.id);
    });

    els.list.appendChild(li);
  }
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
  
  if (els && els.content) {
    els.content.value = found.content ?? "";
    updateLineNumbers();
  }

  setStatus("Editing");
  updateCharCount();
  renderList();
}

/**
 * Deletes a snippet by ID.
 * If deleting the active snippet, loads the next available or clears editor.
 * @param {string} id - Snippet ID to delete
 */
function deleteSnippet(id) {
  const snippets = loadSnippets();
  const remaining = snippets.filter(s => s.id !== id);
  saveSnippets(remaining);

  // If we deleted the active snippet, select another or clear
  if (activeId === id) {
    if (remaining.length > 0) {
      loadIntoEditor(remaining[0].id);
    } else {
      renderList();
      clearEditor();
    }
    setStatus("Deleted");
    return;
  }

  renderList();
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
      activeId = uid();
      const ts = nowIso();
      const snippets = loadSnippets();
      snippets.unshift({ id: activeId, content, createdAt: ts, updatedAt: ts });
      saveSnippets(snippets);
      setStatus("Saved");
      renderList();
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
    
    saveSnippets(snippets);
    setStatus("Autosaved");
    renderList();
  }, AUTOSAVE_DELAY_MS);
}

/**
 * Debounces sidebar re-renders during rapid typing.
 * Prevents UI jank while still keeping sidebar updated.
 */
function debouncedRenderList() {
  if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
  
  renderDebounceTimer = setTimeout(() => {
    renderList();
  }, RENDER_DEBOUNCE_MS);
}

/**
 * Creates a new empty snippet and loads it into the editor.
 * The snippet is added to the top of the list.
 */
function createNewSnippet() {
  activeId = uid();
  const ts = nowIso();
  
  const snippets = loadSnippets();
  snippets.unshift({ id: activeId, content: "", createdAt: ts, updatedAt: ts });
  saveSnippets(snippets);
  
  loadIntoEditor(activeId);
  
  if (els && els.content) {
    els.content.focus();
  }
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
      for (const snippet of snippetsToImport) {
        if (!snippet.id || typeof snippet.content !== 'string') {
          setStatus('Error: Invalid snippet format');
          return;
        }
      }
      
      // Merge with existing snippets
      const existing = loadSnippets();
      const existingIds = new Set(existing.map(s => s.id));
      
      let imported_count = 0;
      let skipped_count = 0;
      
      for (const snippet of snippetsToImport) {
        if (existingIds.has(snippet.id)) {
          skipped_count++;
        } else {
          existing.push(snippet);
          imported_count++;
        }
      }
      
      saveSnippets(existing);
      
      // Import settings if provided
      if (settingsToImport && typeof settingsToImport === 'object') {
        saveSettings(settingsToImport);
        applyFontSettings(settingsToImport);
        updateLineNumbers();
        
        // Update font dropdown if available
        const fontFamilySelect = document.getElementById('fontFamily');
        if (fontFamilySelect && settingsToImport.fontFamily) {
          fontFamilySelect.value = settingsToImport.fontFamily;
        }
      }
      
      renderList();
      
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
// Initialization
// =============================================================================

/**
 * Initializes the font control buttons and dropdown.
 * Handles A+/A- buttons for font size and font family selector.
 * Validates saved settings against available options.
 */
function initializeFontControls() {
  const settings = loadSettings();
  const fontFamilySelect = document.getElementById('fontFamily');

  if (!fontFamilySelect) {
    applyFontSettings(settings);
    return;
  }

  // Try to set the dropdown to the saved setting
  fontFamilySelect.value = settings.fontFamily;

  // If saved value doesn't match any option (e.g., corrupted data), 
  // reset to the first available option
  if (fontFamilySelect.value !== settings.fontFamily) {
    const validDefault = fontFamilySelect.options[0].value;
    fontFamilySelect.value = validDefault;
    const newSettings = { ...settings, fontFamily: validDefault };
    saveSettings(newSettings);
    applyFontSettings(newSettings);
  } else {
    applyFontSettings(settings);
  }

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

  // Font family dropdown
  fontFamilySelect?.addEventListener('change', (e) => {
    const settings = loadSettings();
    const newSettings = { ...settings, fontFamily: e.target.value };
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
    copyBtn: document.getElementById("copyBtn"),
  };
  lineNumbersEl = document.getElementById("lineNumbers");

  // Set up line numbers toggle button
  const toggleLineNumbersBtn = document.getElementById("toggleLineNumbers");
  if (toggleLineNumbersBtn) {
    toggleLineNumbersBtn.addEventListener("click", () => {
      const settings = loadSettings();
      const newSettings = { ...settings, lineNumbers: !settings.lineNumbers };
      saveSettings(newSettings);
      applyFontSettings(newSettings);
      updateLineNumbers();
    });
    applyFontSettings(loadSettings());
  }

  // Set up copy-to-clipboard button
  if (els.copyBtn) {
    els.copyBtn.addEventListener('click', async () => {
      const text = els?.content?.value ?? '';
      if (!text.trim()) {
        flashStatus('Nothing to copy');
        flashCopyButton(false);
        return;
      }
      const ok = await copyTextToClipboard(text);
      flashStatus(ok ? 'Copied to clipboard' : 'Copy failed', 1200, { highlightClass: ok ? 'text-white' : undefined });
      flashCopyButton(ok);
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
    updateCharCount();
    updateLineNumbers();
    scheduleAutosave();
    debouncedRenderList();
  });
  
  // Sync line numbers scroll position with editor
  els.content.addEventListener("scroll", () => {
    if (lineNumbersEl) {
      lineNumbersEl.scrollTop = els.content.scrollTop;
    }
  });
  
  // Update current line highlight on cursor movement
  els.content.addEventListener("click", updateLineNumbers);
  els.content.addEventListener("keyup", updateLineNumbers);
  els.content.addEventListener("select", updateLineNumbers);
  
  // Apply initial settings
  applyFontSettings(loadSettings());
  updateLineNumbers();

  // --- Search Event Listeners ---
  
  els.search.addEventListener("input", () => {
    renderList();
  });

  // Close search when clicking outside
  document.addEventListener("click", (e) => {
    const searchWrapper = document.getElementById("searchWrapper");
    const isSearchOpen = searchWrapper && !searchWrapper.classList.contains("hidden");
    const clickedOutside = searchWrapper && !searchWrapper.contains(e.target);
    
    if (isSearchOpen && clickedOutside) {
      els.search.value = "";
      searchWrapper.classList.add("hidden");
      renderList();
    }
  });

  // --- Global Keyboard Shortcuts ---
  
  window.addEventListener("keydown", (e) => {
    // Escape: Close search and return focus to editor
    if (e.key === "Escape") {
      const searchWrapper = document.getElementById("searchWrapper");
      if (searchWrapper && !searchWrapper.classList.contains("hidden")) {
        els.search.value = "";
        searchWrapper.classList.add("hidden");
        renderList();
        els.content.focus();
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

    // Cmd/Ctrl+F: Open search
    if (isMod && e.key === "f") {
      e.preventDefault();
      document.getElementById("searchWrapper").classList.remove("hidden");
      els.search.focus();
      els.search.select();
    }
  });

  // --- Initial Data Load ---
  
  const initial = loadSnippets();
  if (initial.length > 0) {
    loadIntoEditor(initial[0].id);
  } else {
    renderList();
    clearEditor();
  }

  initializeFontControls();

  // --- Platform-specific UI ---
  
  // Show correct modifier key symbol based on OS
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKeySymbol = isMac ? '⌘' : 'Ctrl';
  
  document.getElementById('modKey').textContent = modKeySymbol;
  document.getElementById('modKeySearch').textContent = modKeySymbol;
  document.getElementById('modalModKey1').textContent = modKeySymbol;
  document.getElementById('modalModKey2').textContent = modKeySymbol;

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
