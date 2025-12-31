/**
 * Helper definitions for Playwright tests interacting with CodeMirror.
 */

/**
 * Sets the content of the CodeMirror editor.
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
export async function fillEditor(page, text) {
    // Wait for the CodeMirror instance to be available
    await page.waitForSelector('.CodeMirror');

    await page.evaluate((content) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror;
        if (cm) {
            cm.setValue(content);
            // Trigger change event to ensure app logic handles it
            CodeMirror.signal(cm, 'change', cm);
        } else {
            throw new Error('CodeMirror instance not found on .CodeMirror element');
        }
    }, text);
}

/**
 * Gets the current content from the CodeMirror editor.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
export async function getEditorValue(page) {
    return await page.evaluate(() => {
        const cm = document.querySelector('.CodeMirror')?.CodeMirror;
        return cm ? cm.getValue() : '';
    });
}

/**
 * Clears all storage (localStorage and IndexedDB) without navigation
 * @param {import('@playwright/test').Page} page
 */
export async function clearAllStorage(page) {
    // Close any open IndexedDB connections first
    await page.evaluate(() => {
        if (window.storageDB) {
            try {
                window.storageDB.close();
                window.storageDB = null;
            } catch (e) {
                // Ignore errors
            }
        }
        // Disable welcome seed for tests
        window.__DISABLE_WELCOME_SEED__ = true;
    });

    // Small delay to ensure connection is fully closed
    await page.waitForTimeout(100);

    await page.evaluate(async () => {
        // Clear localStorage
        localStorage.clear();

        // Ensure welcome seed flag persists
        window.__DISABLE_WELCOME_SEED__ = true;

        // Delete IndexedDB with robust handling
        const deleteDatabase = () => new Promise((resolve) => {
            const deleteReq = indexedDB.deleteDatabase('snippets-db');
            let resolved = false;

            const finish = (success) => {
                if (!resolved) {
                    resolved = true;
                    resolve(success);
                }
            };

            deleteReq.onsuccess = () => finish(true);
            deleteReq.onerror = () => finish(false);
            deleteReq.onblocked = () => {
                setTimeout(() => finish(false), 1500);
            };

            // Safety timeout
            setTimeout(() => finish(false), 3000);
        });

        // Try to delete with retry
        let success = await deleteDatabase();
        if (!success) {
            // Wait and retry
            await new Promise(r => setTimeout(r, 1000));
            await deleteDatabase();
        }
    });

    // Wait for deletion to complete
    await page.waitForTimeout(800);
}

/**
 * Resets storage (localStorage and IndexedDB) to a clean state
 * @param {import('@playwright/test').Page} page
 */
export async function resetStorage(page) {
    // Set flag before any page loads
    await page.addInitScript(() => {
        window.__DISABLE_WELCOME_SEED__ = true;
    });
    await page.goto('http://localhost:3000');
    await clearAllStorage(page);
    await page.reload();
    // Wait for storage to initialize and app to be ready
    await page.waitForTimeout(1000);
}

/**
 * Waits for the snippets app to load
 * @param {import('@playwright/test').Page} page
 */
export async function waitForSnippetsToLoad(page) {
    // Just wait for CodeMirror to be ready, list might be empty/hidden
    await page.waitForSelector('.CodeMirror');
}

/**
 * Creates a new snippet with the given content
 * @param {import('@playwright/test').Page} page
 * @param {string} content
 */
export async function createSnippet(page, content) {
    // Press ⌘+K or Ctrl+K to open command palette
    const isMac = process.platform === 'darwin';
    if (isMac) {
        await page.keyboard.press('Meta+k');
    } else {
        await page.keyboard.press('Control+k');
    }
    
    // Type "new" to filter to New Snippet command
    await page.locator('#commandPaletteInput').fill('new');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    await fillEditor(page, content);
    // Wait for autosave to complete
    await page.waitForTimeout(1000);
}
