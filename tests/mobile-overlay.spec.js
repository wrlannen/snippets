import { test, expect } from '@playwright/test';

// This test checks that the mobile overlay appears and the app is hidden on small screens

test.describe('Mobile Overlay', () => {
  test('shows desktop-only overlay on small screens', async ({ page }) => {
    // Set viewport to a small mobile size before navigation
    await page.setViewportSize({ width: 400, height: 800 });
    await page.goto('/');

    const overlay = page.locator('#mobileOverlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('Desktop Only');
    await expect(overlay).toContainText('designed for desktop browsers');

    // The main app should be hidden
    const appMain = page.locator('.app-main');
    await expect(appMain).toBeHidden();
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
