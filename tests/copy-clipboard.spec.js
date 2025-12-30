import { test, expect } from '@playwright/test';
import { fillEditor } from './test-utils';

test.describe('Copy to Clipboard', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('snippets.v1', '[]');
    });
    await page.reload();
  });

  test('copy shortcut works', async ({ context, page }) => {
    await page.goto('/');

    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create a snippet
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('new');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    const testContent = 'Test Snippet\nLine 2\nLine 3';
    await fillEditor(page, testContent);
    await page.waitForTimeout(1000);

    // Use copy command via palette
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('copy');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Verify status message appears
    await expect(page.locator('#status')).toHaveText('Copied to clipboard');

    // Verify clipboard content
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe(testContent);
  });

  test('shows "Copied to clipboard" status message with white text', async ({ context, page }) => {
    await page.goto('/');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create a snippet
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('new');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    await fillEditor(page, 'Sample content for copy test');
    await page.waitForTimeout(1000);

    // Use copy command
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('copy');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Check status message is white (highlighting)
    await expect(page.locator('#status')).toHaveClass(/text-white/);
    await expect(page.locator('#status')).toHaveText('Copied to clipboard');

    // Wait and verify it returns to normal
    await page.waitForTimeout(1500);
    await expect(page.locator('#status')).not.toHaveClass(/text-white/);
  });

  test('handles empty content gracefully', async ({ page }) => {
    await page.goto('/');

    // Create empty snippet
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('new');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Use copy command with no content
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('copy');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Verify appropriate message
    await expect(page.locator('#status')).toHaveText('Nothing to copy');
  });

  test('handles whitespace-only content', async ({ page }) => {
    await page.goto('/');

    // Create snippet with only whitespace
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('new');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    await fillEditor(page, '   \n   \n   ');
    await page.waitForTimeout(500);

    // Use copy command
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('copy');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Should treat whitespace-only as empty
    await expect(page.locator('#status')).toHaveText('Nothing to copy');
  });

  test('copies multi-line content correctly', async ({ context, page }) => {
    await page.goto('/');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create multi-line snippet with special characters
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('new');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    const multiLineContent = `function test() {
  console.log("Hello");
  return 42;
}`;
    await fillEditor(page, multiLineContent);
    await page.waitForTimeout(1000);

    // Use copy command
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('copy');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe(multiLineContent);
  });

  test('copies content with special characters', async ({ context, page }) => {
    await page.goto('/');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create snippet with special characters
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('new');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    const specialContent = 'Special chars: <>&"\'`\n${}[]()';
    await fillEditor(page, specialContent);
    await page.waitForTimeout(1000);

    // Use copy command
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('copy');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe(specialContent);
  });

  test('can copy different snippets sequentially', async ({ context, page }) => {
    await page.goto('/');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create first snippet
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('new');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    const content1 = 'First snippet';
    await fillEditor(page, content1);
    await page.waitForTimeout(1000);

    // Copy first
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('copy');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    let clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe(content1);

    // Create second snippet
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('new');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    const content2 = 'Second snippet';
    await fillEditor(page, content2);
    await page.waitForTimeout(1000);

    // Copy second
    await page.keyboard.press('Meta+k');
    await page.locator('#commandPaletteInput').fill('copy');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe(content2);
  });
});
