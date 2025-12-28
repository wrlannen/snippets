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

  test('CMD+B hides the sidebar', async ({ page, browserName }) => {
    const sidebar = page.locator('#sidebar');
    const isMac = browserName === 'webkit' || process.platform === 'darwin';
    
    // Sidebar should be visible initially
    await expect(sidebar).toBeVisible();

    // Press CMD+B (or Ctrl+B on non-Mac)
    if (isMac) {
      await page.keyboard.press('Meta+KeyB');
    } else {
      await page.keyboard.press('Control+KeyB');
    }

    // Sidebar should be hidden
    await expect(sidebar).toBeHidden();
  });

  test('CMD+B toggles sidebar on and off', async ({ page, browserName }) => {
    const sidebar = page.locator('#sidebar');
    const isMac = browserName === 'webkit' || process.platform === 'darwin';
    const shortcut = isMac ? 'Meta+KeyB' : 'Control+KeyB';
    
    // Initially visible
    await expect(sidebar).toBeVisible();

    // Hide
    await page.keyboard.press(shortcut);
    await expect(sidebar).toBeHidden();

    // Show again
    await page.keyboard.press(shortcut);
    await expect(sidebar).toBeVisible();

    // Hide again
    await page.keyboard.press(shortcut);
    await expect(sidebar).toBeHidden();
  });

  test('sidebar visibility persists across page reloads', async ({ page, browserName }) => {
    const sidebar = page.locator('#sidebar');
    const isMac = browserName === 'webkit' || process.platform === 'darwin';
    const shortcut = isMac ? 'Meta+KeyB' : 'Control+KeyB';
    
    // Hide sidebar
    await page.keyboard.press(shortcut);
    await expect(sidebar).toBeHidden();

    // Reload page
    await page.reload();
    await waitForSnippetsToLoad(page);

    // Sidebar should still be hidden
    await expect(sidebar).toBeHidden();

    // Show sidebar
    await page.keyboard.press(shortcut);
    await expect(sidebar).toBeVisible();

    // Reload again
    await page.reload();
    await waitForSnippetsToLoad(page);

    // Sidebar should now be visible
    await expect(sidebar).toBeVisible();
  });

  test('can create and edit snippets with sidebar hidden', async ({ page, browserName }) => {
    const sidebar = page.locator('#sidebar');
    const isMac = browserName === 'webkit' || process.platform === 'darwin';
    const shortcut = isMac ? 'Meta+KeyB' : 'Control+KeyB';
    
    // Hide sidebar
    await page.keyboard.press(shortcut);
    await expect(sidebar).toBeHidden();

    // Create a new snippet
    await createSnippet(page, '// Test snippet\nconsole.log("hello");');

    // Content should be in the editor even with sidebar hidden
    const cmContent = page.locator('.CodeMirror-code');
    await expect(cmContent).toContainText('Test snippet');

    // Show sidebar to verify snippet was created
    await page.keyboard.press(shortcut);
    await expect(sidebar).toBeVisible();

    // Snippet should appear in list
    const snippetItem = page.locator('#list li');
    await expect(snippetItem).toHaveCount(1);
    await expect(snippetItem.first()).toContainText('Test snippet');
  });

  test('keyboard shortcut indicator shows correct modifier key', async ({ page, browserName }) => {
    const isMac = browserName === 'webkit' || process.platform === 'darwin';
    const expectedKey = isMac ? '⌘' : 'Ctrl';
    
    // Check footer shortcut display
    const sidebarKey = page.locator('#modKeySidebar');
    await expect(sidebarKey).toHaveText(expectedKey);

    // Check modal shortcut display
    await page.click('#aboutBtn');
    const modalKey = page.locator('#modalModKey4');
    await expect(modalKey).toHaveText(expectedKey);
  });

  test('sidebar toggle works with existing snippets', async ({ page, browserName }) => {
    const isMac = browserName === 'webkit' || process.platform === 'darwin';
    const shortcut = isMac ? 'Meta+KeyB' : 'Control+KeyB';
    
    // Create a snippet
    await createSnippet(page, '// First snippet\ntest');
    
    const sidebar = page.locator('#sidebar');
    const snippetItem = page.locator('#list li').first();
    
    // Verify snippet is visible
    await expect(snippetItem).toBeVisible();
    await expect(snippetItem).toContainText('First snippet');

    // Hide sidebar
    await page.keyboard.press(shortcut);
    await expect(sidebar).toBeHidden();

    // Show sidebar
    await page.keyboard.press(shortcut);
    await expect(sidebar).toBeVisible();

    // Snippet should still be there
    await expect(snippetItem).toBeVisible();
    await expect(snippetItem).toContainText('First snippet');
  });
});
