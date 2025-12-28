import { test, expect } from '@playwright/test';
import { fillEditor } from './test-utils';

test.describe('Copy to Clipboard', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('copy shortcut works', async ({ context, page }) => {
    await page.goto('/');

    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create a snippet
    await page.keyboard.press('Meta+k');
    const testContent = 'Test Snippet\nLine 2\nLine 3';
    await fillEditor(page, testContent);
    await page.waitForTimeout(1000);

    // Use copy shortcut (Cmd+Shift+C)
    await page.keyboard.press('Meta+Shift+c');

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
    await fillEditor(page, 'Sample content for copy test');
    await page.waitForTimeout(1000);

    // Use copy shortcut
    await page.keyboard.press('Meta+Shift+c');

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
    await page.waitForTimeout(500);

    // Use copy shortcut with no content
    await page.keyboard.press('Meta+Shift+c');

    // Verify appropriate message
    await expect(page.locator('#status')).toHaveText('Nothing to copy');
  });

  test('handles whitespace-only content', async ({ page }) => {
    await page.goto('/');

    // Create snippet with only whitespace
    await page.keyboard.press('Meta+k');
    await fillEditor(page, '   \n   \n   ');
    await page.waitForTimeout(500);

    // Use copy shortcut
    await page.keyboard.press('Meta+Shift+c');

    // Should treat whitespace-only as empty
    await expect(page.locator('#status')).toHaveText('Nothing to copy');
  });

  test('copies multi-line content correctly', async ({ context, page }) => {
    await page.goto('/');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create multi-line snippet with special characters
    await page.keyboard.press('Meta+k');
    const multiLineContent = `function test() {
  console.log("Hello");
  return 42;
}`;
    await fillEditor(page, multiLineContent);
    await page.waitForTimeout(1000);

    // Use copy shortcut
    await page.keyboard.press('Meta+Shift+c');
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe(multiLineContent);
  });

  test('copies content with special characters', async ({ context, page }) => {
    await page.goto('/');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create snippet with special characters
    await page.keyboard.press('Meta+k');
    const specialContent = 'Special chars: <>&"\'`\n${}[]()';
    await fillEditor(page, specialContent);
    await page.waitForTimeout(1000);

    // Use copy shortcut
    await page.keyboard.press('Meta+Shift+c');
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe(specialContent);
  });

  test('can copy different snippets sequentially', async ({ context, page }) => {
    await page.goto('/');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create first snippet
    await page.keyboard.press('Meta+k');
    const content1 = 'First snippet';
    await fillEditor(page, content1);
    await page.waitForTimeout(1000);

    // Copy first
    await page.keyboard.press('Meta+Shift+c');
    let clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe(content1);

    // Create second snippet
    await page.keyboard.press('Meta+k');
    const content2 = 'Second snippet';
    await fillEditor(page, content2);
    await page.waitForTimeout(1000);

    // Copy second
    await page.keyboard.press('Meta+Shift+c');
    clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe(content2);
  });
});
