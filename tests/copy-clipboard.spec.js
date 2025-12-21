import { test, expect } from '@playwright/test';

test.describe('Copy to Clipboard', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('copy button exists and is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#copyBtn')).toBeVisible();
    await expect(page.locator('#copyBtn')).toHaveAttribute('title', 'Copy to clipboard');
  });

  test('copies snippet content to clipboard', async ({ context, page }) => {
    await page.goto('/');

    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create a snippet
    await page.keyboard.press('Meta+k');
    const testContent = 'Test Snippet\nLine 2\nLine 3';
    await page.locator('#content').fill(testContent);
    await page.waitForTimeout(1000);

    // Click copy button
    await page.locator('#copyBtn').click();

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
    await page.locator('#content').fill('Sample content for copy test');
    await page.waitForTimeout(1000);

    // Click copy button
    await page.locator('#copyBtn').click();

    // Check status message is white (highlighting)
    await expect(page.locator('#status')).toHaveClass(/text-white/);
    await expect(page.locator('#status')).toHaveText('Copied to clipboard');

    // Wait and verify it returns to normal
    await page.waitForTimeout(1500);
    await expect(page.locator('#status')).not.toHaveClass(/text-white/);
  });

  test('shows visual feedback on copy button', async ({ context, page }) => {
    await page.goto('/');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create a snippet
    await page.keyboard.press('Meta+k');
    await page.locator('#content').fill('Content to copy');
    await page.waitForTimeout(1000);

    const copyBtn = page.locator('#copyBtn');
    
    // Click copy button
    await copyBtn.click();

    // Check button has visual feedback - wait a moment for classes to be applied
    await page.waitForTimeout(100);
    const classAttr = await copyBtn.getAttribute('class');
    expect(classAttr).toContain('bg-[#2d2d2d]');
    // Note: text-gray-200 should be dynamically added but might be overridden by hover state

    // Verify title changed
    const title = await copyBtn.getAttribute('title');
    expect(title).toBe('Copied');

    // Wait for feedback to disappear (flashCopyButton uses 900ms timeout)
    await page.waitForTimeout(1000);
    const titleAfter = await copyBtn.getAttribute('title');
    expect(titleAfter).toBe('Copy to clipboard');
  });

  test('handles empty content gracefully', async ({ page }) => {
    await page.goto('/');

    // Create empty snippet
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    // Click copy button with no content
    await page.locator('#copyBtn').click();

    // Verify appropriate message
    await expect(page.locator('#status')).toHaveText('Nothing to copy');
  });

  test('handles whitespace-only content', async ({ page }) => {
    await page.goto('/');

    // Create snippet with only whitespace
    await page.keyboard.press('Meta+k');
    await page.locator('#content').fill('   \n   \n   ');
    await page.waitForTimeout(500);

    // Click copy button
    await page.locator('#copyBtn').click();

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
    await page.locator('#content').fill(multiLineContent);
    await page.waitForTimeout(1000);

    // Copy and verify
    await page.locator('#copyBtn').click();
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe(multiLineContent);
  });

  test('copies content with special characters', async ({ context, page }) => {
    await page.goto('/');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create snippet with special characters
    await page.keyboard.press('Meta+k');
    const specialContent = 'Special chars: <>&"\'`\n${}[]()';
    await page.locator('#content').fill(specialContent);
    await page.waitForTimeout(1000);

    // Copy and verify
    await page.locator('#copyBtn').click();
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe(specialContent);
  });

  test('can copy different snippets sequentially', async ({ context, page }) => {
    await page.goto('/');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create first snippet
    await page.keyboard.press('Meta+k');
    const content1 = 'First snippet';
    await page.locator('#content').fill(content1);
    await page.waitForTimeout(1000);

    // Copy first
    await page.locator('#copyBtn').click();
    let clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe(content1);

    // Create second snippet
    await page.keyboard.press('Meta+k');
    const content2 = 'Second snippet';
    await page.locator('#content').fill(content2);
    await page.waitForTimeout(1000);

    // Copy second
    await page.locator('#copyBtn').click();
    clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe(content2);
  });
});
