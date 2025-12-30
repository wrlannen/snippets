import { test, expect } from '@playwright/test';
import { resetStorage, waitForSnippetsToLoad, createSnippet } from './test-utils.js';

test.describe('Sidebar Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await resetStorage(page);
    await page.goto('http://localhost:3000');
    await waitForSnippetsToLoad(page);
  });

  test('sidebar is visible by default', async ({ page }) => {
    const sidebar = page.locator('#sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('⌘/ hides the sidebar', async ({ page, browserName }) => {
    const sidebar = page.locator('#sidebar');
    const isMac = browserName === 'webkit' || process.platform === 'darwin';
    
    // Sidebar should be visible initially
    await expect(sidebar).toBeVisible();

    // Press ⌘/ (or Ctrl+/ on non-Mac)
    if (isMac) {
      await page.keyboard.press('Meta+Slash');
    } else {
      await page.keyboard.press('Control+Slash');
    }

    // Check if sidebar is hidden via CSS class on html element
    const html = page.locator('html');
    await expect(html).toHaveClass(/sidebar-hidden/);
  });

  test('⌘/ toggles sidebar on and off', async ({ page, browserName }) => {
    const html = page.locator('html');
    const isMac = browserName === 'webkit' || process.platform === 'darwin';
    const shortcut = isMac ? 'Meta+Slash' : 'Control+Slash';
    
    // Initially not hidden
    await expect(html).not.toHaveClass(/sidebar-hidden/);

    // Hide
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(300);
    await expect(html).toHaveClass(/sidebar-hidden/);

    // Show again
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(300);
    await expect(html).not.toHaveClass(/sidebar-hidden/);

    // Hide again
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(300);
    await expect(html).toHaveClass(/sidebar-hidden/);
  });

  test('sidebar visibility persists across page reloads', async ({ page, browserName }) => {
    const html = page.locator('html');
    const isMac = browserName === 'webkit' || process.platform === 'darwin';
    const shortcut = isMac ? 'Meta+Slash' : 'Control+Slash';
    
    // Hide sidebar
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(300);
    await expect(html).toHaveClass(/sidebar-hidden/);

    // Reload page
    await page.reload();
    await waitForSnippetsToLoad(page);

    // Sidebar should still be hidden
    await expect(html).toHaveClass(/sidebar-hidden/);

    // Show sidebar
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(300);
    await expect(html).not.toHaveClass(/sidebar-hidden/);

    // Reload again
    await page.reload();
    await waitForSnippetsToLoad(page);

    // Sidebar should now be visible
    await expect(html).not.toHaveClass(/sidebar-hidden/);
  });

  test('can create and edit snippets with sidebar hidden', async ({ page, browserName }) => {
    const html = page.locator('html');
    const isMac = browserName === 'webkit' || process.platform === 'darwin';
    const shortcut = isMac ? 'Meta+Slash' : 'Control+Slash';
    
    // Hide sidebar
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(300);
    await expect(html).toHaveClass(/sidebar-hidden/);

    // Create a new snippet
    await createSnippet(page, '// Test snippet\nconsole.log("hello");');

    // Content should be in the editor even with sidebar hidden
    const cmContent = page.locator('.CodeMirror-code');
    await expect(cmContent).toContainText('Test snippet');

    // Show sidebar to verify snippet was created
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(300);
    await expect(html).not.toHaveClass(/sidebar-hidden/);

    // Snippet should appear in list
    const snippetItem = page.locator('#list li');
    await expect(snippetItem).toHaveCount(1);
    await expect(snippetItem.first()).toContainText('Test snippet');
  });

  test('keyboard shortcut indicator shows correct modifier key', async ({ page, browserName }) => {
    const isMac = browserName === 'webkit' || process.platform === 'darwin';
    const expectedKey = isMac ? '⌘' : 'Ctrl';
    
    // Check footer shortcut display (now just two elements)
    const modKey = page.locator('#modKey');
    await expect(modKey).toHaveText(expectedKey);

    // Check modal shortcut display
    await page.click('#aboutBtn');
    const modalKey = page.locator('#modalModKey1');
    await expect(modalKey).toHaveText(expectedKey);
  });

  test('sidebar toggle works with existing snippets', async ({ page, browserName }) => {
    const isMac = browserName === 'webkit' || process.platform === 'darwin';
    const shortcut = isMac ? 'Meta+Slash' : 'Control+Slash';
    
    // Create a snippet
    await createSnippet(page, '// First snippet\ntest');
    
    const html = page.locator('html');
    const snippetItem = page.locator('#list li').first();
    
    // Verify snippet is visible
    await expect(snippetItem).toBeVisible();
    await expect(snippetItem).toContainText('First snippet');

    // Hide sidebar
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(300);
    await expect(html).toHaveClass(/sidebar-hidden/);

    // Show sidebar
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(300);
    await expect(html).not.toHaveClass(/sidebar-hidden/);

    // Snippet should still be there
    await expect(snippetItem).toBeVisible();
    await expect(snippetItem).toContainText('First snippet');
  });
});
