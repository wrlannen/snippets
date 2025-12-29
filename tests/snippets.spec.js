import { test, expect } from '@playwright/test';
import { fillEditor, getEditorValue } from './test-utils';

test.describe('Snippets App', () => {
  test.beforeEach(async ({ page }) => {
    // Reset to an explicit empty state (avoid first-run seeding)
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('snippets.v1', '[]');
    });
    await page.reload();
  });

  test('seeds welcome snippets on first run', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.locator('#list li')).toHaveCount(4);
    await expect(page.locator('#list')).toContainText('Welcome to Snippets');
    await expect(page.locator('#list')).toContainText('Keyboard shortcuts');
    await expect(page.locator('#list')).toContainText('Backup & sync');
    await expect(page.locator('#list')).toContainText('Install as an app');
  });

  test('loads app with empty state', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#empty')).toBeVisible();
    await expect(page.locator('text=Ready to code?')).toBeVisible();
    await expect(page.locator('text=Start typing your first snippet')).toBeVisible();
  });

  test('creates a new snippet with CMD+K', async ({ page }) => {
    await page.goto('/');

    // Press CMD+K to create new snippet
    await page.keyboard.press('Meta+k');

    // Type content
    await fillEditor(page, 'Test Snippet Title\nThis is the content');

    // Wait for autosave
    await page.waitForTimeout(1000);

    // Check sidebar shows the snippet
    await expect(page.locator('#list li')).toHaveCount(1);
    await expect(page.locator('#list li').first()).toContainText('Test Snippet Title');
  });

  test('edits existing snippet', async ({ page }) => {
    await page.goto('/');

    // Create snippet
    await page.keyboard.press('Meta+k');
    await fillEditor(page, 'Original Title\nOriginal content');
    await page.waitForTimeout(1000);

    // Edit the snippet
    await fillEditor(page, 'Updated Title\nUpdated content');
    await page.waitForTimeout(1000);

    // Check sidebar updated
    await expect(page.locator('#list li').first()).toContainText('Updated Title');
  });

  test('deletes snippet with confirmation', async ({ page }) => {
    await page.goto('/');

    // Create snippet
    await page.keyboard.press('Meta+k');
    await fillEditor(page, 'To Delete\nContent');
    await page.waitForTimeout(1000);

    // Click delete button (should delete immediately)
    // Hover first to show the delete button
    await page.locator('#list li').first().hover();
    await page.locator('[data-action="delete"]').click();

    // Check snippet is gone
    await expect(page.locator('#empty')).toBeVisible();
    await expect(page.locator('#list li')).toHaveCount(0);
  });


  test('searches snippets with CMD+F', async ({ page }) => {
    await page.goto('/');

    // Create multiple snippets
    await page.keyboard.press('Meta+k');
    await fillEditor(page, 'Apple\nFruit content');
    await page.waitForTimeout(1000);

    await page.keyboard.press('Meta+k');
    await fillEditor(page, 'Banana\nYellow fruit');
    await page.waitForTimeout(1000);

    await page.keyboard.press('Meta+k');
    await fillEditor(page, 'Carrot\nVegetable content');
    await page.waitForTimeout(1000);

    // Open search with CMD+F
    await page.keyboard.press('Meta+KeyF');
    await expect(page.locator('#search')).toBeVisible();

    // Search for "fruit"
    await page.locator('#search').fill('fruit');

    // Check only fruit snippets are shown
    await expect(page.locator('#list li')).toHaveCount(2);
    await expect(page.locator('#list')).toContainText('Apple');
    await expect(page.locator('#list')).toContainText('Banana');
    await expect(page.locator('#list')).not.toContainText('Carrot');
  });

  test('clears search with Escape', async ({ page }) => {
    await page.goto('/');

    // Type in search
    const searchInput = page.locator('#search');
    await searchInput.fill('test search');
    await expect(searchInput).toHaveValue('test search');

    // Clear with Escape
    await page.keyboard.press('Escape');
    await expect(searchInput).toHaveValue('');
  });

  test('switches between snippets', async ({ page }) => {
    await page.goto('/');

    // Create first snippet
    await page.keyboard.press('Meta+k');
    await fillEditor(page, 'First\nFirst content');
    await page.waitForTimeout(1000);

    // Create second snippet
    await page.keyboard.press('Meta+k');
    await fillEditor(page, 'Second\nSecond content');
    await page.waitForTimeout(1000);

    // Click first snippet
    await page.locator('#list li').filter({ hasText: 'First' }).click();

    // Check editor loaded first snippet
    const value = await getEditorValue(page);
    expect(value).toBe('First\nFirst content');
  });

  test('autosaves snippet', async ({ page }) => {
    await page.goto('/');

    // Create snippet
    await page.keyboard.press('Meta+k');
    await fillEditor(page, 'Autosave Test\nContent');

    // Wait for autosave
    await page.waitForTimeout(1000);
    await expect(page.locator('#status')).toContainText('Autosaved');

    // Reload page
    await page.reload();

    // Check snippet persisted
    await expect(page.locator('#list li')).toHaveCount(1);
    await expect(page.locator('#list li').first()).toContainText('Autosave Test');
  });

  test('shows character count', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Meta+k');
    await fillEditor(page, 'Test');

    await expect(page.locator('#charCount')).toContainText('4 characters');
  });

  test('displays first line as snippet title with content preview', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Meta+k');
    await fillEditor(page, 'My Title\nLine 2\nLine 3');
    await page.waitForTimeout(1000);

    // Sidebar should show title and content preview
    const listItem = page.locator('#list li').first();
    await expect(listItem).toContainText('My Title');
    await expect(listItem).toContainText('Line 2 Line 3'); // Content preview
  });

  test('shows "Untitled snippet" for empty snippets', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Meta+k');
    // Leave empty
    await page.waitForTimeout(1000);

    await expect(page.locator('#list li').first()).toContainText('Untitled snippet');
  });
});
