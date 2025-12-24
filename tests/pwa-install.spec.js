import { test, expect } from '@playwright/test';

test.describe('PWA Install UI', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('Install section is hidden by default if no event or non-Safari', async ({ page }) => {
        await page.locator('#aboutBtn').click();
        await expect(page.locator('#installSection')).toBeHidden();
    });

    test('Shows Safari instructions on macOS Safari', async ({ page }) => {
        // Override user agent to simulate Safari on macOS
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'userAgent', {
                get: () => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
            });
            // Ensure it's not detected as a standalone PWA
            Object.defineProperty(navigator, 'standalone', {
                get: () => false,
            });
        });

        await page.reload();
        await page.locator('#aboutBtn').click();

        // Check that the install section and Safari instructions are visible
        await expect(page.locator('#installSection')).toBeVisible();
        await expect(page.locator('#pwaSafari')).toBeVisible();
        await expect(page.locator('text=Install on macOS')).toBeVisible();
        await expect(page.locator('text=Add to Dock...')).toBeVisible();
        
        // Chrome button should be hidden
        await expect(page.locator('#pwaInstallable')).toBeHidden();
    });

    test('Shows Install button when beforeinstallprompt fires', async ({ page }) => {
        // Simulate beforeinstallprompt event
        await page.evaluate(() => {
            const event = new Event('beforeinstallprompt');
            window.dispatchEvent(event);
        });

        await page.locator('#aboutBtn').click();

        // Check that the install section and Chrome button are visible
        await expect(page.locator('#installSection')).toBeVisible();
        await expect(page.locator('#pwaInstallable')).toBeVisible();
        await expect(page.locator('text=Install on Chrome')).toBeVisible();
        
        // Safari instructions should be hidden
        await expect(page.locator('#pwaSafari')).toBeHidden();
    });
});
