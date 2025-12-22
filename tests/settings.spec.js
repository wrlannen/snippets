import { test, expect } from '@playwright/test';

test.describe('Settings & Fonts', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    test('changes font family and persists settings', async ({ page }) => {
        // Default check
        await expect(page.locator('#fontFamily')).toHaveValue("'Source Code Pro', monospace");
        const initialFont = await page.locator('#content').evaluate((el) => getComputedStyle(el).fontFamily);
        expect(initialFont).toContain('Source Code Pro');

        // Change to Roboto Mono
        await page.locator('#fontFamily').selectOption("'Roboto Mono', monospace");

        // Verify immediate change
        const newFont = await page.locator('#content').evaluate((el) => getComputedStyle(el).fontFamily);
        expect(newFont).toContain('Roboto Mono');

        // Reload and verify persistence
        await page.reload();
        await expect(page.locator('#fontFamily')).toHaveValue("'Roboto Mono', monospace");
        const persistedFont = await page.locator('#content').evaluate((el) => getComputedStyle(el).fontFamily);
        expect(persistedFont).toContain('Roboto Mono');
    });

    test('adjusts font size with A+/A- buttons', async ({ page }) => {
        const editor = page.locator('#content');

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
        const persistedSize = await editor.evaluate((el) => parseInt(getComputedStyle(el).fontSize));
        expect(persistedSize).toBe(decreasedSize);
    });
});
