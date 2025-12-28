import { escapeHtml, formatDate } from './utils.js';

let lastRenderIds = [];
let delegatedListEl = null;
let delegatedHandlers = { onOpen: null, onDelete: null };

function ensureDelegatedListHandlers(listEl) {
  if (!listEl || delegatedListEl === listEl) return;

  delegatedListEl = listEl;

  listEl.addEventListener('click', (e) => {
    const actionBtn = e.target?.closest?.('button[data-action]');
    if (!actionBtn) return;
    if (!delegatedListEl.contains(actionBtn)) return;

    const li = actionBtn.closest('li[data-id]');
    const id = li?.dataset?.id;
    if (!id) return;

    const action = actionBtn.dataset.action;
    if (action === 'delete') {
      e.preventDefault();
      e.stopPropagation();
      delegatedHandlers.onDelete?.(id);
      return;
    }

    if (action === 'open') {
      delegatedHandlers.onOpen?.(id);
    }
  });
}

export function buildSnippetItemHtml(snippet, isActive) {
  const content = snippet.content ?? "";

  let firstLine = content.split(/\r?\n/)[0] ?? "";
  let title = "Untitled snippet";

  const commentPatterns = [
    /^\/\/\s*(.+)/,
    /^#\s*(.+)/,
    /^--\s*(.+)/,
    /^\/\*\s*(.+?)\s*\*\//,
    /^<!--\s*(.+?)\s*-->/
  ];

  for (const pattern of commentPatterns) {
    const match = firstLine.match(pattern);
    if (match) {
      title = match[1].trim();
      break;
    }
  }

  if (title === "Untitled snippet" && firstLine.trim()) {
    title = firstLine.trim();
  }

  const lines = content.split(/\r?\n/).filter(line => line.trim());
  let preview = "";
  if (lines.length > 1) {
    const previewLines = lines.slice(1, 3);
    preview = previewLines.join(" ").trim();
    if (preview.length > 60) {
      preview = preview.substring(0, 57) + "...";
    }
  }

  const timestamp = escapeHtml(formatDate(snippet.updatedAt));

  const containerClasses = isActive
    ? "bg-[#252526] border-l-[3px] border-[#007acc] shadow-sm"
    : "hover:bg-[#2d2d2d] border-l-[3px] border-transparent hover:border-[#404040]";

  const titleClasses = isActive ? "text-white font-semibold" : "text-gray-200 font-medium";
  const previewClasses = isActive ? "text-gray-400" : "text-gray-500";
  const dateClasses = isActive ? "text-gray-500" : "text-gray-600";

  const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 pointer-events-none">
    <path fill-rule="evenodd" d="M7.5 3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4h3.25a.75.75 0 0 1 0 1.5h-.305l-.548 9.32A2.75 2.75 0 0 1 12.156 17H7.844a2.75 2.75 0 0 1-2.741-2.18l-.548-9.32H4.25a.75.75 0 0 1 0-1.5H7.5V3Zm1 .5V4h3v-.5h-3ZM5.75 5.5l.54 9.18a1.25 1.25 0 0 0 1.246 1.07h4.312a1.25 1.25 0 0 0 1.246-1.07l.54-9.18H5.75Z" clip-rule="evenodd" />
  </svg>`;

  return `
    <div class="group relative ${containerClasses} transition-all duration-200 rounded-r-md mx-1 my-0.5">
      <button type="button" data-action="open" 
        class="w-full pl-3 pr-10 py-3 text-left transition-colors flex flex-col">
        <div class="truncate text-sm leading-tight ${titleClasses} mb-1">${escapeHtml(title)}</div>
        ${preview ? `<div class="truncate text-xs leading-tight ${previewClasses} mb-1 font-mono">${escapeHtml(preview)}</div>` : ''}
        <div class="text-xs leading-tight ${dateClasses}">${timestamp}</div>
      </button>
      <div class="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100">
        <button type="button" data-action="delete" 
          class="h-6 w-6 rounded hover:bg-[#404040] text-gray-500 hover:text-gray-200 flex items-center justify-center transition-colors" 
          aria-label="Delete snippet" title="Delete">
          ${trashIcon}
        </button>
      </div>
    </div>
  `;
}

export function renderList({ els, snippets, query, activeId, onOpen, onDelete }) {
  if (!els?.list || !els?.empty) return;

  ensureDelegatedListHandlers(els.list);
  delegatedHandlers.onOpen = onOpen;
  delegatedHandlers.onDelete = onDelete;

  const normalizedQuery = (query || "").toLowerCase().trim();
  const filtered = normalizedQuery
    ? snippets.filter(s => (s.content || "").toLowerCase().includes(normalizedQuery))
    : snippets;

  const showEmpty = filtered.length === 0;
  els.empty.style.display = showEmpty ? "flex" : "none";

  if (showEmpty) {
    const titleEl = els.empty.querySelector('h3');
    const descEl = els.empty.querySelector('p');

    const searching = Boolean(normalizedQuery);
    const hasSnippets = snippets.length > 0;

    if (searching && hasSnippets) {
      if (titleEl) titleEl.textContent = "No matches";
      if (descEl) descEl.textContent = "Try a different search or clear the filter.";
    } else {
      if (titleEl) titleEl.textContent = "Ready to code?";
      if (descEl) descEl.textContent = "Start typing your first snippet. Everything saves automatically and works offline.";
    }
  }

  lastRenderIds = filtered.map(s => s.id);
  els.list.innerHTML = filtered
    .map((snippet) => {
      const isActive = snippet.id === activeId;
      return `<li data-id="${escapeHtml(snippet.id)}">${buildSnippetItemHtml(snippet, isActive)}</li>`;
    })
    .join("");
}

export function getLastRenderIds() {
  return lastRenderIds;
}
