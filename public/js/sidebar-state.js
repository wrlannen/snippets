/**
 * Sidebar State
 *
 * Early-loading script that restores sidebar visibility state.
 * Runs before DOM ready to prevent layout flash on page load.
 * This file is loaded inline in the HTML head for maximum speed.
 *
 * Note: Uses localStorage for synchronous access before IndexedDB initializes.
 *
 */

(function restoreSidebarState() {
  try {
    const sidebarVisible = localStorage.getItem('snippets.sidebar.visible');
    if (sidebarVisible === 'false') {
      document.documentElement.classList.add('sidebar-hidden');
    }
  } catch (_err) {
    // localStorage unavailable (private mode or blocked); sidebar defaults to visible
  }
})();
