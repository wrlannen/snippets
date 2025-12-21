const STORAGE_KEY = "snippets.v1";
const SETTINGS_KEY = "snippets.settings.v1";

const DEFAULT_FONT_SIZE = 15;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_FAMILY = "'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace";

let els;
let activeId = null;
let lastRenderIds = [];
let pendingDeleteId = null;
let autosaveTimer = null;
let renderDebounceTimer = null;

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    if (parsed === null || parsed === undefined) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function loadSnippets() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = safeJsonParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

function saveSnippets(snippets) {
  try {
    const data = JSON.stringify(snippets);
    if (data.length > 5 * 1024 * 1024) {
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

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  const parsed = safeJsonParse(raw, {});
  return {
    fontSize: parsed.fontSize ?? DEFAULT_FONT_SIZE,
    fontFamily: parsed.fontFamily ?? DEFAULT_FONT_FAMILY
  };
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

function applyFontSettings(settings) {
  const { fontSize, fontFamily } = settings;
  if (els && els.content) {
    els.content.style.fontSize = fontSize + "px";
    els.content.style.fontFamily = fontFamily;
    els.content.style.lineHeight = '1.6';
  }
  
  const overlay = document.getElementById('firstLineOverlay');
  if (overlay) {
    overlay.style.fontSize = fontSize + "px";
    overlay.style.fontFamily = fontFamily;
    overlay.style.lineHeight = '1.6';
  }
}

function extractPrimaryFontName(fontValue) {
  if (!fontValue) return "";
  const first = fontValue.split(',')[0].trim();
  return first.replace(/^['"]|['"]$/g, "");
}

function isFontAvailable(fontName) {
  if (!fontName) return false;
  try {
    // Prefer FontFaceSet.check when available
    if (document.fonts && typeof document.fonts.check === 'function') {
      return document.fonts.check(`12px "${fontName.replace(/"/g, '')}"`);
    }
  } catch (e) {
    // fall through to measurement method
  }

  // Fallback measurement: compare widths against a generic monospace
  try {
    const span = document.createElement('span');
    span.style.position = 'absolute';
    span.style.left = '-9999px';
    span.style.visibility = 'hidden';
    span.style.fontSize = '72px';
    span.textContent = 'mmmmmmmmmmlllllll';

    // baseline with monospace
    span.style.fontFamily = 'monospace';
    document.body.appendChild(span);
    const monoWidth = span.getBoundingClientRect().width;

    // test with target font first, then fallback to monospace
    span.style.fontFamily = `"${fontName.replace(/"/g, '')}", monospace`;
    const testWidth = span.getBoundingClientRect().width;
    document.body.removeChild(span);

    return Math.abs(testWidth - monoWidth) > 0.1;
  } catch (e) {
    return false;
  }
}

function formatDate(iso) {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "now";
    if (diffMins < 60) return diffMins + "m ago";
    if (diffMins < 1440) return Math.floor(diffMins / 60) + "h ago";
    if (diffMins < 10080) return Math.floor(diffMins / 1440) + "d ago";
    
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function setStatus(text) {
  if (els && els.status) {
    els.status.textContent = text;
  }
}

function updateCharCount() {
  if (!els || !els.content || !els.charCount) return;
  const len = (els.content.value ?? "").length;
  const word = len === 1 ? "character" : "characters";
  els.charCount.textContent = len.toLocaleString() + " " + word;
}

function updateFirstLineOverlay() {
  const overlay = document.getElementById('firstLineOverlay');
  if (!overlay || !els || !els.content) return;
  
  const content = els.content.value || '';
  const firstLine = content.split(/\r?\n/)[0] || '';
  
  if (firstLine) {
    overlay.textContent = firstLine;
    overlay.style.display = 'block';
  } else {
    overlay.style.display = 'none';
  }
}

function clearEditor() {
  activeId = null;
  if (els && els.content) {
    els.content.value = "";
    els.content.focus();
  }
  updateFirstLineOverlay();
  setStatus("Ready");
  updateCharCount();
}

function getEditorValue() {
  return {
    content: els?.content?.value ?? "",
  };
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderList() {
  if (!els || !els.list || !els.empty) return;
  
  const snippets = loadSnippets();
  
  const query = (els.search?.value || "").toLowerCase().trim();
  const filtered = query ? snippets.filter(s => {
    const content = (s.content || "").toLowerCase();
    return content.includes(query);
  }) : snippets;
  
  els.empty.style.display = filtered.length === 0 ? "flex" : "none";
  els.list.innerHTML = "";
  lastRenderIds = filtered.map((s) => s.id);
  
  for (const s of filtered) {
    const li = document.createElement("li");
    const isActive = s.id === activeId;
    const firstLine = (s.content ?? "").split(/\r?\n/)[0];
    li.innerHTML = '<div class="group relative flex items-stretch ' + (isActive ? "bg-[#37373d] border-l-2 border-[#007acc]" : "hover:bg-[#2d2d2d] border-l-2 border-transparent") + '">' +
        '<button type="button" data-action="open" class="min-w-0 flex-1 px-3 py-2 text-left transition-colors">' +
          '<div class="truncate text-xs font-bold ' + (isActive ? "text-gray-200" : "text-gray-400") + '">' + escapeHtml(firstLine || "Untitled") + '</div>' +
          '<div class="mt-0.5 text-[10px] ' + (isActive ? "text-gray-500" : "text-gray-600") + '">' + escapeHtml(formatDate(s.updatedAt)) + '</div>' +
        '</button>' +
        '<div class="flex items-center ml-auto pr-2" style="position: absolute; right: 0; top: 0; height: 100%;">' +
          '<button type="button" data-action="delete" class="h-6 w-6 shrink-0 rounded text-[14px] leading-none text-gray-700 hover:text-gray-400 focus:text-gray-400 flex items-center justify-center" aria-label="Delete snippet" title="Delete">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 pointer-events-none"><path fill-rule="evenodd" d="M7.5 3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4h3.25a.75.75 0 0 1 0 1.5h-.305l-.548 9.32A2.75 2.75 0 0 1 12.156 17H7.844a2.75 2.75 0 0 1-2.741-2.18l-.548-9.32H4.25a.75.75 0 0 1 0-1.5H7.5V3Zm1 .5V4h3v-.5h-3ZM5.75 5.5l.54 9.18a1.25 1.25 0 0 0 1.246 1.07h4.312a1.25 1.25 0 0 0 1.246-1.07l.54-9.18H5.75Z" clip-rule="evenodd" /></svg>' +
          '</button>' +
        '</div>' +
      '</div>';

    li.querySelector('[data-action="open"]')?.addEventListener("click", () => {
      loadIntoEditor(s.id);
    });

    li.querySelector('[data-action="delete"]')?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteSnippet(s.id);
    });
    
    els.list.appendChild(li);
  }
}

function loadIntoEditor(id) {
  const snippets = loadSnippets();
  const found = snippets.find((s) => s.id === id);
  if (!found) return;

  activeId = found.id;
  if (els && els.content) {
    els.content.value = found.content ?? "";
  }
  updateFirstLineOverlay();
  setStatus("Editing");
  updateCharCount();
  renderList();
}

function deleteSnippet(id) {
  const snippets = loadSnippets();
  const next = snippets.filter((s) => s.id !== id);
  saveSnippets(next);

  if (activeId === id) {
    if (next.length > 0) {
      loadIntoEditor(next[0].id);
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

function scheduleAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    const { content } = getEditorValue();
    if (!content.trim()) return;

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

    const snippets = loadSnippets();
    const idx = snippets.findIndex((s) => s.id === activeId);
    if (idx === -1) return;

    snippets[idx] = {
      ...snippets[idx],
      content,
      updatedAt: nowIso(),
    };
    saveSnippets(snippets);
    setStatus("Autosaved");
    renderList();
  }, 800);
}

function debouncedRenderList() {
  if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
  renderDebounceTimer = setTimeout(() => {
    renderList();
  }, 150);
}

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

function initializeFontControls() {
  const settings = loadSettings();
  applyFontSettings(settings);

  const fontFamilySelect = document.getElementById('fontFamily');
  if (!fontFamilySelect) return;

  // Build list of available options by checking primary font name
  const options = Array.from(fontFamilySelect.querySelectorAll('option'));
  const available = [];
  for (const opt of options) {
    const primary = extractPrimaryFontName(opt.value);
    if (isFontAvailable(primary)) {
      available.push(opt);
    }
  }

  // If no available fonts detected, keep all options (fallback case)
  if (available.length > 0) {
    // remove all, then re-add only available options
    fontFamilySelect.innerHTML = '';
    for (const opt of available) fontFamilySelect.appendChild(opt);
  }

  // Ensure the select reflects saved settings or pick first available
  const effectiveValue = (Array.from(fontFamilySelect.options).some(o => o.value === settings.fontFamily))
    ? settings.fontFamily
    : fontFamilySelect.options[0]?.value ?? settings.fontFamily;

  fontFamilySelect.value = effectiveValue;
  if (effectiveValue !== settings.fontFamily) {
    saveSettings({ ...settings, fontFamily: effectiveValue });
    applyFontSettings({ ...settings, fontFamily: effectiveValue });
  }

  document.getElementById('increaseFont')?.addEventListener('click', () => {
    const settings = loadSettings();
    const newSize = Math.min(MAX_FONT_SIZE, settings.fontSize + 1);
    const newSettings = { ...settings, fontSize: newSize };
    saveSettings(newSettings);
    applyFontSettings(newSettings);
  });

  document.getElementById('decreaseFont')?.addEventListener('click', () => {
    const settings = loadSettings();
    const newSize = Math.max(MIN_FONT_SIZE, settings.fontSize - 1);
    const newSettings = { ...settings, fontSize: newSize };
    saveSettings(newSettings);
    applyFontSettings(newSettings);
  });

  fontFamilySelect?.addEventListener('change', (e) => {
    const settings = loadSettings();
    const newSettings = { ...settings, fontFamily: e.target.value };
    saveSettings(newSettings);
    applyFontSettings(newSettings);
  });
}

function initializeApp() {
  els = {
    search: document.getElementById("search"),
    content: document.getElementById("content"),
    list: document.getElementById("list"),
    empty: document.getElementById("empty"),
    status: document.getElementById("status"),
    charCount: document.getElementById("charCount"),
  };

  if (!els.list || !els.content || !els.empty) {
    console.error("Critical DOM elements not found");
    return;
  }

  els.content.addEventListener("input", () => {
    updateCharCount();
    updateFirstLineOverlay();
    scheduleAutosave();
    debouncedRenderList();
  });

  els.search.addEventListener("input", () => {
    renderList();
  });

  document.addEventListener("click", (e) => {
    const searchWrapper = document.getElementById("searchWrapper");
    if (searchWrapper && !searchWrapper.classList.contains("hidden") && !searchWrapper.contains(e.target)) {
      els.search.value = "";
      searchWrapper.classList.add("hidden");
      renderList();
    }
  });

  window.addEventListener("keydown", (e) => {
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
    
    if (e.metaKey && e.key === ".") {
      e.preventDefault();
      createNewSnippet();
      return;
    }
    
    if (e.metaKey && e.key === "f") {
      e.preventDefault();
      document.getElementById("searchWrapper").classList.remove("hidden");
      els.search.focus();
      els.search.select();
    }
  });

  const initial = loadSnippets();
  if (initial.length > 0) {
    loadIntoEditor(initial[0].id);
  } else {
    renderList();
    clearEditor();
  }
  
  initializeFontControls();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
