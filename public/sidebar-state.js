// Restore sidebar visibility state early to avoid flash of incorrect layout
(function restoreSidebarState() {
  try {
    const sidebarVisible = localStorage.getItem('snippets.sidebar.visible');
    if (sidebarVisible === 'false') {
      document.documentElement.classList.add('sidebar-hidden');
    }
  } catch (_err) {
    // localStorage unavailable (private mode or blocked); ignore gracefully
  }
})();
