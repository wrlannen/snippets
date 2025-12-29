import { test, expect } from '@playwright/test';

test.describe('Settings & Fonts', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('snippets.v1', '[]');
        });
        await page.reload();
    });

    test('adjusts font size with A+/A- buttons', async ({ page }) => {
        const editor = page.locator('.CodeMirror');

        // Get initial font size
        const initialSize = await editor.evaluate((el) => parseInt(getComputedStyle(el).fontSize));

        // Click Increase (A+)
        await page.locator('#increaseFont').click();
        const increasedSize = await editor.evaluate((el) => parseInt(getComputedStyle(el).fontSize));
        expect(increasedSize).toBeGreaterThan(initialSize);

        // Click Decrease (A-) twice
        await page.locator('#decreaseFont').click();
        await page.locator('#decreaseFont').click();
        const decreasedSize = await editor.evaluate((el) => parseInt(getComputedStyle(el).fontSize));
        expect(decreasedSize).toBeLessThan(increasedSize);

        // Reload and verify persistence
        await page.reload();
        // Wait for editor to be ready
        await page.waitForSelector('.CodeMirror');
        const persistedSize = await editor.evaluate((el) => parseInt(getComputedStyle(el).fontSize));
        expect(persistedSize).toBe(decreasedSize);
    });
});
