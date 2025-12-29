/**
 * Sidebar Resize Module
 * 
 * Handles drag-to-resize functionality for the sidebar:
 * - Detects mouse position near sidebar edge
 * - Changes cursor to indicate resize affordance
 * - Handles drag events to resize sidebar
 * - Persists width to settings
 * - Enforces min/max width constraints
 * 
 */

import { loadSettings, saveSettings } from './storage.js';

/**
 * Applies sidebar width to the sidebar element.
 * @param {number} width - Width in pixels
 * @param {Object} constraints - Min/max width constraints
 */
function applySidebarWidth(width, constraints) {
  const { MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH } = constraints;
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
export function initializeSidebarResize(constraints) {
  const { MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH } = constraints;
  const sidebar = document.querySelector('aside');

  if (!sidebar) return;

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  let isNearEdge = false;

  // Apply saved width on initialization
  const settings = loadSettings();
  applySidebarWidth(settings.sidebarWidth, constraints);

  // Check if mouse is near the right edge of sidebar for resize cursor
  function isNearSidebarEdge(e) {
    const rect = sidebar.getBoundingClientRect();
    const mouseX = e.clientX;
    const edgeThreshold = 8; // 8px detection zone on either side of edge

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

    applySidebarWidth(newWidth, constraints);
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
