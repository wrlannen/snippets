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
