/**
 * PWA Install Module
 * 
 * Handles Progressive Web App installation prompts and UI:
 * - Captures beforeinstallprompt event for Chrome/Edge
 * - Shows install button when native install is available
 * - Displays Safari-specific "Add to Dock" instructions
 * - Manages install button state and user feedback
 * 
 */

/** @type {BeforeInstallPromptEvent|null} Deferred install prompt event */
let deferredPwaPrompt = null;

/**
 * Initializes PWA install prompt handling.
 * Sets up event listeners and UI for app installation.
 */
export function initPwaInstall() {
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

  setupPwaInstallUI();
}

/**
 * Sets up PWA install UI for different browser types.
 * Shows native install button for Chromium or Safari instructions for macOS.
 * @private
 */
function setupPwaInstallUI() {
  const installSection = document.getElementById('installSection');
  const pwaInstallable = document.getElementById('pwaInstallable');
  const pwaSafari = document.getElementById('pwaSafari');
  const installBtn = document.getElementById('installPwaBtn');

  if (!installSection || !pwaInstallable || !pwaSafari) return;

  // Check for Safari (which doesn't fire beforeinstallprompt)
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

  // If Safari, show instructions immediately (unless beforeinstallprompt fired already)
  if (isSafari && !deferredPwaPrompt) {
    installSection.classList.remove('hidden');
    pwaSafari.classList.remove('hidden');
    pwaInstallable.classList.add('hidden');
  }

  // Button handler for Chrome/Edge
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
