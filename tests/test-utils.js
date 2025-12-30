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
 * Resets localStorage to a clean state
 * @param {import('@playwright/test').Page} page
 */
export async function resetStorage(page) {
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('snippets.v1', '[]');
    });
    await page.reload();
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
