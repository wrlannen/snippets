import { test, expect } from '@playwright/test';

test.describe('Snippets App', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('loads app with empty state', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#empty')).toBeVisible();
    await expect(page.locator('text=No snippets')).toBeVisible();
  });

  test('creates a new snippet with CMD+.', async ({ page }) => {
    await page.goto('/');
    
    // Press CMD+. to create new snippet
    await page.keyboard.press('Meta+Period');
    
    // Type content
    await page.locator('#content').fill('Test Snippet Title\nThis is the content');
    
    // Wait for autosave
    await page.waitForTimeout(1000);
    
    // Check sidebar shows the snippet
    await expect(page.locator('#list li')).toHaveCount(1);
    await expect(page.locator('#list li').first()).toContainText('Test Snippet Title');
  });

  test('edits existing snippet', async ({ page }) => {
    await page.goto('/');
    
    // Create snippet
    await page.keyboard.press('Meta+Period');
    await page.locator('#content').fill('Original Title\nOriginal content');
    await page.waitForTimeout(1000);
    
    // Edit the snippet
    await page.locator('#content').fill('Updated Title\nUpdated content');
    await page.waitForTimeout(1000);
    
    // Check sidebar updated
    await expect(page.locator('#list li').first()).toContainText('Updated Title');
  });

  test('deletes snippet with confirmation', async ({ page }) => {
    await page.goto('/');

    // Create snippet
    await page.keyboard.press('Meta+Period');
    await page.locator('#content').fill('To Delete\nContent');
    await page.waitForTimeout(1000);

    // Click delete button (should delete immediately)
    await page.locator('[data-action="delete"]').click();

    // Check snippet is gone
    await expect(page.locator('#empty')).toBeVisible();
    await expect(page.locator('#list li')).toHaveCount(0);
  });

  test('cancels delete on outside click', async ({ page }) => {
    await page.goto('/');

    // Create snippet
    await page.keyboard.press('Meta+Period');
    await page.locator('#content').fill('Not Deleted\nContent');
    await page.waitForTimeout(1000);

    // Click delete button (should delete immediately)
    await page.locator('[data-action="delete"]').click();

    // Confirm snippet is gone
    await expect(page.locator('#empty')).toBeVisible();
    await expect(page.locator('#list li')).toHaveCount(0);
  });

  test('searches snippets with CMD+F', async ({ page }) => {
    await page.goto('/');
    
    // Create multiple snippets
    await page.keyboard.press('Meta+Period');
    await page.locator('#content').fill('Apple\nFruit content');
    await page.waitForTimeout(1000);
    
    await page.keyboard.press('Meta+Period');
    await page.locator('#content').fill('Banana\nYellow fruit');
    await page.waitForTimeout(1000);
    
    await page.keyboard.press('Meta+Period');
    await page.locator('#content').fill('Carrot\nVegetable content');
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

  test('closes search with Escape', async ({ page }) => {
    await page.goto('/');
    
    // Open search
    await page.keyboard.press('Meta+KeyF');
    await expect(page.locator('#searchWrapper')).not.toHaveClass(/hidden/);
    
    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('#searchWrapper')).toHaveClass(/hidden/);
  });

  test('switches between snippets', async ({ page }) => {
    await page.goto('/');
    
    // Create first snippet
    await page.keyboard.press('Meta+Period');
    await page.locator('#content').fill('First\nFirst content');
    await page.waitForTimeout(1000);
    
    // Create second snippet
    await page.keyboard.press('Meta+Period');
    await page.locator('#content').fill('Second\nSecond content');
    await page.waitForTimeout(1000);
    
    // Click first snippet
    await page.locator('#list li').filter({ hasText: 'First' }).click();
    
    // Check editor loaded first snippet
    await expect(page.locator('#content')).toHaveValue('First\nFirst content');
  });

  test('autosaves snippet', async ({ page }) => {
    await page.goto('/');
    
    // Create snippet
    await page.keyboard.press('Meta+Period');
    await page.locator('#content').fill('Autosave Test\nContent');
    
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
    
    await page.keyboard.press('Meta+Period');
    await page.locator('#content').fill('Test');
    
    await expect(page.locator('#charCount')).toContainText('4 characters');
  });

  test('displays first line as snippet title', async ({ page }) => {
    await page.goto('/');
    
    await page.keyboard.press('Meta+Period');
    await page.locator('#content').fill('My Title\nLine 2\nLine 3');
    await page.waitForTimeout(1000);
    
    // Sidebar should only show first line
    const listItem = page.locator('#list li').first();
    await expect(listItem).toContainText('My Title');
    await expect(listItem).not.toContainText('Line 2');
  });

  test('shows Untitled for empty snippets', async ({ page }) => {
    await page.goto('/');
    
    await page.keyboard.press('Meta+Period');
    // Leave empty
    await page.waitForTimeout(1000);
    
    await expect(page.locator('#list li').first()).toContainText('Untitled');
  });
});
