import { test, expect } from '@playwright/test';

// This test checks that the mobile overlay appears and the app is hidden on small screens

test.describe('Mobile Overlay', () => {
  test('shows desktop-only overlay on small screens with mobile user agent', async ({ browser }) => {
    // Create a mobile context with iPhone user agent
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15A372 Safari/604.1',
      viewport: { width: 400, height: 800 }
    });
    const page = await context.newPage();
    await page.goto('/');

    const overlay = page.locator('#mobileOverlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('Desktop Only');
    await expect(overlay).toContainText('designed for desktop browsers');

    // The main app should be hidden
    const appMain = page.locator('.app-main');
    await expect(appMain).toBeHidden();
    
    await context.close();
  });

  test('does not show overlay on desktop screens', async ({ page }) => {
    // Set viewport to a typical desktop size
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/');

    // The overlay should not be visible
    const overlay = page.locator('#mobileOverlay');
    await expect(overlay).toBeHidden();

    // The main app should be visible
    const appMain = page.locator('.app-main');
    await expect(appMain).toBeVisible();
  });
});
