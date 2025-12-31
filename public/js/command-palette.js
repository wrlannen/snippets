/**
 * Command Palette Module
 * 
 * Provides a VS Code/Notion-style command palette for discovering and executing commands.
 * Features:
 * - Fuzzy search filtering
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Command registration and execution
 * - Platform-aware keyboard shortcuts display
 */

import { escapeHtml } from './utils.js';

// =============================================================================
// State
// =============================================================================

let commands = [];
let isOpen = false;
let selectedIndex = 0;
let filteredCommands = [];

// =============================================================================
// UI Elements
// =============================================================================

let paletteEl;
let inputEl;
let listEl;

/**
 * Initialize the command palette with DOM references
 */
export function initCommandPalette() {
  paletteEl = document.getElementById('commandPalette');
  inputEl = document.getElementById('commandPaletteInput');
  listEl = document.getElementById('commandPaletteList');

  if (!paletteEl || !inputEl || !listEl) {
    console.error('Command palette elements not found');
    return;
  }

  // Input event for filtering
  inputEl.addEventListener('input', handleInput);

  // Keyboard navigation
  inputEl.addEventListener('keydown', handleKeydown);

  // Click outside to close
  paletteEl.addEventListener('click', (e) => {
    if (e.target === paletteEl) {
      closePalette();
    }
  });

  // Click on command to execute
  listEl.addEventListener('click', (e) => {
    const commandEl = e.target.closest('[data-command-id]');
    if (commandEl) {
      const commandId = commandEl.dataset.commandId;
      executeCommand(commandId);
    }
  });
}

// =============================================================================
// Command Registration
// =============================================================================

/**
 * Register commands that will appear in the palette
 * @param {Array<{id: string, label: string, description?: string, keywords?: string[], action: Function, shortcut?: string}>} commandList
 */
export function registerCommands(commandList) {
  commands = commandList;
}

// =============================================================================
// Palette Control
// =============================================================================

/**
 * Open the command palette
 */
export function openPalette() {
  if (isOpen) return;
  
  isOpen = true;
  selectedIndex = 0;
  inputEl.value = '';
  filteredCommands = [...commands];
  
  paletteEl.classList.remove('hidden');
  renderCommands();
  
  // Focus input after a brief delay to ensure rendering
  setTimeout(() => inputEl.focus(), 50);
}

/**
 * Close the command palette
 */
export function closePalette() {
  if (!isOpen) return;
  
  isOpen = false;
  paletteEl.classList.add('hidden');
  inputEl.value = '';
  selectedIndex = 0;
}

/**
 * Toggle palette open/closed
 */
export function togglePalette() {
  if (isOpen) {
    closePalette();
  } else {
    openPalette();
  }
}

/**
 * Check if palette is currently open
 */
export function isPaletteOpen() {
  return isOpen;
}

// =============================================================================
// Filtering & Search
// =============================================================================

/**
 * Simple fuzzy search implementation
 * @param {string} query - Search query
 * @param {string} text - Text to search in
 * @returns {boolean} - Whether the query matches
 */
function fuzzyMatch(query, text) {
  const normalizedQuery = query.toLowerCase();
  const normalizedText = text.toLowerCase();
  
  let queryIndex = 0;
  
  for (let i = 0; i < normalizedText.length && queryIndex < normalizedQuery.length; i++) {
    if (normalizedText[i] === normalizedQuery[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === normalizedQuery.length;
}

/**
 * Filter commands based on input
 */
const MIN_SEARCH_CHARS = 1;

function scoreCommand(query, cmd) {
  const haystack = `${cmd.label} ${cmd.description || ''} ${(cmd.keywords || []).join(' ')}`.toLowerCase();
  const q = query.toLowerCase();
  const idx = haystack.indexOf(q);
  if (idx !== -1) {
    // Prefer earlier exact substrings and shorter text
    return idx * 10 + haystack.length;
  }
  if (fuzzyMatch(q, haystack)) {
    // Fuzzy matches rank below direct substring hits
    return 10000 + haystack.length;
  }
  return null;
}

function handleInput() {
  const query = inputEl.value.trim();
  
  if (query.length < MIN_SEARCH_CHARS) {
    filteredCommands = [...commands];
  } else {
    const scored = [];
    for (const cmd of commands) {
      const score = scoreCommand(query, cmd);
      if (score !== null) scored.push({ cmd, score });
    }
    scored.sort((a, b) => a.score - b.score);
    filteredCommands = scored.map(s => s.cmd);
  }
  
  selectedIndex = 0;
  renderCommands();
}

// =============================================================================
// Keyboard Navigation
// =============================================================================

/**
 * Handle keyboard navigation in the palette
 */
function handleKeydown(e) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
      renderCommands();
      scrollToSelected();
      break;
      
    case 'ArrowUp':
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      renderCommands();
      scrollToSelected();
      break;
      
    case 'Enter':
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex].id);
      }
      break;
      
    case 'Escape':
      e.preventDefault();
      closePalette();
      break;
  }
}

/**
 * Scroll the selected command into view
 */
function scrollToSelected() {
  const selectedEl = listEl.querySelector('[data-selected="true"]');
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// =============================================================================
// Rendering
// =============================================================================

/**
 * Render the filtered commands list
 */
function renderCommands() {
  if (filteredCommands.length === 0) {
    listEl.innerHTML = `
      <div class="px-4 py-8 text-center text-gray-500 text-sm">
        No commands found
      </div>
    `;
    return;
  }
  
  const html = filteredCommands.map((cmd, index) => {
    const isSelected = index === selectedIndex;
    const shortcutHtml = cmd.shortcut 
      ? `<span class="text-[12px] text-gray-400 font-mono">${escapeHtml(cmd.shortcut)}</span>`
      : '';
    
    return `
      <div 
        data-command-id="${escapeHtml(cmd.id)}"
        data-selected="${isSelected}"
        class="px-3 py-3.5 cursor-pointer transition-colors ${
          isSelected 
            ? 'bg-[#252525] text-gray-100 shadow-[inset_0_0_0_1px_#3a3a3a]' 
            : 'hover:bg-[#1f1f1f] text-gray-400 hover:text-gray-300'
        }">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="font-medium text-[16px]">${escapeHtml(cmd.label)}</div>
            ${cmd.description ? `<div class="text-[13.5px] mt-0.5 ${isSelected ? 'text-gray-400' : 'text-gray-600'}">${escapeHtml(cmd.description)}</div>` : ''}
          </div>
          ${shortcutHtml ? `<div class="ml-4 flex-shrink-0">${shortcutHtml}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  listEl.innerHTML = html;
}

// =============================================================================
// Command Execution
// =============================================================================

/**
 * Execute a command by its ID
 * @param {string} commandId - The command ID to execute
 */
function executeCommand(commandId) {
  const command = commands.find(cmd => cmd.id === commandId);

  if (command && typeof command.action === 'function') {
    // Close the palette first, then execute the command
    closePalette();

    // Execute the action synchronously
    command.action();
  }
}
